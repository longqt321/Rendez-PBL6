import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"

/**
 * Kịch bản benchmark & stress test tổng hợp cho Rendez API.
 *
 * Cách chạy lại:
 *   k6 run backend/scripts/k6-benchmark-suite.js
 *   k6 run -e BASE_URL=http://127.0.0.1:8000 -e PROFILE=extreme backend/scripts/k6-benchmark-suite.js
 */

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000"
const PROFILE = __ENV.PROFILE || "benchmark"

const PROFILES = {
  smoke: [
    { duration: "10s", target: 50 },
    { duration: "10s", target: 50 },
    { duration: "5s", target: 0 },
  ],
  benchmark: [
    { duration: "10s", target: 100 },
    { duration: "15s", target: 500 },
    { duration: "15s", target: 1000 },
    { duration: "15s", target: 2000 },
    { duration: "10s", target: 0 },
  ],
  extreme: [
    { duration: "20s", target: 500 },
    { duration: "20s", target: 1000 },
    { duration: "20s", target: 2000 },
    { duration: "20s", target: 3000 },
    { duration: "30s", target: 5000 },
    { duration: "15s", target: 0 },
  ],
}

export const options = {
  stages: PROFILES[PROFILE] || PROFILES.benchmark,
  thresholds: {
    // Mục tiêu đo điểm suy hao, chỉ cảnh báo nếu tỉ lệ lỗi vượt ngưỡng quá cao
    user_error_rate: ["rate<0.05"],
  },
}

const overallLatency = new Trend("rendez_req_duration_ms", true)
const searchLatency = new Trend("rendez_search_ms", true)
const feedLatency = new Trend("rendez_feed_ms", true)
const mapLatency = new Trend("rendez_map_ms", true)
const detailLatency = new Trend("rendez_detail_ms", true)
const eventsLatency = new Trend("rendez_events_batch_ms", true)
const telemetryLatency = new Trend("rendez_telemetry_ms", true)

const errorRate = new Rate("user_error_rate")
const degradedRate = new Rate("user_degraded_rate") // > 1000ms
const rateLimitedRate = new Rate("user_rate_limited_rate") // 429

const SEARCH_QUERIES = [
  "cafe",
  "banh mi",
  "hai san",
  "tra sua",
  "bun cha ca",
  "cà phê yên tĩnh",
  "quán nhậu",
  "pizza",
  "chay",
]

const MAP_BBOXES = [
  "16.050,108.200,16.080,108.230",
  "16.030,108.210,16.060,108.240",
  "16.060,108.220,16.090,108.250",
]

const PLACE_IDS = [
  "wonderlust-coffee-and-souvenir-96-tran-phu-hai-chau",
  "ge-cafe-66-do-quang-vinh-trung-thanh-khe",
  "bun-dau-mam-tom-36-36-ngo-van-so-hoa-khanh-lien-chieu",
  "com-nha-kieu-thi-68-70-duong-2-thang-9-hai-chau",
  "banh-mi-ong-ty-trung-nu-vuong-189-trung-nu-vuong-hai-chau",
]

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function fakeUuid(vu, iter, idx) {
  const a = ((vu * 2654435761) >>> 0).toString(16).padStart(8, "0")
  const b = ((iter * 40503 + idx) & 0xffff).toString(16).padStart(4, "0")
  const c = ((idx + 1) & 0x0fff).toString(16).padStart(3, "0")
  return `${a}-${b}-4${c}-8000-000000000001`
}

export default function () {
  const vuId = __VU
  const iter = __ITER
  const ip1 = (vuId >> 8) & 255
  const ip2 = vuId & 255
  const clientIp = `113.160.${ip1}.${ip2}`

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Forwarded-For": clientIp,
    "X-Request-Id": `k6-${vuId}-${iter}`,
  }

  const r = Math.random()
  let res
  let bucketTrend = overallLatency
  let expectedStatuses = [200]

  if (r < 0.3) {
    const q = randomItem(SEARCH_QUERIES)
    res = http.get(`${BASE_URL}/api/v1/places?q=${encodeURIComponent(q)}&limit=10`, { headers })
    bucketTrend = searchLatency
  } else if (r < 0.5) {
    const path = Math.random() < 0.5 ? "/api/v1/places/suggestions" : "/api/v1/places/daily-picks"
    res = http.get(`${BASE_URL}${path}`, { headers })
    bucketTrend = feedLatency
  } else if (r < 0.7) {
    const bbox = randomItem(MAP_BBOXES)
    res = http.get(`${BASE_URL}/api/v1/places/map?bbox=${bbox}`, { headers })
    bucketTrend = mapLatency
  } else if (r < 0.85) {
    const id = randomItem(PLACE_IDS)
    res = http.get(`${BASE_URL}/api/v1/places/${id}`, { headers })
    bucketTrend = detailLatency
  } else if (r < 0.95) {
    const batch = [
      {
        eventId: fakeUuid(vuId, iter, 1),
        eventType: "place_impression",
        placeId: randomItem(PLACE_IDS),
        anonId: `k6-anon-${vuId}`,
        sessionId: `k6-sess-${vuId}`,
      },
      {
        eventId: fakeUuid(vuId, iter, 2),
        eventType: "place_click",
        placeId: randomItem(PLACE_IDS),
        anonId: `k6-anon-${vuId}`,
        sessionId: `k6-sess-${vuId}`,
      },
    ]
    res = http.post(`${BASE_URL}/api/v1/events`, JSON.stringify({ events: batch }), { headers })
    bucketTrend = eventsLatency
    expectedStatuses = [202]
  } else {
    const items = [
      {
        kind: "web-vital",
        name: "LCP",
        value: 1200 + Math.round(Math.random() * 900),
        rating: "good",
        route: "/discover",
      },
    ]
    res = http.post(`${BASE_URL}/api/v1/telemetry`, JSON.stringify({ items }), { headers })
    bucketTrend = telemetryLatency
    expectedStatuses = [202]
  }

  overallLatency.add(res.timings.duration)
  bucketTrend.add(res.timings.duration)
  degradedRate.add(res.timings.duration > 1000)
  rateLimitedRate.add(res.status === 429)

  const ok = check(res, {
    "expected status": (resp) => expectedStatuses.includes(resp.status),
  })
  errorRate.add(ok ? 0 : 1)

  sleep(0.3 + Math.random() * 0.7)
}

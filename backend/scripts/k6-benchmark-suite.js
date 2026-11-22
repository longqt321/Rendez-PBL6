import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"

/**
 * Kịch bản benchmark & stress test tổng hợp cho Rendez API.
 *
 * Profiles:
 *   - smoke:            50 VUs (25s)
 *   - benchmark:        100 → 500 → 1000 → 2000 → 3000 → 4000 → 5000 → 6000 → 8000 VUs (đa kịch bản, RPS cao)
 *   - high_vu_low_rps:  1000 → 3000 → 5000 → 8000 → 10000 → 15000 → 20000 → 25000 → 30000 → 35000 VUs (RPS thấp, giữ nhiều kết nối đồng thời để tìm ngưỡng VUs)
 *   - extreme:          500 → 1000 → 2000 → 3000 → 5000 VUs
 *
 * Cách chạy lại:
 *   k6 run backend/scripts/k6-benchmark-suite.js
 *   k6 run -e PROFILE=high_vu_low_rps backend/scripts/k6-benchmark-suite.js
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
    { duration: "12s", target: 500 },
    { duration: "12s", target: 1000 },
    { duration: "15s", target: 2000 },
    { duration: "15s", target: 3000 },
    { duration: "15s", target: 4000 },
    { duration: "15s", target: 5000 },
    { duration: "15s", target: 6000 },
    { duration: "15s", target: 8000 },
    { duration: "10s", target: 0 },
  ],
  high_vu_low_rps: [
    { duration: "10s", target: 1000 },
    { duration: "12s", target: 3000 },
    { duration: "12s", target: 5000 },
    { duration: "15s", target: 8000 },
    { duration: "15s", target: 10000 },
    { duration: "15s", target: 15000 },
    { duration: "15s", target: 20000 },
    { duration: "15s", target: 25000 },
    { duration: "15s", target: 30000 },
    { duration: "15s", target: 35000 },
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
    user_error_rate: ["rate<0.05"],
  },
}

const overallLatency = new Trend("rendez_req_duration_ms", true)
const searchLatency = new Trend("rendez_search_ms", true)
const feedLatency = new Trend("rendez_feed_ms", true)
const mapLatency = new Trend("rendez_map_ms", true)
const detailLatency = new Trend("rendez_detail_ms", true)
const socialLatency = new Trend("rendez_social_ms", true)
const recLatency = new Trend("rendez_recommended_ms", true)
const ogLatency = new Trend("rendez_og_ms", true)
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
  "bún đậu",
]

const FILTER_PARAMS = [
  "category=cafe&sort=rating&limit=9",
  "district=hai-chau&limit=9",
  "category=food&priceLevel=2&limit=9",
  "sort=newest&limit=9",
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

  if (r < 0.22) {
    // Tìm kiếm hybrid + lọc thuộc tính
    const url =
      Math.random() < 0.65
        ? `${BASE_URL}/api/v1/places?q=${encodeURIComponent(randomItem(SEARCH_QUERIES))}&limit=10`
        : `${BASE_URL}/api/v1/places?${randomItem(FILTER_PARAMS)}`
    res = http.get(url, { headers })
    bucketTrend = searchLatency
  } else if (r < 0.36) {
    // Gợi ý nhanh & Daily Picks
    const path = Math.random() < 0.5 ? "/api/v1/places/suggestions" : "/api/v1/places/daily-picks"
    res = http.get(`${BASE_URL}${path}`, { headers })
    bucketTrend = feedLatency
  } else if (r < 0.5) {
    // Bản đồ bounding box
    res = http.get(`${BASE_URL}/api/v1/places/map?bbox=${randomItem(MAP_BBOXES)}`, { headers })
    bucketTrend = mapLatency
  } else if (r < 0.62) {
    // Chi tiết địa điểm
    res = http.get(`${BASE_URL}/api/v1/places/${randomItem(PLACE_IDS)}`, { headers })
    bucketTrend = detailLatency
  } else if (r < 0.72) {
    // Gợi ý cá nhân hoá DES (cold-start anonId)
    res = http.get(`${BASE_URL}/api/v1/places/recommended?anonId=k6-anon-${vuId}&limit=6`, {
      headers,
    })
    bucketTrend = recLatency
  } else if (r < 0.82) {
    // Cộng đồng: feed bài đăng, bình luận địa điểm, gợi ý người dùng
    const sub = Math.random()
    const path =
      sub < 0.5
        ? "/api/v1/posts?limit=10"
        : sub < 0.8
          ? `/api/v1/places/${randomItem(PLACE_IDS)}/posts`
          : "/api/v1/users?q=a&limit=10"
    res = http.get(`${BASE_URL}${path}`, { headers })
    bucketTrend = socialLatency
  } else if (r < 0.88) {
    // Open Graph bot preview HTML
    res = http.get(`${BASE_URL}/api/v1/og/place/${randomItem(PLACE_IDS)}`, {
      headers: { ...headers, Accept: "text/html" },
    })
    bucketTrend = ogLatency
  } else if (r < 0.95) {
    // Batch interaction_events (bulk unnest INSERT + Redis dedupe)
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
    // Telemetry RUM (Web Vitals)
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

  if (PROFILE === "high_vu_low_rps") {
    // Giữ nhiều VU sống đồng thời nhưng tần suất request thấp (5–9s/lần) để tìm ngưỡng kết nối/RAM/FD
    sleep(5 + Math.random() * 4)
  } else {
    // Kịch bản benchmark: tăng mật độ request/giây
    sleep(0.15 + Math.random() * 0.25)
  }
}

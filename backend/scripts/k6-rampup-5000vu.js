import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const latencyTrend = new Trend('user_req_latency', true);
const errorRate = new Rate('user_error_rate');
const degradedRate = new Rate('user_degraded_rate'); // latency > 1000ms

export const options = {
  stages: [
    // 1. Khởi động với 500 VUs
    { duration: '30s', target: 500 },
    { duration: '30s', target: 500 },
    // 2. Tăng lên 1,000 VUs
    { duration: '30s', target: 1000 },
    { duration: '30s', target: 1000 },
    // 3. Tăng lên 2,000 VUs
    { duration: '30s', target: 2000 },
    { duration: '30s', target: 2000 },
    // 4. Tăng lên 3,000 VUs
    { duration: '30s', target: 3000 },
    { duration: '30s', target: 3000 },
    // 5. Tăng lên 5,000 VUs (Mốc cực đoan xem điểm sập / treo)
    { duration: '30s', target: 5000 },
    { duration: '40s', target: 5000 },
    // Hạ tải
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    // Không ép fail k6 nếu quá tải vì mục tiêu là tìm ngưỡng suy hao (degradation point)
  },
};

const SEARCH_QUERIES = [
  'cafe', 'banh mi', 'cocktail', 'pizza', 'hai san', 
  'tra sua', 'an vat', 'chay', 'steak', 'rooftop',
  'bún chả cá', 'cà phê yên tĩnh', 'quán nhậu bờ kè'
];

const MAP_BBOXES = [
  '16.050,108.200,16.080,108.230',
  '16.030,108.210,16.060,108.240',
  '16.060,108.220,16.090,108.250',
];

const PLACE_IDS = [
  'ge-cafe-66-do-quang-vinh-trung-thanh-khe',
  'bun-dau-mam-tom-36-36-ngo-van-so-hoa-khanh-lien-chieu',
  'com-nha-kieu-thi-68-70-duong-2-thang-9-hai-chau',
  'banh-mi-que-tu-hai-pham-cu-luong-122-pham-cu-luong-son-tra',
  'banh-mi-ong-ty-trung-nu-vuong-189-trung-nu-vuong-hai-chau'
];

export default function () {
  // Mỗi VU đóng vai một người dùng độc lập từ khắp nơi
  const vuId = __VU;
  const ipSuffix1 = (vuId >> 8) & 255;
  const ipSuffix2 = vuId & 255;
  const clientIp = `113.160.${ipSuffix1}.${ipSuffix2}`;

  const headers = {
    'Accept': 'application/json',
    'X-Forwarded-For': clientIp,
    'User-Agent': `Mozilla/5.0 (Client-VU-${vuId})`,
  };

  // Người dùng thực hiện 1 thao tác bình thường ngẫu nhiên:
  const actionType = Math.random();
  let res;

  if (actionType < 0.35) {
    // 35% người dùng: Tìm kiếm địa điểm (Search EGRF)
    const q = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    res = http.get(`http://127.0.0.1:5173/api/v1/places?q=${encodeURIComponent(q)}&limit=10`, { headers });
  } else if (actionType < 0.60) {
    // 25% người dùng: Xem gợi ý hôm nay / khám phá (Feed & Daily Picks)
    const endpoint = Math.random() < 0.5 ? '/api/v1/places/suggestions' : '/api/v1/places/daily-picks';
    res = http.get(`http://127.0.0.1:5173${endpoint}`, { headers });
  } else if (actionType < 0.85) {
    // 25% người dùng: Lướt bản đồ toạ độ (Map Bounding Box)
    const bbox = MAP_BBOXES[Math.floor(Math.random() * MAP_BBOXES.length)];
    res = http.get(`http://127.0.0.1:5173/api/v1/places/map?bbox=${bbox}`, { headers });
  } else {
    // 15% người dùng: Xem chi tiết 1 quán cụ thể
    const placeId = PLACE_IDS[Math.floor(Math.random() * PLACE_IDS.length)];
    res = http.get(`http://127.0.0.1:5173/api/v1/places/${placeId}`, { headers });
  }

  latencyTrend.add(res.timings.duration);
  degradedRate.add(res.timings.duration > 1000); // Đánh dấu nếu phản hồi chậm > 1 giây

  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
  });

  if (!isSuccess) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  // Mô phỏng người dùng bình thường: Nghỉ ngơi giữa các thao tác (Think time 1 - 3 giây)
  sleep(1.0 + Math.random() * 2.0);
}

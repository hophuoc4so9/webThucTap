import http from 'k6/http';
import { check, group, sleep } from 'k6';

// --- CONFIGURATION ---
const BASE_URL = 'http://localhost:8082'; // API Gateway URL (Đã sửa từ 3000 sang 8082)

export const options = {
  // Định nghĩa các kịch bản test (Bạn có thể comment/uncomment để chọn loại test)
  scenarios: {
    // 1. Load Test: Giả lập lưu lượng truy cập thực tế
    actual_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },  // Ramp-up lên 50 user
        { duration: '1m', target: 50 },   // Duy trì 50 user
        { duration: '30s', target: 0 },   // Ramp-down
      ],
      gracefulRampDown: '30s',
    },
    /* 
    // 2. Stress Test: Tìm giới hạn (Bỏ comment để dùng cho báo cáo NCKH phần "Stress Test")
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    }
    */
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // Tỷ lệ lỗi < 1%
    http_req_duration: ['p(95)<1000'], // 95% request phản hồi dưới 1s
  },
};

// --- TEST LOGIC ---
export default function () {
  // Group 1: Duyệt tin tuyển dụng (Job Service - Phổ biến nhất)
  group('Job Browsing', function () {
    const res = http.get(`${BASE_URL}/jobs?limit=10&page=1`);
    
    const isOk = check(res, {
      'status is 200': (r) => r.status === 200,
    });

    // Chỉ parse nếu kết quả trả về là OK và có nội dung
    if (isOk && res.body) {
      try {
        const body = JSON.parse(res.body);
        check(body, {
          'has data field': (b) => b.data !== undefined,
        });
      } catch (e) {
        console.error(`Failed to parse JSON: ${res.body.substring(0, 100)}...`);
      }
    }
    sleep(1);
  });

  // Group 2: Tìm kiếm nâng cao (AI Search - High CPU/Memory)
  group('Advanced Search', function () {
    const payload = JSON.stringify({
      query: "Thực tập sinh Java",
      location: "Bình Dương",
      limit: 10
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/jobs/search-advanced`, payload, params);
    
    const isOk = check(res, {
      'search status ok': (r) => r.status === 200 || r.status === 201,
    });

    if (isOk && res.body) {
      try {
        const body = JSON.parse(res.body);
        check(body, {
          'search results count ok': (b) => b.data && b.data.length >= 0,
        });
      } catch (e) {
        console.error(`Search JSON parse error: ${e.message}`);
      }
    }
    sleep(2);
  });

  // Group 3: Thông tin User & CV (Database I/O)
  group('User & CV Access', function () {
    // Sử dụng ID thực tế từ database để tránh 404 làm sai lệch kết quả Performance Test
    const validCvIds = [1, 8, 9, 10, 11, 12, 14, 15];
    const cvId = validCvIds[Math.floor(Math.random() * validCvIds.length)];
    const res = http.get(`${BASE_URL}/cvs/${cvId}`);
    
    check(res, {
      'cv status is 200': (r) => r.status === 200,
    });
    sleep(1);
  });
}


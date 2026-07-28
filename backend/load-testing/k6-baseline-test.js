/**
 * GoalSync Enterprise Platform — Baseline / Load Test
 *
 * Simulates 100 concurrent virtual users hitting the API continuously
 * for 1 minute, exercising login + goal listing + dashboard summary
 * (the most common read paths in the app).
 *
 * Install k6:  https://k6.io/docs/get-started/installation/
 * Run:         k6 run load-testing/k6-baseline-test.js
 *   or:        BASE_URL=https://your-api.onrender.com k6 run load-testing/k6-baseline-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'employee@goalsync.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Password123!';

const errorRate = new Rate('errors');
const loginTrend = new Trend('login_duration');
const goalsTrend = new Trend('goals_list_duration');
const dashboardTrend = new Trend('dashboard_duration');

export const options = {
  scenarios: {
    baseline_load: {
      executor: 'constant-vus',
      vus: 100, // 100 virtual users
      duration: '1m', // running continuously for 1 minute
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500', 'avg<250'], // matches expected avg ~250ms, max ~1.5s
    errors: ['rate<0.01'], // less than 1% error rate
  },
};

export default function () {
  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginTrend.add(loginRes.timings.duration);
  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });
  errorRate.add(!loginOk);

  let token;
  try {
    token = JSON.parse(loginRes.body).token;
  } catch (e) {
    token = null;
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  // 2. List goals
  const goalsRes = http.get(`${BASE_URL}/api/goals`, authHeaders);
  goalsTrend.add(goalsRes.timings.duration);
  errorRate.add(!check(goalsRes, { 'goals status is 200': (r) => r.status === 200 }));

  // 3. Dashboard summary
  const dashboardRes = http.get(`${BASE_URL}/api/dashboard/summary`, authHeaders);
  dashboardTrend.add(dashboardRes.timings.duration);
  errorRate.add(!check(dashboardRes, { 'dashboard status is 200': (r) => r.status === 200 }));

  sleep(1); // think time between iterations, simulating a real user
}

export function handleSummary(data) {
  const rps = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : 'n/a';
  const avg = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(0) : 'n/a';
  const min = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.min.toFixed(0) : 'n/a';
  const max = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max.toFixed(0) : 'n/a';

  console.log(`
==================== BASELINE LOAD TEST SUMMARY ====================
Requests per second : ${rps} req/sec
Average response time: ${avg} ms
Min response time    : ${min} ms
Max response time    : ${max} ms
======================================================================
  `);

  return {
    stdout: JSON.stringify(data, null, 2),
  };
}

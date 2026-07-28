# Baseline / Load Testing — GoalSync Enterprise Platform

This validates the API under a normal expected concurrent load:

- **100 virtual users**
- Running **continuously for 1 minute**
- Thousands of requests sent during that window

## Option A — k6 (recommended)

1. Install k6: https://k6.io/docs/get-started/installation/
2. Make sure the backend is running and seeded (`npm run seed`).
3. Run:
   ```bash
   k6 run load-testing/k6-baseline-test.js
   ```
   Against a deployed backend:
   ```bash
   BASE_URL=https://your-api.onrender.com k6 run load-testing/k6-baseline-test.js
   ```

## Option B — Artillery (npm-only, no separate binary)

```bash
npm install -g artillery
artillery run load-testing/artillery-baseline-test.yml
```

## What you'll see

**Requests per second (RPS)**
Example: `120 req/sec` → the API handled ~120 requests every second.

**Response time**
```
Average: 250ms
Min:     50ms
Max:     1500ms
```
- Fastest response = 50ms
- Average = 250ms
- Slowest = 1.5s

## Reading the results

- `http_req_duration` (k6) shows avg / min / max / p95 response times.
- The test enforces thresholds: `p(95) < 1500ms`, `avg < 250ms`, error rate `< 1%`.
- If thresholds fail, check: database connection pool size, missing indexes (the
  Prisma schema already indexes the hot lookup columns), and whether
  `compression`/`helmet` middleware is enabled (they are, by default, in `src/index.js`).
- For higher-load testing beyond baseline (e.g. 500 or 1000 users), duplicate
  the script and change `vus` / `arrivalRate` and `duration`.

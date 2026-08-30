/**
 * k6 Load Test Script — منصة الحسينية
 *
 * Installation:
 *   # macOS
 *   brew install k6
 *
 *   # Windows
 *   choco install k6
 *
 *   # Linux
 *   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
 *   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
 *   sudo apt update && sudo apt install k6
 *
 * Usage:
 *   # Smoke test (quick validation)
 *   k6 run --vus 5 --duration 30s scripts/load-test.js -e BASE_URL=https://api.uamex.vercel.app
 *
 *   # Load test (typical production load)
 *   k6 run --vus 50 --duration 5m scripts/load-test.js -e BASE_URL=https://api.uamex.vercel.app
 *
 *   # Stress test (find breaking point)
 *   k6 run --vus 200 --duration 10m scripts/load-test.js -e BASE_URL=https://api.uamex.vercel.app
 *
 *   # Spike test (sudden traffic surge)
 *   k6 run --stage 10s:10 --stage 1m:100 --stage 10s:10 scripts/load-test.js -e BASE_URL=https://api.uamex.vercel.app
 *
 * Environment Variables:
 *   BASE_URL          - Base URL of the API (default: http://localhost:3000)
 *   JWT_TOKEN         - Valid JWT for authenticated endpoints (optional)
 *   TENANT_ID         - Tenant ID for multi-tenant endpoints (optional)
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const trpcLatency = new Trend("trpc_latency");
const healthLatency = new Trend("health_latency");
const authErrors = new Counter("auth_errors");

// Configuration
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const JWT_TOKEN = __ENV.JWT_TOKEN || "";
const TENANT_ID = __ENV.TENANT_ID || "";

// Test stages (can be overridden via --stage)
export const options = {
  scenarios: {
    // Smoke test - quick validation
    smoke: {
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
      tags: { test_type: "smoke" },
    },
    // Load test - sustained typical load
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 25 },
        { duration: "30s", target: 0 },
      ],
      tags: { test_type: "load" },
    },
    // Stress test - beyond normal capacity
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "3m", target: 200 },
        { duration: "2m", target: 100 },
        { duration: "1m", target: 0 },
      ],
      tags: { test_type: "stress" },
    },
  },
  thresholds: {
    // Health check must be fast
    health_latency: ["p(95)<500"],
    // tRPC calls should be reasonable
    trpc_latency: ["p(95)<2000", "p(99)<5000"],
    // Error rate must stay low
    errors: ["rate<0.05"],
    // HTTP errors
    http_req_failed: ["rate<0.02"],
  },
  // Export for CI integration
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

// Helper: Build headers
function getHeaders(auth = true) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (auth && JWT_TOKEN) {
    headers["Authorization"] = `Bearer ${JWT_TOKEN}`;
  }
  if (TENANT_ID) {
    headers["x-tenant-id"] = TENANT_ID;
  }
  return headers;
}

// Helper: Make tRPC batch request
function trpcBatch(queries) {
  const payload = JSON.stringify(
    queries.map(q => ({
      method: q.method || "query",
      path: q.path,
      input: q.input,
    }))
  );
  return http.post(`${BASE_URL}/api/trpc`, payload, {
    headers: getHeaders(),
    tags: { name: "trpc_batch" },
  });
}

// Helper: Single tRPC call
function trpcCall(path, input = {}, method = "query") {
  const start = Date.now();
  const res = trpcBatch([{ path, input, method }]);
  trpcLatency.add(Date.now() - start);
  return res;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

export default function () {
  // ------------------------------------------------------------
  // 1. Health Check (public, no auth)
  // ------------------------------------------------------------
  group("Health Check", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: { Accept: "application/json" },
      tags: { name: "health" },
    });
    healthLatency.add(Date.now() - start);

    const ok = check(res, {
      "health: status 200": r => r.status === 200,
      "health: dbAvailable true": r => r.json("dbAvailable") === true,
      "health: response < 500ms": r => r.timings.duration < 500,
    });

    errorRate.add(!ok);
    if (!ok) console.error(`Health check failed: ${res.status} ${res.body}`);
  });

  sleep(1);

  // ------------------------------------------------------------
  // 2. Public Store Endpoints (no auth)
  // ------------------------------------------------------------
  group("Public Store", () => {
    // Catalog
    const catalogRes = http.get(`${BASE_URL}/api/web/catalog`, {
      headers: getHeaders(false),
      tags: { name: "web_catalog" },
    });
    check(catalogRes, {
      "catalog: status 200": r => r.status === 200,
      "catalog: has products": r => r.json("products.length") > 0,
    });
    errorRate.add(catalogRes.status !== 200);

    sleep(0.5);

    // Track order (search only, no list leak)
    const trackRes = http.get(`${BASE_URL}/api/web/orders/track?query=TEST`, {
      headers: getHeaders(false),
      tags: { name: "web_track" },
    });
    check(trackRes, {
      "track: status 200 or 404": r => r.status === 200 || r.status === 404,
    });
    errorRate.add(!(trackRes.status === 200 || trackRes.status === 404));
  });

  sleep(1);

  // ------------------------------------------------------------
  // 3. Authenticated tRPC Endpoints (require JWT)
  // ------------------------------------------------------------
  if (JWT_TOKEN) {
    group("Authenticated tRPC", () => {
      // 3.1 Operations summary (dashboard widget)
      const opsRes = trpcCall("operations.summary");
      check(opsRes, {
        "ops.summary: status 200": r => r.status === 200,
        "ops.summary: has data": r => r.json("result.data") !== undefined,
      });
      errorRate.add(opsRes.status !== 200);

      sleep(0.3);

      // 3.2 List sales invoices (paginated)
      const invoicesRes = trpcCall("erp.salesInvoices.list", {
        limit: 20,
        offset: 0,
      });
      check(invoicesRes, {
        "invoices.list: status 200": r => r.status === 200,
        "invoices.list: has items": r =>
          Array.isArray(r.json("result.data.items")),
      });
      errorRate.add(invoicesRes.status !== 200);

      sleep(0.3);

      // 3.3 List products (with search)
      const productsRes = trpcCall("erp.products.list", {
        limit: 20,
        search: "",
      });
      check(productsRes, {
        "products.list: status 200": r => r.status === 200,
        "products.list: has items": r =>
          Array.isArray(r.json("result.data.items")),
      });
      errorRate.add(productsRes.status !== 200);

      sleep(0.3);

      // 3.4 List customers
      const customersRes = trpcCall("erp.customers.list", { limit: 20 });
      check(customersRes, {
        "customers.list: status 200": r => r.status === 200,
        "customers.list: has items": r =>
          Array.isArray(r.json("result.data.items")),
      });
      errorRate.add(customersRes.status !== 200);

      sleep(0.3);

      // 3.5 Financial reports (heavier query)
      const trialBalanceRes = trpcCall("financialReports.trialBalance", {
        period: "2026",
      });
      check(trialBalanceRes, {
        "trialBalance: status 200": r => r.status === 200,
      });
      errorRate.add(trialBalanceRes.status !== 200);
    });

    sleep(1);

    // ------------------------------------------------------------
    // 4. Mutation Test (write operation - use carefully!)
    // ------------------------------------------------------------
    // Note: This creates a test draft invoice and deletes it
    // Only run in staging/test environments
    group("Mutation (Draft Invoice)", () => {
      // Create draft
      const createRes = trpcCall(
        "erp.salesInvoices.create",
        {
          customerId: 1, // Assumes test customer exists
          items: [
            { productId: 1, quantity: 1, unitPrice: "100", type: "service" },
          ],
          status: "draft",
        },
        "mutation"
      );

      check(createRes, {
        "create draft: status 200": r => r.status === 200,
        "create draft: returns id": r => r.json("result.data.id") !== undefined,
      });
      errorRate.add(createRes.status !== 200);

      const draftId = createRes.json("result.data.id");

      sleep(0.5);

      // Delete draft (cleanup)
      if (draftId) {
        const deleteRes = trpcCall(
          "erp.salesInvoices.delete",
          { id: draftId },
          "mutation"
        );
        check(deleteRes, {
          "delete draft: status 200": r => r.status === 200,
        });
        errorRate.add(deleteRes.status !== 200);
      }
    });
  } else {
    console.log(
      "⚠️  JWT_TOKEN not provided — skipping authenticated endpoints"
    );
  }

  // ------------------------------------------------------------
  // 5. Rate Limit Test (verify 429 handling)
  // ------------------------------------------------------------
  group("Rate Limit Check", () => {
    // Make rapid requests to trigger rate limit
    for (let i = 0; i < 10; i++) {
      const res = http.get(`${BASE_URL}/api/health`, {
        headers: { Accept: "application/json" },
        tags: { name: "rate_limit" },
      });
      if (res.status === 429) {
        console.log("✅ Rate limiting active (429 received)");
        break;
      }
      sleep(0.05);
    }
  });

  sleep(1);
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

export function setup() {
  console.log(`🚀 Starting load test against ${BASE_URL}`);
  console.log(`📊 Test type: ${__ENV.K6_TEST_TYPE || "smoke"}`);
  if (JWT_TOKEN) console.log("🔐 Authenticated mode enabled");
  if (TENANT_ID) console.log(`🏢 Tenant ID: ${TENANT_ID}`);
  return { baseUrl: BASE_URL };
}

export function teardown(data) {
  console.log("✅ Load test completed");
  console.log(`📈 Results available in k6 summary`);
}

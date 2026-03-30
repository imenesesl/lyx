import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4002";

const testApps = new SharedArray("apps", function () {
  return [
    { accountId: "iml", slug: "example-1" },
  ];
});

const healthLatency = new Trend("health_latency", true);
const layoutLatency = new Trend("layout_latency", true);
const slotLatency = new Trend("slot_latency", true);
const apiErrors = new Rate("api_error_rate");
const apiRequests = new Counter("api_total_requests");

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    health_latency: ["p(95)<500"],
    layout_latency: ["p(95)<500"],
    slot_latency: ["p(95)<500"],
    api_error_rate: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const app = testApps[Math.floor(Math.random() * testApps.length)];

  // Health check
  {
    const res = http.get(`${BASE_URL}/health`, {
      tags: { endpoint: "health" },
    });
    healthLatency.add(res.timings.duration);
    apiRequests.add(1);

    const passed = check(res, {
      "health: status 200": (r) => r.status === 200,
      "health: body has ok": (r) => {
        try {
          return JSON.parse(r.body).status === "ok";
        } catch {
          return false;
        }
      },
    });
    apiErrors.add(!passed);
  }

  sleep(0.5);

  // Layout API
  {
    const url = `${BASE_URL}/api/runtime/${app.accountId}/${app.slug}/layout`;
    const res = http.get(url, {
      tags: { endpoint: "layout" },
    });
    layoutLatency.add(res.timings.duration);
    apiRequests.add(1);

    const passed = check(res, {
      "layout: status 200": (r) => r.status === 200,
      "layout: has regions": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.regions);
        } catch {
          return false;
        }
      },
      "layout: has assignedSlots": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.assignedSlots);
        } catch {
          return false;
        }
      },
    });
    apiErrors.add(!passed);
  }

  sleep(0.5);

  // Slot MFE entry
  {
    const url = `${BASE_URL}/api/runtime/${app.accountId}/${app.slug}/mfes/slot/main`;
    const res = http.get(url, {
      tags: { endpoint: "slot_mfe" },
    });
    slotLatency.add(res.timings.duration);
    apiRequests.add(1);

    const passed = check(res, {
      "slot: status 200 or 404": (r) => r.status === 200 || r.status === 404,
      "slot: valid response": (r) => {
        if (r.status === 404) return true;
        try {
          const body = JSON.parse(r.body);
          return typeof body.name === "string" && typeof body.remoteEntry === "string";
        } catch {
          return false;
        }
      },
    });
    apiErrors.add(!passed);
  }

  sleep(1);
}

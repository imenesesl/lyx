import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const ADMIN_URL = __ENV.ADMIN_URL || "http://localhost:4001";
const SHELL_URL = __ENV.SHELL_URL || "http://localhost:4002";
const ACCOUNT_ID = __ENV.ACCOUNT_ID || "iml";
const APP_SLUG = __ENV.APP_SLUG || "example-1";

const adminJourneyDuration = new Trend("admin_journey_duration", true);
const shellJourneyDuration = new Trend("shell_journey_duration", true);
const journeyErrors = new Rate("journey_error_rate");
const journeyRequests = new Counter("journey_total_requests");

export const options = {
  scenarios: {
    admin_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 10 },
        { duration: "1m", target: 10 },
        { duration: "10s", target: 0 },
      ],
      tags: { scenario: "admin" },
    },
    shell_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 20 },
        { duration: "1m", target: 20 },
        { duration: "10s", target: 0 },
      ],
      tags: { scenario: "shell" },
    },
  },
  thresholds: {
    "http_req_duration{scenario:admin}": ["p(95)<1000"],
    "http_req_duration{scenario:shell}": ["p(95)<2000"],
    journey_error_rate: ["rate<0.05"],
    admin_journey_duration: ["p(95)<3000"],
    shell_journey_duration: ["p(95)<5000"],
  },
};

function adminJourney() {
  const start = Date.now();

  group("admin: health check", function () {
    const res = http.get(`${ADMIN_URL}/api/health`, {
      tags: { endpoint: "admin_health", scenario: "admin" },
    });
    journeyRequests.add(1);
    check(res, {
      "admin health: status ok": (r) => r.status === 200,
    });
  });

  sleep(0.5);

  group("admin: list apps", function () {
    const res = http.get(`${ADMIN_URL}/api/apps`, {
      tags: { endpoint: "admin_apps", scenario: "admin" },
    });
    journeyRequests.add(1);
    check(res, {
      "admin apps: status ok": (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(0.3);

  group("admin: runtime layout", function () {
    const res = http.get(
      `${ADMIN_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/layout`,
      { tags: { endpoint: "admin_layout", scenario: "admin" } },
    );
    journeyRequests.add(1);
    check(res, {
      "admin layout: status ok": (r) => r.status === 200,
    });
  });

  sleep(0.3);

  group("admin: list MFEs", function () {
    const res = http.get(
      `${ADMIN_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/mfes`,
      { tags: { endpoint: "admin_mfes", scenario: "admin" } },
    );
    journeyRequests.add(1);
    check(res, {
      "admin mfes: valid response": (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(0.3);

  group("admin: shell health", function () {
    const res = http.get(`${SHELL_URL}/health`, {
      tags: { endpoint: "shell_health", scenario: "admin" },
    });
    journeyRequests.add(1);
    check(res, {
      "shell health: status ok": (r) => r.status === 200,
    });
  });

  const elapsed = Date.now() - start;
  adminJourneyDuration.add(elapsed);
  journeyErrors.add(elapsed > 5000 ? 1 : 0);

  sleep(1);
}

function shellJourney() {
  const start = Date.now();

  group("shell: load app page", function () {
    const res = http.get(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}/`, {
      tags: { endpoint: "shell_ssr", scenario: "shell" },
      headers: { Accept: "text/html" },
    });
    journeyRequests.add(1);

    const passed = check(res, {
      "shell page: status 200": (r) => r.status === 200,
      "shell page: has HTML": (r) =>
        typeof r.body === "string" && r.body.includes("<!DOCTYPE html>"),
      "shell page: has initial data": (r) =>
        typeof r.body === "string" && r.body.includes("__LYX_INITIAL__"),
    });
    journeyErrors.add(!passed);
  });

  sleep(1);

  group("shell: fetch MFE entries", function () {
    const layoutRes = http.get(
      `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/layout`,
      { tags: { endpoint: "shell_layout", scenario: "shell" } },
    );
    journeyRequests.add(1);

    if (layoutRes.status === 200) {
      try {
        const layout = JSON.parse(layoutRes.body);
        const slots = layout.assignedSlots || [];

        for (const slot of slots.slice(0, 3)) {
          const mfeRes = http.get(
            `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/mfes/slot/${slot}`,
            { tags: { endpoint: "shell_mfe_slot", scenario: "shell" } },
          );
          journeyRequests.add(1);
          check(mfeRes, {
            [`slot ${slot}: valid`]: (r) => r.status === 200 || r.status === 404,
          });
        }
      } catch {
        // layout parse failed
      }
    }
  });

  const elapsed = Date.now() - start;
  shellJourneyDuration.add(elapsed);

  sleep(2);
}

export default function () {
  if (__ENV.SCENARIO === "admin") {
    adminJourney();
  } else if (__ENV.SCENARIO === "shell") {
    shellJourney();
  } else {
    // When run via scenarios, k6 calls default for each VU.
    // Use exec tag from scenario config or alternate based on VU id.
    const scenario = __VU % 2 === 0 ? "admin" : "shell";
    if (scenario === "admin") {
      adminJourney();
    } else {
      shellJourney();
    }
  }
}

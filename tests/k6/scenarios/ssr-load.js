import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4002";

const testApps = new SharedArray("apps", function () {
  return [
    { accountId: "iml", slug: "example-1" },
  ];
});

const ssrRenderTime = new Trend("ssr_render_time", true);
const ssrPageSize = new Trend("ssr_page_size", false);
const ssrErrors = new Rate("ssr_error_rate");

export const options = {
  stages: [
    { duration: "20s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    ssr_render_time: ["p(95)<2000"],
    ssr_error_rate: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const app = testApps[Math.floor(Math.random() * testApps.length)];
  const url = `${BASE_URL}/${app.accountId}/${app.slug}/`;

  const res = http.get(url, {
    tags: { endpoint: "ssr_page" },
    headers: {
      Accept: "text/html",
    },
  });

  ssrRenderTime.add(res.timings.duration);
  ssrPageSize.add(res.body ? res.body.length : 0);

  const passed = check(res, {
    "ssr: status 200": (r) => r.status === 200,
    "ssr: contains DOCTYPE": (r) =>
      typeof r.body === "string" && r.body.includes("<!DOCTYPE html>"),
    "ssr: contains __LYX_INITIAL__": (r) =>
      typeof r.body === "string" && r.body.includes("__LYX_INITIAL__"),
    "ssr: contains #root": (r) =>
      typeof r.body === "string" && r.body.includes('id="root"'),
    "ssr: contains skeleton markers": (r) =>
      typeof r.body === "string" && r.body.includes("data-lyx-skeleton"),
    "ssr: contains client JS bundle": (r) =>
      typeof r.body === "string" && r.body.includes("/_assets/"),
    "ssr: page size > 1KB": (r) =>
      typeof r.body === "string" && r.body.length > 1024,
  });

  ssrErrors.add(!passed);

  sleep(2);
}

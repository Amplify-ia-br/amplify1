import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.argv[2] || "https://aplify-site.vercel.app";
const runs = Number(process.argv[3] || 5);

const metrics = [];

for (let i = 1; i <= runs; i += 1) {
  const out = `lighthouse-prod-mobile-run-${i}.json`;
  execSync(
    [
      "npx lighthouse",
      url,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--preset=perf",
      "--form-factor=mobile",
      "--screenEmulation.mobile",
      "--throttling-method=simulate",
      "--output=json",
      `--output-path=./${out}`,
      "--chrome-flags='--headless=new --no-sandbox'",
    ].join(" "),
    { stdio: "inherit" }
  );
  const report = JSON.parse(readFileSync(out, "utf8"));
  const audits = report.audits;
  const categories = report.categories;
  metrics.push({
    run: i,
    perf: Math.round(categories.performance.score * 100),
    acc: Math.round(categories.accessibility.score * 100),
    bp: Math.round(categories["best-practices"].score * 100),
    seo: Math.round(categories.seo.score * 100),
    fcp: audits["first-contentful-paint"].numericValue,
    lcp: audits["largest-contentful-paint"].numericValue,
    si: audits["speed-index"].numericValue,
    cls: audits["cumulative-layout-shift"].numericValue,
    tbt: audits["total-blocking-time"].numericValue,
  });
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const summary = {
  url,
  runs,
  median: {
    perf: median(metrics.map((m) => m.perf)),
    acc: median(metrics.map((m) => m.acc)),
    bp: median(metrics.map((m) => m.bp)),
    seo: median(metrics.map((m) => m.seo)),
    fcp: median(metrics.map((m) => m.fcp)),
    lcp: median(metrics.map((m) => m.lcp)),
    si: median(metrics.map((m) => m.si)),
    cls: median(metrics.map((m) => m.cls)),
    tbt: median(metrics.map((m) => m.tbt)),
  },
  runsData: metrics,
};

writeFileSync(
  "lighthouse-prod-mobile-median-summary.json",
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8"
);

console.log("\nMobile median summary:");
console.log(JSON.stringify(summary.median, null, 2));

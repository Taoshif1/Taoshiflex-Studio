import assert from "node:assert/strict";
import test from "node:test";

import { buildStudioDashboard } from "../src/lib/studio-dashboard.ts";

const now = new Date("2026-09-15T06:00:00.000Z");
const project = (id, status, target_date = null) => ({
  id,
  status,
  target_date,
  created_at: "2026-01-01T00:00:00.000Z",
});
const billing = (project_id, agreed_value_minor, currency = "BDT", currency_decimals = 2) => ({
  project_id,
  agreed_value_minor,
  currency,
  currency_decimals,
});
const payment = ({
  project_id = "p1",
  entry_type = "payment",
  amount_minor,
  currency = "BDT",
  status = "confirmed",
  confirmed_at = "2026-09-05T06:00:00.000Z",
  submitted_at = "2026-09-01T06:00:00.000Z",
}) => ({
  project_id,
  entry_type,
  amount_minor,
  currency,
  status,
  confirmed_at,
  submitted_at,
});

test("handles empty data without invented values", () => {
  const result = buildStudioDashboard({
    clientProjects: [],
    memberships: [],
    billing: [],
    payments: [],
    inquiries: [],
    now,
  });
  assert.equal(result.totalClients, 0);
  assert.equal(result.totalProjects, 0);
  assert.equal(result.activeProjects, 0);
  assert.equal(result.completedProjects, 0);
  assert.equal(result.dueSoon, 0);
  assert.equal(result.overdue, 0);
  assert.equal(result.pendingVerificationCount, 0);
  assert.equal(result.inquiryConversionRate, 0);
  assert.deepEqual(result.currencies, []);
});

test("keeps agreed value outstanding when billing has no payments", () => {
  const result = buildStudioDashboard({
    clientProjects: [project("p1", "planning")],
    memberships: [],
    billing: [billing("p1", 125_000)],
    payments: [],
    inquiries: [],
    now,
  });
  assert.equal(result.currencies[0].agreedMinor, 125_000);
  assert.equal(result.currencies[0].collectedLifetimeMinor, 0);
  assert.equal(result.currencies[0].outstandingMinor, 125_000);
  assert.equal(result.currencies[0].pendingMinor, 0);
  assert.equal(result.currencies[0].averageProjectValueMinor, 125_000);
});

test("derives operations, timing, reversals, and distinct clients accurately", () => {
  const result = buildStudioDashboard({
    clientProjects: [
      project("p1", "planning", "2026-09-30"),
      project("p2", "active", "2026-09-01"),
      project("p3", "client_review"),
      project("p4", "completed", "2026-01-01"),
      project("p5", "cancelled", "2026-01-01"),
    ],
    memberships: [
      { user_id: "client-a", role: "client" },
      { user_id: "client-a", role: "client" },
      { user_id: "client-b", role: "client" },
      { user_id: "studio-a", role: "studio" },
    ],
    billing: [billing("p1", 10_000_000), billing("p2", 150_000, "USD", 2)],
    payments: [
      payment({ amount_minor: 4_000_000 }),
      payment({ entry_type: "reversal", amount_minor: 500_000, confirmed_at: "2026-09-10T06:00:00.000Z" }),
      payment({ amount_minor: 1_000_000, confirmed_at: "2026-05-10T06:00:00.000Z" }),
      payment({ amount_minor: 2_000_000, confirmed_at: "2025-11-10T06:00:00.000Z" }),
      payment({ amount_minor: 3_000_000, confirmed_at: "2025-08-10T06:00:00.000Z" }),
      payment({ amount_minor: 1_000_000, status: "pending", confirmed_at: null }),
      payment({ amount_minor: 2_000_000, status: "rejected", confirmed_at: null }),
      payment({ project_id: "p2", amount_minor: 100_000, currency: "USD" }),
    ],
    inquiries: [
      { status: "new", created_at: "2026-09-01T00:00:00.000Z" },
      { status: "new", created_at: "2026-08-31T17:59:59.000Z" },
      { status: "contacted", created_at: "2026-08-01T00:00:00.000Z" },
      { status: "converted", created_at: "2026-07-01T00:00:00.000Z" },
      { status: "closed", created_at: "2026-06-01T00:00:00.000Z" },
    ],
    now,
  });

  assert.equal(result.totalClients, 2);
  assert.equal(result.totalProjects, 5);
  assert.equal(result.activeProjects, 3);
  assert.equal(result.completedProjects, 1);
  assert.equal(result.dueSoon, 1);
  assert.equal(result.overdue, 1);
  assert.equal(result.newInquiriesThisMonth, 1);
  assert.equal(result.inquiryConversionRate, 20);
  assert.equal(result.pendingVerificationCount, 1);
  assert.equal(result.currencies.length, 2);

  const bdt = result.currencies.find((item) => item.currency === "BDT");
  const usd = result.currencies.find((item) => item.currency === "USD");
  assert.ok(bdt);
  assert.ok(usd);
  assert.equal(bdt.collectedThisMonthMinor, 3_500_000);
  assert.equal(bdt.collectedSixMonthsMinor, 4_500_000);
  assert.equal(bdt.collectedTwelveMonthsMinor, 6_500_000);
  assert.equal(bdt.collectedLifetimeMinor, 9_500_000);
  assert.equal(bdt.outstandingMinor, 500_000);
  assert.equal(bdt.pendingMinor, 1_000_000);
  assert.equal(bdt.averageProjectValueMinor, 10_000_000);
  assert.equal(usd.collectedLifetimeMinor, 100_000);
  assert.equal(usd.outstandingMinor, 50_000);
});

test("uses confirmation month for reversals, never sums currencies, and clamps negative outstanding", () => {
  const result = buildStudioDashboard({
    clientProjects: [project("p1", "on_hold"), project("p2", "active")],
    memberships: [],
    billing: [billing("p1", 1_000), billing("p2", 900_000_000_000, "USD", 0)],
    payments: [
      payment({ amount_minor: 2_000, confirmed_at: "2026-08-20T06:00:00.000Z" }),
      payment({ entry_type: "reversal", amount_minor: 500, confirmed_at: "2026-09-02T06:00:00.000Z" }),
      payment({ project_id: "p2", amount_minor: 400_000_000_000, currency: "USD" }),
      payment({ project_id: "p2", amount_minor: 200, currency: "BDT" }),
    ],
    inquiries: [],
    now,
  });

  const bdt = result.currencies.find((item) => item.currency === "BDT");
  const usd = result.currencies.find((item) => item.currency === "USD");
  assert.ok(bdt);
  assert.ok(usd);
  assert.equal(bdt.outstandingMinor, 0);
  assert.equal(bdt.trend.find((month) => month.key === "2026-08")?.valueMinor, 2_000);
  assert.equal(bdt.trend.find((month) => month.key === "2026-09")?.valueMinor, -500);
  assert.equal(usd.collectedLifetimeMinor, 400_000_000_000);
  assert.equal(usd.outstandingMinor, 500_000_000_000);
  assert.equal(usd.decimals, 0);
  assert.equal(result.currencies.some((item) => item.currency === "BDT+USD"), false);
});

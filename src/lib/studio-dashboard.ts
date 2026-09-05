const projectStatuses = [
  "planning",
  "active",
  "client_review",
  "on_hold",
  "completed",
  "cancelled",
] as const;
const inquiryStatuses = ["new", "contacted", "qualified", "converted", "closed"] as const;
const operationalStatuses = new Set<string>(["planning", "active", "client_review", "on_hold"]);
const closedStatuses = new Set<string>(["completed", "cancelled"]);
const dhakaOffsetMs = 6 * 60 * 60 * 1000;

export type DashboardProjectRow = {
  id: string;
  status: string;
  target_date: string | null;
};
export type DashboardMembershipRow = { user_id: string; role: string };
export type DashboardBillingRow = {
  project_id: string;
  agreed_value_minor: number;
  currency: string;
  currency_decimals: number;
};
export type DashboardPaymentRow = {
  project_id: string;
  entry_type: string;
  amount_minor: number;
  currency: string;
  status: string;
  confirmed_at: string | null;
};
export type DashboardInquiryRow = { status: string; created_at: string };

export type StudioDashboardInput = {
  clientProjects: DashboardProjectRow[];
  memberships: DashboardMembershipRow[];
  billing: DashboardBillingRow[];
  payments: DashboardPaymentRow[];
  inquiries: DashboardInquiryRow[];
  now?: Date;
};

export type DashboardCurrency = {
  currency: string;
  decimals: number;
  billedProjects: number;
  agreedMinor: number;
  collectedThisMonthMinor: number;
  collectedSixMonthsMinor: number;
  collectedTwelveMonthsMinor: number;
  collectedLifetimeMinor: number;
  outstandingMinor: number;
  pendingMinor: number;
  averageProjectValueMinor: number;
  trend: Array<{ key: string; label: string; valueMinor: number }>;
};

export type StudioDashboardViewModel = {
  totalClients: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  dueSoon: number;
  overdue: number;
  pendingVerificationCount: number;
  projectStatus: Array<{ status: string; label: string; count: number }>;
  inquiryPipeline: Array<{ status: string; label: string; count: number }>;
  newInquiriesThisMonth: number;
  inquiryConversionRate: number;
  inquiryConversionDenominator: number;
  currencies: DashboardCurrency[];
  rangeNote: string;
};

type CurrencyAccumulator = Omit<DashboardCurrency, "trend" | "averageProjectValueMinor"> & {
  trend: Map<string, number>;
};

function safeMinor(value: number) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function safeDecimals(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 3 ? value : 2;
}

function localDateParts(date: Date) {
  const shifted = new Date(date.getTime() + dhakaOffsetMs);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function dhakaMonthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1) - dhakaOffsetMs);
}

function monthDescriptor(year: number, month: number) {
  const normalized = new Date(Date.UTC(year, month, 1));
  return {
    key: `${normalized.getUTCFullYear()}-${String(normalized.getUTCMonth() + 1).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("en-BD", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(normalized),
  };
}

function localDateKey(year: number, month: number, day: number) {
  const normalized = new Date(Date.UTC(year, month, day));
  return [
    normalized.getUTCFullYear(),
    String(normalized.getUTCMonth() + 1).padStart(2, "0"),
    String(normalized.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function validTime(value: string | null) {
  if (!value) return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time;
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildStudioDashboard(input: StudioDashboardInput): StudioDashboardViewModel {
  const now = input.now && !Number.isNaN(input.now.getTime()) ? input.now : new Date();
  const localNow = localDateParts(now);
  const currentMonthStart = dhakaMonthStart(localNow.year, localNow.month);
  const nextMonthStart = dhakaMonthStart(localNow.year, localNow.month + 1);
  const sixMonthStart = dhakaMonthStart(localNow.year, localNow.month - 5);
  const twelveMonthStart = dhakaMonthStart(localNow.year, localNow.month - 11);
  const today = localDateKey(localNow.year, localNow.month, localNow.day);
  const dueCutoff = localDateKey(localNow.year, localNow.month, localNow.day + 30);
  const months = Array.from({ length: 12 }, (_, index) =>
    monthDescriptor(localNow.year, localNow.month - 11 + index),
  );

  const clientIds = new Set(
    input.memberships
      .filter((membership) => membership.role === "client" && membership.user_id)
      .map((membership) => membership.user_id),
  );
  const projectCounts = new Map<string, number>();
  projectStatuses.forEach((status) => projectCounts.set(status, 0));
  let activeProjects = 0;
  let dueSoon = 0;
  let overdue = 0;
  for (const project of input.clientProjects) {
    if (projectCounts.has(project.status)) {
      projectCounts.set(project.status, (projectCounts.get(project.status) ?? 0) + 1);
    }
    if (operationalStatuses.has(project.status)) activeProjects += 1;
    if (!project.target_date || closedStatuses.has(project.status)) continue;
    if (project.target_date < today) overdue += 1;
    else if (project.target_date <= dueCutoff) dueSoon += 1;
  }

  const inquiryCounts = new Map<string, number>();
  inquiryStatuses.forEach((status) => inquiryCounts.set(status, 0));
  let newInquiriesThisMonth = 0;
  let inquiryTotal = 0;
  for (const inquiry of input.inquiries) {
    if (!inquiryCounts.has(inquiry.status)) continue;
    inquiryCounts.set(inquiry.status, (inquiryCounts.get(inquiry.status) ?? 0) + 1);
    inquiryTotal += 1;
    const createdAt = validTime(inquiry.created_at);
    if (
      createdAt &&
      createdAt >= currentMonthStart &&
      createdAt < nextMonthStart
    ) {
      newInquiriesThisMonth += 1;
    }
  }

  const currencyGroups = new Map<string, CurrencyAccumulator>();
  const billingByProject = new Map<string, DashboardBillingRow>();
  for (const item of input.billing) {
    const currency = item.currency.trim().toUpperCase();
    if (!currency || billingByProject.has(item.project_id)) continue;
    const billing = { ...item, currency };
    billingByProject.set(item.project_id, billing);
    if (!currencyGroups.has(currency)) {
      currencyGroups.set(currency, {
        currency,
        decimals: safeDecimals(item.currency_decimals),
        billedProjects: 0,
        agreedMinor: 0,
        collectedThisMonthMinor: 0,
        collectedSixMonthsMinor: 0,
        collectedTwelveMonthsMinor: 0,
        collectedLifetimeMinor: 0,
        outstandingMinor: 0,
        pendingMinor: 0,
        trend: new Map(months.map((month) => [month.key, 0])),
      });
    }
    const group = currencyGroups.get(currency)!;
    group.billedProjects += 1;
    group.agreedMinor += safeMinor(item.agreed_value_minor);
  }

  const collectedByProject = new Map<string, number>();
  let pendingVerificationCount = 0;
  for (const payment of input.payments) {
    const billing = billingByProject.get(payment.project_id);
    if (!billing || payment.currency.trim().toUpperCase() !== billing.currency) continue;
    const group = currencyGroups.get(billing.currency)!;
    const amount = safeMinor(payment.amount_minor);
    if (payment.status === "pending" && payment.entry_type === "payment") {
      group.pendingMinor += amount;
      pendingVerificationCount += 1;
      continue;
    }
    if (
      payment.status !== "confirmed" ||
      !["payment", "reversal"].includes(payment.entry_type) ||
      !payment.confirmed_at
    ) continue;
    const confirmedAt = validTime(payment.confirmed_at);
    if (!confirmedAt) continue;
    const signedAmount = payment.entry_type === "reversal" ? -amount : amount;
    collectedByProject.set(
      payment.project_id,
      (collectedByProject.get(payment.project_id) ?? 0) + signedAmount,
    );
    group.collectedLifetimeMinor += signedAmount;
    if (confirmedAt >= currentMonthStart && confirmedAt < nextMonthStart) {
      group.collectedThisMonthMinor += signedAmount;
    }
    if (confirmedAt >= sixMonthStart && confirmedAt < nextMonthStart) {
      group.collectedSixMonthsMinor += signedAmount;
    }
    if (confirmedAt >= twelveMonthStart && confirmedAt < nextMonthStart) {
      group.collectedTwelveMonthsMinor += signedAmount;
      const parts = localDateParts(confirmedAt);
      const key = monthDescriptor(parts.year, parts.month).key;
      if (group.trend.has(key)) group.trend.set(key, (group.trend.get(key) ?? 0) + signedAmount);
    }
  }

  for (const billing of billingByProject.values()) {
    const agreed = safeMinor(billing.agreed_value_minor);
    const collected = collectedByProject.get(billing.project_id) ?? 0;
    currencyGroups.get(billing.currency)!.outstandingMinor += Math.max(agreed - collected, 0);
  }

  const converted = inquiryCounts.get("converted") ?? 0;
  return {
    totalClients: clientIds.size,
    totalProjects: input.clientProjects.length,
    activeProjects,
    completedProjects: projectCounts.get("completed") ?? 0,
    dueSoon,
    overdue,
    pendingVerificationCount,
    projectStatus: projectStatuses.map((status) => ({
      status,
      label: titleCase(status),
      count: projectCounts.get(status) ?? 0,
    })),
    inquiryPipeline: inquiryStatuses.map((status) => ({
      status,
      label: titleCase(status),
      count: inquiryCounts.get(status) ?? 0,
    })),
    newInquiriesThisMonth,
    inquiryConversionRate: inquiryTotal ? Math.round((converted / inquiryTotal) * 1000) / 10 : 0,
    inquiryConversionDenominator: inquiryTotal,
    currencies: [...currencyGroups.values()]
      .sort((a, b) => a.currency.localeCompare(b.currency))
      .map((group) => ({
        ...group,
        averageProjectValueMinor: group.billedProjects
          ? Math.round(group.agreedMinor / group.billedProjects)
          : 0,
        trend: months.map((month) => ({
          ...month,
          valueMinor: group.trend.get(month.key) ?? 0,
        })),
      })),
    rangeNote:
      "This month and the 6M/12M totals use Dhaka calendar months. Confirmed reversals reduce the month in which they were confirmed.",
  };
}

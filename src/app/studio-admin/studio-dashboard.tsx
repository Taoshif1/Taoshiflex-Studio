import { formatMoney } from "@/lib/commercial";
import type { DashboardCurrency, StudioDashboardViewModel } from "@/lib/studio-dashboard";

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <article className="dashboard-kpi" aria-label={label}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function MoneyValues({
  currencies,
  field,
  empty = "No billing configured",
}: {
  currencies: DashboardCurrency[];
  field: keyof Pick<
    DashboardCurrency,
    | "agreedMinor"
    | "collectedThisMonthMinor"
    | "collectedSixMonthsMinor"
    | "collectedTwelveMonthsMinor"
    | "collectedLifetimeMinor"
    | "outstandingMinor"
    | "pendingMinor"
    | "averageProjectValueMinor"
  >;
  empty?: string;
}) {
  if (!currencies.length) return <span className="dashboard-money-empty">{empty}</span>;
  return (
    <span className="dashboard-money-stack">
      {currencies.map((item) => (
        <span key={item.currency}>
          <small>{item.currency}</small>
          {formatMoney(item[field], item.currency, item.decimals)}
        </span>
      ))}
    </span>
  );
}

function CollectionTrend({ currencies }: { currencies: DashboardCurrency[] }) {
  return (
    <section className="dashboard-trend" aria-labelledby="collections-trend-title">
      <header>
        <div>
          <p className="eyebrow">Cash movement</p>
          <h3 id="collections-trend-title">Monthly confirmed net collections</h3>
        </div>
        <span>Last 12 calendar months</span>
      </header>
      {currencies.length ? (
        currencies.map((currency) => {
          const maximum = Math.max(1, ...currency.trend.map((month) => Math.abs(month.valueMinor)));
          return (
            <div className="trend-currency" key={currency.currency}>
              <strong>{currency.currency}</strong>
              <ol aria-label={currency.currency + " monthly confirmed net collections"}>
                {currency.trend.map((month) => {
                  const width = month.valueMinor === 0
                    ? 0
                    : Math.max(4, (Math.abs(month.valueMinor) / maximum) * 100);
                  return (
                    <li key={month.key}>
                      <span className="trend-plot" aria-hidden>
                        <i
                          className={month.valueMinor < 0 ? "negative" : undefined}
                          style={{ height: width + "%" }}
                        />
                      </span>
                      <span>{month.label}</span>
                      <small title={formatMoney(month.valueMinor, currency.currency, currency.decimals)}>
                        {formatMoney(month.valueMinor, currency.currency, currency.decimals)}
                      </small>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })
      ) : (
        <p className="dashboard-empty">No billing or confirmed payment history yet.</p>
      )}
    </section>
  );
}

function StatusSummary({
  title,
  eyebrow,
  items,
}: {
  title: string;
  eyebrow: string;
  items: Array<{ status: string; label: string; count: number }>;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="dashboard-status" aria-label={title}>
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </header>
      <dl>
        {items.map((item) => (
          <div key={item.status}>
            <dt>{item.label}</dt>
            <dd>
              <span aria-hidden><i style={{ width: (item.count / maximum) * 100 + "%" }} /></span>
              <strong>{item.count}</strong>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StudioDashboard({ data }: { data: StudioDashboardViewModel | null }) {
  if (!data) {
    return (
      <section id="dashboard" className="studio-dashboard">
        <div className="dashboard-heading">
          <div><p className="eyebrow">Business overview</p><h2>Studio at a glance</h2></div>
          <span>Private operations</span>
        </div>
        <p className="dashboard-empty">Business analytics are temporarily unavailable. Operational editors remain available below.</p>
      </section>
    );
  }

  return (
    <section id="dashboard" className="studio-dashboard">
      <div className="dashboard-heading">
        <div><p className="eyebrow">Business overview</p><h2>Studio at a glance</h2></div>
        <span>Private operations</span>
      </div>
      <div className="dashboard-kpis primary">
        <KpiCard label="Total clients" value={data.totalClients} detail="Distinct Client Workspace members" />
        <KpiCard label="Active projects" value={data.activeProjects} detail="Planning, active, review, or on hold" />
        <KpiCard
          label="Collected this month"
          value={<MoneyValues currencies={data.currencies} field="collectedThisMonthMinor" />}
          detail="Confirmed net cash in Dhaka calendar month"
        />
        <KpiCard
          label="Outstanding"
          value={<MoneyValues currencies={data.currencies} field="outstandingMinor" />}
          detail="Agreed value less confirmed net collections"
        />
      </div>
      <div className="dashboard-kpis secondary">
        <KpiCard label="Total projects" value={data.totalProjects} detail={data.completedProjects + " completed"} />
        <KpiCard label="New inquiries" value={data.newInquiriesThisMonth} detail="Submissions this Dhaka calendar month" />
        <KpiCard
          label="Pending verification"
          value={<MoneyValues currencies={data.currencies} field="pendingMinor" empty="No pending payments" />}
          detail={data.pendingVerificationCount + " payment submission" + (data.pendingVerificationCount === 1 ? "" : "s")}
        />
        <KpiCard
          label="Inquiry conversion"
          value={data.inquiryConversionRate + "%"}
          detail={data.inquiryConversionDenominator
            ? "Converted / all persisted inquiries"
            : "No persisted inquiries yet"}
        />
        <KpiCard label="Due soon" value={data.dueSoon} detail="Open projects due within 30 days" />
        <KpiCard label="Overdue" value={data.overdue} detail="Open projects past target date" />
      </div>
      <section className="dashboard-financials" aria-label="Financial summary by currency">
        <header><p className="eyebrow">Commercial position</p><h3>Confirmed collections</h3></header>
        <div>
          <KpiCard label="Agreed project value" value={<MoneyValues currencies={data.currencies} field="agreedMinor" />} detail="Configured project billing only" />
          <KpiCard label="Last 6 months" value={<MoneyValues currencies={data.currencies} field="collectedSixMonthsMinor" />} detail="Six Dhaka calendar months" />
          <KpiCard label="Last 12 months" value={<MoneyValues currencies={data.currencies} field="collectedTwelveMonthsMinor" />} detail="Twelve Dhaka calendar months" />
          <KpiCard label="Lifetime collected" value={<MoneyValues currencies={data.currencies} field="collectedLifetimeMinor" />} detail="Confirmed payments less reversals" />
          <KpiCard label="Average project value" value={<MoneyValues currencies={data.currencies} field="averageProjectValueMinor" />} detail="Projects with billing configured" />
        </div>
      </section>
      <CollectionTrend currencies={data.currencies} />
      <div className="dashboard-snapshots">
        <StatusSummary eyebrow="Delivery" title="Project status" items={data.projectStatus} />
        <StatusSummary eyebrow="Demand" title="Inquiry pipeline" items={data.inquiryPipeline} />
      </div>
      <p className="dashboard-range-note">{data.rangeNote}</p>
    </section>
  );
}

interface KPIData {
  total_customers: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  hot_rate_pct: number;
}

interface Props {
  kpis: KPIData | null;
}

export function DashboardKPIs({ kpis }: Props) {
  const cards = [
    { title: "Total Customers", value: kpis?.total_customers ?? "—" },
    { title: "Hot Leads", value: kpis?.hot_leads ?? "—", accent: "text-red-600" },
    { title: "Warm Leads", value: kpis?.warm_leads ?? "—", accent: "text-amber-600" },
    { title: "Cold Leads", value: kpis?.cold_leads ?? "—", accent: "text-blue-600" },
    { title: "Hot Lead Rate", value: kpis ? `${kpis.hot_rate_pct ?? 0}%` : "—" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">{card.title}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.accent ?? "text-slate-900"}`}>
            {card.value}
          </p>
        </article>
      ))}
    </section>
  );
}

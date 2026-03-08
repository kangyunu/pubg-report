type Kpi = {
  key: string;
  label: string;
  value: string;
  delta?: number;
  lowerIsBetter?: boolean;
};

const KpiCards = ({ kpis }: { kpis: Kpi[] }) => {
  return (
    <section className="kpi-grid">
      {kpis.map((kpi) => {
        const hasDelta = typeof kpi.delta === "number";
        const good = kpi.lowerIsBetter
          ? (kpi.delta ?? 0) <= 0
          : (kpi.delta ?? 0) >= 0;
        const deltaClass = good ? "delta-positive" : "delta-negative";
        const sign = (kpi.delta ?? 0) > 0 ? "+" : "";

        return (
          <article className="kpi-card" key={kpi.key}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            {hasDelta ? (
              <div
                className={`kpi-delta ${deltaClass}`}
              >{`${sign}${(kpi.delta ?? 0).toFixed(1)}%`}</div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
};

export default KpiCards;

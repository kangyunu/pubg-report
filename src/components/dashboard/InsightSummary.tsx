const InsightSummary = ({ insights }: { insights: string[] }) => {
  return (
    <section className="panel chart-span-4">
      <h3 className="panel-title">Team Notes</h3>
      <ul className="insight-list">
        {insights.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
};

export default InsightSummary;

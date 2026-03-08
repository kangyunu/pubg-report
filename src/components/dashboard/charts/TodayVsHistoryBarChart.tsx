import { Bar } from "react-chartjs-2";

type Item = {
  mode: "solo" | "duo" | "squad";
  todayAvgDamage: number;
  sevenDayAvgDamage: number;
  todayMatches: number;
};

const TodayVsHistoryBarChart = ({ items }: { items: Item[] }) => {
  const labels = items.map((item) => item.mode.toUpperCase());

  return (
    <section className="panel chart-span-6">
      <h3 className="panel-title">Team Damage by Mode: Today vs Last 7 Days</h3>
      <div className="chart-area">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Today",
                data: items.map((item) =>
                  Number(item.todayAvgDamage.toFixed(0)),
                ),
                backgroundColor: "rgba(179, 71, 47, 0.85)",
              },
              {
                label: "Last 7d",
                data: items.map((item) =>
                  Number(item.sevenDayAvgDamage.toFixed(0)),
                ),
                backgroundColor: "rgba(91, 117, 96, 0.8)",
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
              },
              tooltip: {
                callbacks: {
                  afterLabel(context) {
                    const item = items[context.dataIndex];
                    return `Today matches: ${item.todayMatches}`;
                  },
                },
              },
            },
          }}
        />
      </div>
    </section>
  );
};

export default TodayVsHistoryBarChart;

import { Radar } from "react-chartjs-2";

type ModeStat = {
  mode: "solo" | "duo" | "squad";
  total: number;
  avgRank: number;
  avgDamage: number;
  avgKills: number;
  top10Rate: number;
  winRate: number;
  avgSurviveMinutes: number;
};

const ModeComparisonRadarChart = ({ items }: { items: ModeStat[] }) => {
  return (
    <section className="panel chart-span-6">
      <h3 className="panel-title">Mode Comparison Radar</h3>
      <div className="chart-area">
        <Radar
          data={{
            labels: ["Kills", "Damage", "Survive(min)", "Top10%", "Win%"],
            datasets: items.map((item, index) => ({
              label: `${item.mode.toUpperCase()} (${item.total})`,
              data: [
                Number(item.avgKills.toFixed(2)),
                Number((item.avgDamage / 20).toFixed(2)),
                Number(item.avgSurviveMinutes.toFixed(2)),
                Number(item.top10Rate.toFixed(2)),
                Number(item.winRate.toFixed(2)),
              ],
              backgroundColor: [
                "rgba(179, 71, 47, 0.25)",
                "rgba(47, 91, 75, 0.25)",
                "rgba(81, 88, 130, 0.25)",
              ][index],
              borderColor: ["#b3472f", "#2f5b4b", "#515882"][index],
              borderWidth: 1.5,
            })),
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                beginAtZero: true,
              },
            },
            plugins: {
              legend: {
                position: "bottom",
              },
              tooltip: {
                callbacks: {
                  footer(itemsTooltip) {
                    const first = itemsTooltip[0];
                    const row = items[first.datasetIndex];
                    return `Avg Rank: ${row.avgRank.toFixed(1)}`;
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

export default ModeComparisonRadarChart;

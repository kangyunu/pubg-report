import { Bar } from "react-chartjs-2";

type Row = {
  playerId: string;
  name: string;
  matches: number;
  avgKills: number;
  avgDamage: number;
  damageShare: number;
  killsShare: number;
};

const PlayerContributionBarChart = ({ rows }: { rows: Row[] }) => {
  const topRows = rows.slice(0, 8);

  return (
    <section className="panel chart-span-8">
      <h3 className="panel-title">Player Contribution (Damage/Kill Share)</h3>
      <div className="chart-area">
        <Bar
          data={{
            labels: topRows.map((row) => row.name),
            datasets: [
              {
                label: "Damage Share %",
                data: topRows.map((row) => Number(row.damageShare.toFixed(1))),
                backgroundColor: "rgba(179, 71, 47, 0.85)",
              },
              {
                label: "Kill Share %",
                data: topRows.map((row) => Number(row.killsShare.toFixed(1))),
                backgroundColor: "rgba(47, 91, 75, 0.8)",
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
                    const row = topRows[context.dataIndex];
                    return `Matches: ${row.matches}, Avg Dmg: ${row.avgDamage.toFixed(0)}, Avg Kills: ${row.avgKills.toFixed(2)}`;
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

export default PlayerContributionBarChart;

import { Pie } from "react-chartjs-2";

type Row = {
  playerId: string;
  name: string;
  matches: number;
  avgKills: number;
  avgDamage: number;
  damageShare: number;
  killsShare: number;
};

const PlayerContributionTable = ({ rows }: { rows: Row[] }) => {
  const pieRows = rows.slice(0, 6);

  return (
    <section className="panel chart-span-6">
      <h3 className="panel-title">Player Comparison</h3>
      <div className="chart-area contribution-pie-area">
        <Pie
          data={{
            labels: pieRows.map((row) => row.name),
            datasets: [
              {
                label: "Damage Share %",
                data: pieRows.map((row) => Number(row.damageShare.toFixed(1))),
                backgroundColor: [
                  "#b3472f",
                  "#2f5b4b",
                  "#515882",
                  "#b78b44",
                  "#4f7c8d",
                  "#7d5a99",
                ],
                borderColor: "#ffffff",
                borderWidth: 2,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  boxWidth: 12,
                  font: { size: 11 },
                },
              },
            },
          }}
        />
      </div>
      <div className="table-wrap">
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Player</th>
              <th>DMG%</th>
              <th>KILL%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <td>{row.name}</td>
                <td>{row.damageShare.toFixed(1)}</td>
                <td>{row.killsShare.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PlayerContributionTable;

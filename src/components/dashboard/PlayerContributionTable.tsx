import { Pie } from "react-chartjs-2";
import { getPlayerColor } from "../../lib/playerStyle";

type Row = {
  playerId: string;
  name: string;
  matches: number;
  totalDamage: number;
  avgKills: number;
  avgDamage: number;
  damageShare: number;
  killsShare: number;
};

const PlayerContributionTable = ({ rows }: { rows: Row[] }) => {
  const pieRows = rows.slice(0, 6);
  const formatFixed = (value: number, digits: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  const formatInt = (value: number) =>
    Math.round(value).toLocaleString("en-US");

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
                backgroundColor: pieRows.map((row) => getPlayerColor(row.name)),
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
              <th className="cell-right">AVG DMG</th>
              <th className="cell-right">TOTAL DMG</th>
              <th className="cell-right">DMG%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <td
                  style={{ color: getPlayerColor(row.name), fontWeight: 700 }}
                >
                  {row.name}
                </td>
                <td className="cell-right">{formatInt(row.avgDamage)}</td>
                <td className="cell-right">{formatInt(row.totalDamage)}</td>
                <td className="cell-right">
                  {formatFixed(row.damageShare, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PlayerContributionTable;

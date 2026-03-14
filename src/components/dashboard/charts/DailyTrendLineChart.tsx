import { Line } from "react-chartjs-2";
import type { DailyDamageTrend } from "../../../lib/metrics";
import { getPlayerColor } from "../../../lib/playerStyle";

type Props = {
  points: DailyDamageTrend;
  title?: string;
};

const DailyTrendLineChart = ({ points, title = "Daily Trend" }: Props) => {
  return (
    <section className="panel chart-span-8">
      <h3 className="panel-title">{title}</h3>
      <div className="chart-area">
        <Line
          data={{
            labels: points.days.map((day) => day.slice(5)),
            datasets: [
              ...points.players.map((player) => {
                const color = getPlayerColor(player.name);
                return {
                  label: player.name,
                  data: player.avgDamageByDay.map((value) =>
                    value === null ? null : Number(value.toFixed(0)),
                  ),
                  borderColor: color,
                  backgroundColor: "transparent",
                  fill: false,
                  spanGaps: true,
                  tension: 0.25,
                  pointRadius: 2,
                  borderWidth: 2,
                };
              }),
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
                    const count = points.matches[context.dataIndex] ?? 0;
                    return `Matches: ${count}`;
                  },
                },
              },
            },
            scales: {
              y: {
                type: "linear",
                position: "left",
              },
            },
          }}
        />
      </div>
    </section>
  );
};

export default DailyTrendLineChart;

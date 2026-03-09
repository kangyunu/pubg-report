import { Line } from "react-chartjs-2";
import type { DailyDamageTrend } from "../../../lib/metrics";

type Props = {
  points: DailyDamageTrend;
  title?: string;
};

const DailyTrendLineChart = ({ points, title = "Daily Trend" }: Props) => {
  const palette = [
    "#2f5b4b",
    "#515882",
    "#b78b44",
    "#4f7c8d",
    "#7d5a99",
    "#8b5a3c",
  ];

  return (
    <section className="panel chart-span-8">
      <h3 className="panel-title">{title}</h3>
      <div className="chart-area">
        <Line
          data={{
            labels: points.days.map((day) => day.slice(5)),
            datasets: [
              {
                label: "Team",
                data: points.teamAvgDamage.map((value) =>
                  Number(value.toFixed(0)),
                ),
                borderColor: "#b3472f",
                backgroundColor: "rgba(179, 71, 47, 0.18)",
                fill: true,
                tension: 0.3,
              },
              ...points.players.map((player, index) => ({
                label: player.name,
                data: player.avgDamageByDay.map((value) =>
                  value === null ? null : Number(value.toFixed(0)),
                ),
                borderColor: palette[index % palette.length],
                backgroundColor: "transparent",
                fill: false,
                spanGaps: true,
                tension: 0.25,
              })),
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

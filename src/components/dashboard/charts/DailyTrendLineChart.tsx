import { Line } from "react-chartjs-2";

type Point = {
  day: string;
  avgDamage: number;
  avgRank: number;
  matches: number;
};

type Props = {
  points: Point[];
  title?: string;
};

const DailyTrendLineChart = ({ points, title = "Daily Trend" }: Props) => {
  return (
    <section className="panel chart-span-8">
      <h3 className="panel-title">{title}</h3>
      <div className="chart-area">
        <Line
          data={{
            labels: points.map((point) => point.day.slice(5)),
            datasets: [
              {
                label: "Avg Damage",
                data: points.map((point) => Number(point.avgDamage.toFixed(0))),
                yAxisID: "yDamage",
                borderColor: "#b3472f",
                backgroundColor: "rgba(179, 71, 47, 0.18)",
                fill: true,
                tension: 0.3,
              },
              {
                label: "Avg Rank",
                data: points.map((point) => Number(point.avgRank.toFixed(1))),
                yAxisID: "yRank",
                borderColor: "#2f5b4b",
                tension: 0.3,
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
                    const row = points[context.dataIndex];
                    return `Matches: ${row.matches}`;
                  },
                },
              },
            },
            scales: {
              yDamage: {
                type: "linear",
                position: "left",
              },
              yRank: {
                type: "linear",
                position: "right",
                reverse: true,
                grid: { drawOnChartArea: false },
              },
            },
          }}
        />
      </div>
    </section>
  );
};

export default DailyTrendLineChart;

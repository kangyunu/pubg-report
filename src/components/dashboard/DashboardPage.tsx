import "../../lib/chartjs";
import { useEffect, useMemo, useState } from "react";
import useMatches from "../../hooks/useMatches";
import useDashboardMetrics from "../../hooks/useDashboardMetrics";
import { playerContributionRows, summarize } from "../../lib/metrics";
import DashboardHeader from "./DashboardHeader";
import KpiCards from "./KpiCards";
import DailyTrendLineChart from "./charts/DailyTrendLineChart";
import PlayerContributionTable from "./PlayerContributionTable";
import MatchTable from "./MatchTable";
import "./dashboard.css";

const ALL_DATES = "all";

const DashboardPage = () => {
  const { matches } = useMatches();

  const {
    focusPlayerId,
    teamTrend,
    contributionRows,
    teamRows,
    availableDates,
  } = useDashboardMetrics({ matches });

  const [selectedDate, setSelectedDate] = useState(ALL_DATES);

  useEffect(() => {
    if (availableDates.length === 0) {
      setSelectedDate(ALL_DATES);
      return;
    }

    if (selectedDate === ALL_DATES) {
      return;
    }

    if (!availableDates.includes(selectedDate)) {
      setSelectedDate(ALL_DATES);
    }
  }, [availableDates, selectedDate]);

  const selectedDateRows = useMemo(
    () =>
      selectedDate === ALL_DATES
        ? teamRows
        : teamRows.filter((row) => row.day === selectedDate),
    [selectedDate, teamRows],
  );

  const selectedDateSummary = useMemo(
    () => summarize(selectedDateRows),
    [selectedDateRows],
  );

  const selectedContributionRows = useMemo(() => {
    if (selectedDate === ALL_DATES) {
      return contributionRows;
    }

    const selectedMatches = matches.filter(
      (match) => match.createdAt.slice(0, 10) === selectedDate,
    );

    return playerContributionRows(selectedMatches, focusPlayerId, null);
  }, [contributionRows, focusPlayerId, matches, selectedDate]);

  const selectedDateKpis = useMemo(
    () => [
      {
        key: "date-matches",
        label: "Matches",
        value: selectedDateSummary.total.toString(),
      },
      {
        key: "date-rank",
        label: "Avg Rank",
        value: selectedDateSummary.avgRank.toFixed(1),
      },
      {
        key: "date-damage",
        label: "Avg Damage",
        value: selectedDateSummary.avgDamage.toFixed(0),
      },
      {
        key: "date-kills",
        label: "Avg Kills",
        value: selectedDateSummary.avgKills.toFixed(2),
      },
      {
        key: "date-top10",
        label: "Top10 Rate",
        value: `${selectedDateSummary.top10Rate.toFixed(1)}%`,
      },
      {
        key: "date-win",
        label: "Win Rate",
        value: `${selectedDateSummary.winRate.toFixed(1)}%`,
      },
    ],
    [selectedDateSummary],
  );

  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <div className="dashboard-grid">
        <DailyTrendLineChart points={teamTrend} title="Team Daily Trend" />

        <section className="panel panel-filter chart-span-12">
          <div className="section-filter-row">
            <h3 className="panel-title">Matches By Date</h3>
          </div>
          <select
            className="filter-control filter-control-emphasis"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          >
            <option value={ALL_DATES}>All Dates</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </section>

        <PlayerContributionTable rows={selectedContributionRows.slice(0, 10)} />

        <section className="panel chart-span-12">
          <h3 className="panel-title">Selected Date Team Stats</h3>
          <KpiCards kpis={selectedDateKpis} />
        </section>

        <MatchTable
          rows={selectedDateRows}
          title={
            selectedDate === ALL_DATES
              ? "Matches List (All Dates)"
              : `Matches List (${selectedDate})`
          }
        />
      </div>
    </main>
  );
};

export default DashboardPage;

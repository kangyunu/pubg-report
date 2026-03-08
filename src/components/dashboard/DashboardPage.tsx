import "../../lib/chartjs";
import { useEffect, useMemo, useState } from "react";
import useMatches from "../../hooks/useMatches";
import useDashboardMetrics from "../../hooks/useDashboardMetrics";
import {
  getScoreGrade,
  getTeamScore,
  playerContributionRows,
  summarize,
} from "../../lib/metrics";
import DashboardHeader from "./DashboardHeader";
import KpiCards from "./KpiCards";
import DailyTrendLineChart from "./charts/DailyTrendLineChart";
import PlayerContributionTable from "./PlayerContributionTable";
import MatchTable from "./MatchTable";
import "./dashboard.css";

const ALL_DATES = "all";
const formatInt = (value: number) => value.toLocaleString("en-US");
const formatFixed = (value: number, digits: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

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

  const selectedDateTeamScore = useMemo(
    () => getTeamScore(selectedDateRows),
    [selectedDateRows],
  );

  const selectedDateTeamGrade = useMemo(
    () => getScoreGrade(selectedDateTeamScore),
    [selectedDateTeamScore],
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
        key: "date-team-score",
        label: "TEAM SCORE",
        value: `${formatFixed(selectedDateTeamScore, 1)} ${selectedDateTeamGrade}`,
      },
      {
        key: "date-matches",
        label: "Matches",
        value: formatInt(selectedDateSummary.total),
      },
      {
        key: "date-rank",
        label: "Avg Rank",
        value: formatFixed(selectedDateSummary.avgRank, 1),
      },
      {
        key: "date-damage",
        label: "Avg Damage",
        value: formatInt(Math.round(selectedDateSummary.avgDamage)),
      },
      {
        key: "date-kills",
        label: "Avg Kills",
        value: formatFixed(selectedDateSummary.avgKills, 2),
      },
      {
        key: "date-top10",
        label: "Top10 Rate",
        value: `${formatFixed(selectedDateSummary.top10Rate, 1)}%`,
      },
      {
        key: "date-win",
        label: "Win Rate",
        value: `${formatFixed(selectedDateSummary.winRate, 1)}%`,
      },
    ],
    [selectedDateSummary, selectedDateTeamGrade, selectedDateTeamScore],
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

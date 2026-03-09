import { useMemo } from "react";
import {
  buildDailyDamageTrend,
  computeFocusPlayerId,
  playerContributionRows,
  toTeamRows,
} from "../lib/metrics";

type Params = {
  matches: Match[];
};

const useDashboardMetrics = ({ matches }: Params) => {
  return useMemo(() => {
    const focusPlayerId = computeFocusPlayerId(matches);
    const teamRows = toTeamRows(matches, focusPlayerId);

    const teamTrend = buildDailyDamageTrend(matches, focusPlayerId);
    const contributionRows = playerContributionRows(
      matches,
      focusPlayerId,
      null,
    );
    const availableDates = [...new Set(teamRows.map((row) => row.day))].sort(
      (a, b) => b.localeCompare(a),
    );

    return {
      focusPlayerId,
      teamTrend,
      contributionRows,
      teamRows,
      availableDates,
    };
  }, [matches]);
};

export default useDashboardMetrics;

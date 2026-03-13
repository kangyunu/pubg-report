import dayjs from "dayjs";

export type MatchRow = {
  id: string;
  createdAt: string;
  day: string;
  mode: "solo" | "duo" | "squad";
  mapName: string;
  teamRank: number;
  teamTotal: number;
  kills: number;
  damage: number;
  surviveSeconds: number;
};

export type PlayerContributionRow = {
  playerId: string;
  name: string;
  matches: number;
  totalDamage: number;
  avgKills: number;
  avgDamage: number;
  damageShare: number;
  killsShare: number;
  score: number;
};

export type DailyDamageTrend = {
  days: string[];
  teamAvgDamage: number[];
  matches: number[];
  players: Array<{
    playerId: string;
    name: string;
    avgDamageByDay: Array<number | null>;
  }>;
};

const SUPPORTED_MODES: Array<"solo" | "duo" | "squad"> = [
  "solo",
  "duo",
  "squad",
];

const asPercent = (value: number) => value * 100;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const avg = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const isTop10 = (row: MatchRow) => {
  const threshold = Math.max(1, Math.floor(row.teamTotal * 0.2));
  return row.teamRank <= threshold;
};

export const getMatchScore = (row: MatchRow) => {
  const normalizedRank =
    row.teamTotal <= 1 ? 1 : 1 - (row.teamRank - 1) / (row.teamTotal - 1);

  const rankScore = clamp(normalizedRank * 100, 0, 100);
  const damageScore = clamp((row.damage / 800) * 100, 0, 100);
  const killScore = clamp((row.kills / 8) * 100, 0, 100);
  const surviveScore = clamp((row.surviveSeconds / 1800) * 100, 0, 100);
  const winBonus = row.teamRank === 1 ? 100 : 0;

  const score =
    rankScore * 0.35 +
    damageScore * 0.3 +
    killScore * 0.2 +
    surviveScore * 0.1 +
    winBonus * 0.05;

  return clamp(score, 0, 100);
};

export const getTeamScore = (rows: MatchRow[]) => {
  if (rows.length === 0) {
    return 0;
  }

  return avg(rows.map(getMatchScore));
};

export const getScoreGrade = (score: number) => {
  if (score >= 90) {
    return "S";
  }
  if (score >= 80) {
    return "A";
  }
  if (score >= 70) {
    return "B";
  }
  if (score >= 60) {
    return "C";
  }
  return "D";
};

export const getPlayerScore = (row: {
  damageShare: number;
  killsShare: number;
  avgDamage: number;
  avgKills: number;
}) => {
  const damageShareScore = clamp(row.damageShare, 0, 100);
  const killsShareScore = clamp(row.killsShare, 0, 100);
  const avgDamageScore = clamp((row.avgDamage / 300) * 100, 0, 100);
  const avgKillsScore = clamp((row.avgKills / 3) * 100, 0, 100);

  return clamp(
    damageShareScore * 0.4 +
      killsShareScore * 0.3 +
      avgDamageScore * 0.2 +
      avgKillsScore * 0.1,
    0,
    100,
  );
};

export const computeFocusPlayerId = (matches: Match[]) => {
  const score = new Map<string, number>();

  matches.forEach((match) => {
    if (match.matchType !== "official") {
      return;
    }
    if (!SUPPORTED_MODES.includes(match.gameMode as "solo" | "duo" | "squad")) {
      return;
    }

    match.participants.forEach((participant) => {
      const count = score.get(participant.playerId) ?? 0;
      score.set(participant.playerId, count + 1);
    });
  });

  let bestPlayerId = "";
  let bestCount = 0;

  score.forEach((count, playerId) => {
    if (count > bestCount) {
      bestCount = count;
      bestPlayerId = playerId;
    }
  });

  return bestPlayerId;
};

const isSupportedOfficialMatch = (match: Match) => {
  if (match.matchType !== "official") {
    return false;
  }

  return SUPPORTED_MODES.includes(match.gameMode as "solo" | "duo" | "squad");
};

export const toPlayerRows = (
  matches: Match[],
  focusPlayerId: string,
): MatchRow[] => {
  const rows: MatchRow[] = [];

  matches.forEach((match) => {
    if (!isSupportedOfficialMatch(match)) {
      return;
    }

    const mode = match.gameMode as "solo" | "duo" | "squad";
    const participant =
      match.participants.find((item) => item.playerId === focusPlayerId) ??
      match.participants[0];

    if (!participant) {
      return;
    }

    rows.push({
      id: match.id,
      createdAt: match.createdAt,
      day: dayjs(match.createdAt).format("YYYY-MM-DD"),
      mode,
      mapName: match.mapName,
      teamRank: participant.teamRank,
      teamTotal: participant.teamTotal,
      kills: participant.kills,
      damage: participant.damageDealt,
      surviveSeconds: participant.timeSurvived,
    });
  });

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const toTeamRows = (
  matches: Match[],
  focusPlayerId: string,
): MatchRow[] => {
  const rows: MatchRow[] = [];

  matches.forEach((match) => {
    if (!isSupportedOfficialMatch(match)) {
      return;
    }

    const mode = match.gameMode as "solo" | "duo" | "squad";
    const focusParticipant =
      match.participants.find((item) => item.playerId === focusPlayerId) ??
      match.participants[0];

    if (!focusParticipant) {
      return;
    }

    const teamParticipants = match.participants.filter(
      (item) => item.teamId === focusParticipant.teamId,
    );

    if (teamParticipants.length === 0) {
      return;
    }

    rows.push({
      id: match.id,
      createdAt: match.createdAt,
      day: dayjs(match.createdAt).format("YYYY-MM-DD"),
      mode,
      mapName: match.mapName,
      teamRank: focusParticipant.teamRank,
      teamTotal: focusParticipant.teamTotal,
      kills: teamParticipants.reduce((sum, item) => sum + item.kills, 0),
      damage: teamParticipants.reduce((sum, item) => sum + item.damageDealt, 0),
      surviveSeconds: avg(teamParticipants.map((item) => item.timeSurvived)),
    });
  });

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const filterRows = (rows: MatchRow[], monthsBack: number | null) => {
  if (monthsBack === null) {
    return rows;
  }

  const cutoff = dayjs().startOf("day").subtract(monthsBack, "month");

  return rows.filter((row) => {
    const inPeriod =
      dayjs(row.createdAt).isAfter(cutoff) ||
      dayjs(row.createdAt).isSame(cutoff);
    return inPeriod;
  });
};

export const summarize = (rows: MatchRow[]) => {
  const total = rows.length;
  const avgRank = avg(rows.map((row) => row.teamRank));
  const avgDamage = avg(rows.map((row) => row.damage));
  const avgKills = avg(rows.map((row) => row.kills));
  const top10Rate = total === 0 ? 0 : rows.filter(isTop10).length / total;
  const winRate =
    total === 0 ? 0 : rows.filter((row) => row.teamRank === 1).length / total;

  return {
    total,
    avgRank,
    avgDamage,
    avgKills,
    top10Rate: asPercent(top10Rate),
    winRate: asPercent(winRate),
  };
};

export const dailySeries = (rows: MatchRow[]) => {
  const grouped = new Map<string, MatchRow[]>();

  rows.forEach((row) => {
    const current = grouped.get(row.day) ?? [];
    current.push(row);
    grouped.set(row.day, current);
  });

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayRows]) => ({
      day,
      avgDamage: avg(dayRows.map((row) => row.damage)),
      avgRank: avg(dayRows.map((row) => row.teamRank)),
      matches: dayRows.length,
    }));
};

export const buildDailyDamageTrend = (
  matches: Match[],
  focusPlayerId: string,
): DailyDamageTrend => {
  const teamRows = toTeamRows(matches, focusPlayerId);
  const groupedTeam = new Map<string, MatchRow[]>();

  teamRows.forEach((row) => {
    const current = groupedTeam.get(row.day) ?? [];
    current.push(row);
    groupedTeam.set(row.day, current);
  });

  const days = [...groupedTeam.keys()].sort((a, b) => a.localeCompare(b));

  const teamPerMatchAvgDamageByDay = new Map<string, number[]>();

  const matchesByDay = days.map((day) => (groupedTeam.get(day) ?? []).length);

  const perDayPlayerAgg = new Map<
    string,
    Map<
      string,
      {
        name: string;
        sumDamage: number;
        count: number;
      }
    >
  >();

  matches.forEach((match) => {
    if (!isSupportedOfficialMatch(match)) {
      return;
    }

    const focusParticipant =
      match.participants.find((item) => item.playerId === focusPlayerId) ??
      match.participants[0];

    if (!focusParticipant) {
      return;
    }

    const day = dayjs(match.createdAt).format("YYYY-MM-DD");
    const dayMap = perDayPlayerAgg.get(day) ?? new Map();

    const teamParticipants = match.participants.filter(
      (item) => item.teamId === focusParticipant.teamId,
    );

    const teamDamage = teamParticipants.reduce(
      (sum, participant) => sum + participant.damageDealt,
      0,
    );
    const teamPerMatchAvgDamage =
      teamParticipants.length === 0 ? 0 : teamDamage / teamParticipants.length;

    const dayDamages = teamPerMatchAvgDamageByDay.get(day) ?? [];
    dayDamages.push(teamPerMatchAvgDamage);
    teamPerMatchAvgDamageByDay.set(day, dayDamages);

    teamParticipants.forEach((participant) => {
      const prev = dayMap.get(participant.playerId) ?? {
        name: participant.name,
        sumDamage: 0,
        count: 0,
      };

      dayMap.set(participant.playerId, {
        name: participant.name,
        sumDamage: prev.sumDamage + participant.damageDealt,
        count: prev.count + 1,
      });
    });

    perDayPlayerAgg.set(day, dayMap);
  });

  const playerIds = new Set<string>();
  perDayPlayerAgg.forEach((dayMap) => {
    dayMap.forEach((_, playerId) => playerIds.add(playerId));
  });

  const teamAvgDamage = days.map((day) =>
    avg(teamPerMatchAvgDamageByDay.get(day) ?? []),
  );

  const players = [...playerIds]
    .map((playerId) => {
      const sample = [...perDayPlayerAgg.values()]
        .map((dayMap) => dayMap.get(playerId))
        .find(Boolean);

      const avgDamageByDay = days.map((day) => {
        const value = perDayPlayerAgg.get(day)?.get(playerId);
        if (!value || value.count === 0) {
          return null;
        }
        return value.sumDamage / value.count;
      });

      const presenceCount = avgDamageByDay.filter(
        (value) => value !== null,
      ).length;

      return {
        playerId,
        name: sample?.name ?? playerId,
        presenceCount,
        avgDamageByDay,
      };
    })
    .sort((a, b) => b.presenceCount - a.presenceCount)
    .map(({ playerId, name, avgDamageByDay }) => ({
      playerId,
      name,
      avgDamageByDay,
    }));

  return {
    days,
    teamAvgDamage,
    matches: matchesByDay,
    players,
  };
};

export const modeComparison = (rows: MatchRow[]) =>
  SUPPORTED_MODES.map((mode) => {
    const modeRows = rows.filter((row) => row.mode === mode);
    const summary = summarize(modeRows);
    const avgSurviveMinutes =
      avg(modeRows.map((row) => row.surviveSeconds)) / 60;

    return {
      mode,
      ...summary,
      avgSurviveMinutes,
    };
  });

export const playerContributionRows = (
  matches: Match[],
  focusPlayerId: string,
  monthsBack: number | null,
): PlayerContributionRow[] => {
  const cutoff =
    monthsBack === null
      ? null
      : dayjs().startOf("day").subtract(monthsBack, "month");

  const aggregate = new Map<
    string,
    {
      name: string;
      matches: number;
      kills: number;
      damage: number;
      teamKills: number;
      teamDamage: number;
    }
  >();

  matches.forEach((match) => {
    if (!isSupportedOfficialMatch(match)) {
      return;
    }

    if (
      cutoff &&
      dayjs(match.createdAt).isBefore(cutoff) &&
      !dayjs(match.createdAt).isSame(cutoff)
    ) {
      return;
    }

    const focusParticipant =
      match.participants.find((item) => item.playerId === focusPlayerId) ??
      match.participants[0];

    if (!focusParticipant) {
      return;
    }

    const teamParticipants = match.participants.filter(
      (item) => item.teamId === focusParticipant.teamId,
    );

    if (teamParticipants.length === 0) {
      return;
    }

    const teamKills = teamParticipants.reduce(
      (sum, item) => sum + item.kills,
      0,
    );
    const teamDamage = teamParticipants.reduce(
      (sum, item) => sum + item.damageDealt,
      0,
    );

    teamParticipants.forEach((participant) => {
      const prev = aggregate.get(participant.playerId) ?? {
        name: participant.name,
        matches: 0,
        kills: 0,
        damage: 0,
        teamKills: 0,
        teamDamage: 0,
      };

      aggregate.set(participant.playerId, {
        name: participant.name,
        matches: prev.matches + 1,
        kills: prev.kills + participant.kills,
        damage: prev.damage + participant.damageDealt,
        teamKills: prev.teamKills + teamKills,
        teamDamage: prev.teamDamage + teamDamage,
      });
    });
  });

  return [...aggregate.entries()]
    .map(([playerId, value]) => ({
      playerId,
      name: value.name,
      matches: value.matches,
      totalDamage: value.damage,
      avgKills: value.matches === 0 ? 0 : value.kills / value.matches,
      avgDamage: value.matches === 0 ? 0 : value.damage / value.matches,
      damageShare:
        value.teamDamage === 0 ? 0 : (value.damage / value.teamDamage) * 100,
      killsShare:
        value.teamKills === 0 ? 0 : (value.kills / value.teamKills) * 100,
      score: 0,
    }))
    .map((row) => ({
      ...row,
      score: getPlayerScore(row),
    }))
    .sort((a, b) => b.score - a.score);
};

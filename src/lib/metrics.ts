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
  avgKills: number;
  avgDamage: number;
  damageShare: number;
  killsShare: number;
};

const SUPPORTED_MODES: Array<"solo" | "duo" | "squad"> = [
  "solo",
  "duo",
  "squad",
];

const asPercent = (value: number) => value * 100;

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
      avgKills: value.matches === 0 ? 0 : value.kills / value.matches,
      avgDamage: value.matches === 0 ? 0 : value.damage / value.matches,
      damageShare:
        value.teamDamage === 0 ? 0 : (value.damage / value.teamDamage) * 100,
      killsShare:
        value.teamKills === 0 ? 0 : (value.kills / value.teamKills) * 100,
    }))
    .sort((a, b) => b.damageShare - a.damageShare);
};

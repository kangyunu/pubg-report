import dayjs from "dayjs";
import { LOG_ROOT_PATH } from "./const";

// PUBG API에서 매치 데이터 불러오기
/**
 * PUBG API에서 플레이어의 최근 매치 데이터를 불러온다.
 * @param playerName 플레이어 닉네임
 * @param platform steam | kakao
 * @param apiKey API 키 (기본값: process.env.PUBG_API_KEY)
 */
type FetchMatchesInput = {
  playerName: string;
  platform: "kakao" | "steam";
  players?: string[];
  stopLogId?: string | null;
  existingIds?: Set<string>;
  apiKey?: string;
};

type PubgPlayerLookupResponse = {
  data?: Array<{
    relationships?: {
      matches?: {
        data?: Array<{ id: string }>;
      };
    };
  }>;
};

type PubgMatchLookupResponse = {
  data?: {
    id: string;
    attributes: {
      createdAt: string;
      duration: number;
      matchType: string;
      gameMode: string;
      mapName: string;
      isCustomMatch: boolean;
      shardId: string;
    };
  };
  included?: PubgIncludedEntity[];
};

type PubgParticipantStats = {
  assists?: number;
  boosts?: number;
  damageDealt?: number;
  deathType?: string;
  DBNOs?: number;
  headshotKills?: number;
  heals?: number;
  killPlace?: number;
  killStreaks?: number;
  kills?: number;
  longestKill?: number;
  name?: string;
  playerId?: string;
  revives?: number;
  rideDistance?: number;
  roadKills?: number;
  swimDistance?: number;
  teamKills?: number;
  timeSurvived?: number;
  vehicleDestroys?: number;
  walkDistance?: number;
  weaponsAcquired?: number;
  winPlace?: number;
};

type PubgParticipantEntity = {
  type: "participant";
  id: string;
  attributes?: {
    actor?: string;
    shardId?: string;
    stats?: PubgParticipantStats;
  };
};

type PubgRosterEntity = {
  type: "roster";
  id: string;
  attributes?: {
    shardId?: string;
    stats?: {
      rank?: number;
      teamId?: number;
    };
  };
  relationships?: {
    participants?: {
      data?: Array<{ id: string }>;
    };
  };
};

type PubgIncludedEntity = PubgParticipantEntity | PubgRosterEntity;

const toParticipant = (
  entity: PubgParticipantEntity | undefined,
  teamId: number,
  rank: number,
  teamTotal: number,
  fallbackShard: string,
): Participant | null => {
  if (!entity) return null;
  const stats = entity.attributes?.stats;
  const name = stats?.name;
  const playerId = stats?.playerId;
  if (!name || !playerId) return null;

  return {
    id: entity.id,
    teamId,
    rank,
    teamTotal,
    shardId: entity.attributes?.shardId ?? fallbackShard,
    stats: {
      DBNOs: stats.DBNOs ?? 0,
      assists: stats.assists ?? 0,
      boosts: stats.boosts ?? 0,
      damageDealt: stats.damageDealt ?? 0,
      deathType: stats.deathType ?? "",
      headshotKills: stats.headshotKills ?? 0,
      heals: stats.heals ?? 0,
      killPlace: stats.killPlace ?? 0,
      killStreaks: stats.killStreaks ?? 0,
      kills: stats.kills ?? 0,
      longestKill: stats.longestKill ?? 0,
      name,
      playerId,
      revives: stats.revives ?? 0,
      rideDistance: stats.rideDistance ?? 0,
      roadKills: stats.roadKills ?? 0,
      swimDistance: stats.swimDistance ?? 0,
      teamKills: stats.teamKills ?? 0,
      timeSurvived: stats.timeSurvived ?? 0,
      vehicleDestroys: stats.vehicleDestroys ?? 0,
      walkDistance: stats.walkDistance ?? 0,
      weaponsAcquired: stats.weaponsAcquired ?? 0,
      winPlace: stats.winPlace ?? 0,
    },
  };
};

const parseMatchFromApiResponse = (
  response: PubgMatchLookupResponse,
  focusPlayerName: string,
): Match | null => {
  const root = response.data;
  if (!root) return null;

  const included = response.included ?? [];
  const participantById = new Map<string, PubgParticipantEntity>();
  const rosters: PubgRosterEntity[] = [];

  for (const item of included) {
    if (item.type === "participant") participantById.set(item.id, item);
    if (item.type === "roster") rosters.push(item);
  }

  if (rosters.length === 0) return null;

  const focusRoster = rosters.find((roster) => {
    const ids = roster.relationships?.participants?.data ?? [];
    return ids.some((entry) => {
      const participant = participantById.get(entry.id);
      return participant?.attributes?.stats?.name === focusPlayerName;
    });
  });

  if (!focusRoster) return null;

  const teamTotal = rosters.length;
  const teamId = focusRoster.attributes?.stats?.teamId ?? 0;
  const rank = focusRoster.attributes?.stats?.rank ?? teamTotal;
  const participantIds = focusRoster.relationships?.participants?.data ?? [];
  const participants = participantIds
    .map((entry) =>
      toParticipant(
        participantById.get(entry.id),
        teamId,
        rank,
        teamTotal,
        root.attributes.shardId,
      ),
    )
    .filter((item): item is Participant => item !== null);

  if (participants.length === 0) return null;

  return {
    id: root.id,
    createdAt: root.attributes.createdAt,
    duration: root.attributes.duration,
    matchType: root.attributes.matchType,
    gameMode: root.attributes.gameMode,
    mapName: root.attributes.mapName,
    isCustomMatch: root.attributes.isCustomMatch,
    shard: root.attributes.shardId,
    participants,
  };
};

export async function fetchMatchesFromPubgApi({
  playerName,
  platform,
  players,
  stopLogId,
  existingIds,
  apiKey,
}: FetchMatchesInput): Promise<Match[]> {
  // 환경변수 우선순위: 직접 전달 > process.env.PUBG_API_KEY > process.env.workflow
  const key = apiKey || process.env.PUBG_API_KEY || process.env.workflow;
  if (!key)
    throw new Error("PUBG_API_KEY 또는 workflow 환경변수가 필요합니다.");

  // 1. 플레이어 정보 조회 (매치 ID 포함)
  const playerUrl = `https://api.pubg.com/shards/${platform}/players?filter[playerNames]=${encodeURIComponent(playerName)}`;
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: "application/vnd.api+json",
  };
  const playerRes = await fetch(playerUrl, { headers });
  if (!playerRes.ok)
    throw new Error(`플레이어 정보 조회 실패: ${playerRes.status}`);
  const playerData = (await playerRes.json()) as PubgPlayerLookupResponse;
  const matchIds: string[] = Array.isArray(
    playerData?.data?.[0]?.relationships?.matches?.data,
  )
    ? playerData.data[0].relationships.matches.data.map(
        (m: { id: string }) => m.id,
      )
    : [];
  if (matchIds.length === 0) return [];

  // 2. 각 매치 ID로 상세 정보 개별 조회
  const matches: Match[] = [];
  const existing = existingIds ?? new Set<string>();
  const seen = new Set<string>();
  let metStopLogId = false;

  for (const id of matchIds) {
    if (stopLogId && id === stopLogId) {
      metStopLogId = true;
      break;
    }
    if (existing.has(id) || seen.has(id)) continue;

    const matchUrl = `https://api.pubg.com/shards/${platform}/matches/${id}`;
    const matchRes = await fetch(matchUrl, { headers });
    if (!matchRes.ok) continue;
    const matchData = (await matchRes.json()) as PubgMatchLookupResponse;

    const parsed = parseMatchFromApiResponse(matchData, playerName);
    if (!parsed) continue;
    seen.add(id);
    matches.push(parsed);
  }

  if (stopLogId && metStopLogId) {
    console.log(`ℹ️ 기존 저장 ID(${stopLogId})를 만나 증분 수집을 종료합니다.`);
  }

  if (players && players.length > 0) {
    return matches.filter((match) => matchFilter(match, players));
  }

  return matches;
}

const matchFilter = (match: Match, players: string[]) => {
  const { gameMode, matchType, participants } = match;

  if (matchType !== "official") return false;
  if (!gameMode.startsWith("squad") && !gameMode.startsWith("duo"))
    return false;
  return participants.every(({ stats }) => players.includes(stats.name));
};

type MatchWithLegacyLogId = Match & { log_id?: string };
type LegacyMatchWithLogId = LegacyMatch & { log_id?: string };

const isNewParticipant = (
  participant: Participant | LegacyParticipant,
): participant is Participant => "stats" in participant;

const normalizeParticipant = (
  participant: Participant | LegacyParticipant,
): Participant => {
  if (isNewParticipant(participant)) {
    return participant;
  }

  return {
    id: String(participant.id),
    teamId: participant.teamId,
    rank: participant.teamRank,
    teamTotal: participant.teamTotal,
    shardId: participant.shard,
    stats: {
      DBNOs: participant.dbnos,
      assists: participant.assists,
      boosts: participant.boosts,
      damageDealt: participant.damageDealt,
      deathType: participant.deathType,
      headshotKills: participant.headshotKills,
      heals: participant.heals,
      killPlace: participant.killPlace,
      killStreaks: participant.killStreaks,
      kills: participant.kills,
      longestKill: participant.longestKill,
      name: participant.name,
      playerId: participant.playerId,
      revives: participant.revives,
      rideDistance: participant.rideDistance,
      roadKills: participant.roadKills,
      swimDistance: participant.swimDistance,
      teamKills: participant.teamKills,
      timeSurvived: participant.timeSurvived,
      vehicleDestroys: participant.vehicleDestroys,
      walkDistance: participant.walkDistance,
      weaponsAcquired: participant.weaponsAcquired,
      winPlace: participant.winPlace,
    },
  };
};

const normalizeStoredMatch = (
  match: MatchWithLegacyLogId | LegacyMatchWithLogId,
): MatchWithLegacyLogId => ({
  id: match.id,
  createdAt: match.createdAt,
  duration: match.duration,
  matchType: match.matchType,
  gameMode: match.gameMode,
  mapName: match.mapName,
  isCustomMatch: match.isCustomMatch,
  shard: match.shard,
  participants: match.participants.map(normalizeParticipant),
  log_id: match.log_id,
});

type CrawlingInput = {
  platform: "kakao" | "steam";
  players: string[];
};

const getMatchId = (match: MatchWithLegacyLogId): string | null => {
  const fallback = match.log_id;
  const value = match.id ?? fallback;
  return typeof value === "string" && value.length > 0 ? value : null;
};

type ExistingState = {
  matchesByDate: Map<string, Match[]>;
  existingIds: Set<string>;
  latestStoredId: string | null;
};

const loadExistingState = async (): Promise<ExistingState> => {
  const matchesByDate = new Map<string, Match[]>();
  const existingIds = new Set<string>();
  let latestStoredId: string | null = null;
  let latestCreatedAt = "";

  const filesRef = Bun.file(`${LOG_ROOT_PATH}/files.json`);
  if (!(await filesRef.exists())) {
    return { matchesByDate, existingIds, latestStoredId };
  }

  let files: string[];
  try {
    files = (await filesRef.json()) as string[];
  } catch {
    return { matchesByDate, existingIds, latestStoredId };
  }

  for (const fileRef of files) {
    const filename = fileRef.split("/").pop();
    if (!filename) continue;

    const date = filename.replace(".json", "");
    const path = `${LOG_ROOT_PATH}/${filename}`;
    const file = Bun.file(path);
    if (!(await file.exists())) continue;

    let matches: MatchWithLegacyLogId[];
    try {
      const parsed = (await file.json()) as Array<
        MatchWithLegacyLogId | LegacyMatchWithLogId
      >;
      matches = parsed.map(normalizeStoredMatch);
    } catch {
      continue;
    }

    matchesByDate.set(date, matches);

    for (const match of matches) {
      const id = getMatchId(match);
      if (id) existingIds.add(id);

      if (match.createdAt > latestCreatedAt) {
        latestCreatedAt = match.createdAt;
        latestStoredId = id;
      }
    }
  }

  return { matchesByDate, existingIds, latestStoredId };
};

export const getLatestStoredLogId = async (): Promise<string | null> => {
  const { latestStoredId } = await loadExistingState();
  return latestStoredId;
};

export const getLatestLogIdFromFilesIndex = async (
  filesIndexUrl: string,
): Promise<string | null> => {
  try {
    const filesRes = await fetch(filesIndexUrl);
    if (!filesRes.ok) return null;

    const files = (await filesRes.json()) as string[];
    if (!Array.isArray(files) || files.length === 0) return null;

    for (const fileRef of files) {
      const matchUrl = new URL(fileRef, filesIndexUrl).toString();
      const matchRes = await fetch(matchUrl);
      if (!matchRes.ok) continue;

      const matches = (await matchRes.json()) as Match[];
      if (!Array.isArray(matches) || matches.length === 0) continue;

      const sorted = [...matches].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );

      const latest = sorted.find((match) => !!getMatchId(match));
      if (!latest) continue;

      return getMatchId(latest);
    }

    return null;
  } catch {
    return null;
  }
};

export const crawling = async (
  { platform, players }: CrawlingInput,
  latestLogId: string | null = null,
) => {
  const { matchesByDate, existingIds, latestStoredId } =
    await loadExistingState();
  const stopLogId = latestLogId ?? latestStoredId;

  if (stopLogId) {
    console.log(`ℹ️ 최신 저장 ID 기준으로 증분 수집: ${stopLogId}`);
  } else {
    console.log(
      "ℹ️ 기존 저장 데이터가 없어 전체 구간에서 신규 매치를 탐색합니다.",
    );
  }

  const primaryPlayer = players[0];
  if (!primaryPlayer) {
    throw new Error("최소 1명의 플레이어 닉네임이 필요합니다.");
  }

  const filteredMatches = await fetchMatchesFromPubgApi({
    playerName: primaryPlayer,
    platform,
    players,
    stopLogId,
    existingIds,
  });

  for (const match of filteredMatches) {
    const date = dayjs(match.createdAt).format("YYYY-MM-DD");
    const bucket = matchesByDate.get(date) ?? [];
    bucket.push(match);
    matchesByDate.set(date, bucket);
  }

  for (const [date, matches] of matchesByDate.entries()) {
    matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const deduped: Match[] = [];
    const seen = new Set<string>();

    for (const match of matches) {
      const id = getMatchId(match);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      deduped.push(match);
    }

    matchesByDate.set(date, deduped);
  }

  const sortedDates = Array.from(matchesByDate.keys()).sort((a, b) =>
    b.localeCompare(a),
  );

  const writes = sortedDates.map((date) => {
    const matches = matchesByDate.get(date) ?? [];
    const filename = `${LOG_ROOT_PATH}/${date}.json`;
    return Bun.write(filename, JSON.stringify(matches, null, 2), {
      createPath: true,
    });
  });

  await Promise.all(writes);

  const files = sortedDates.map((date) => `matches/${date}.json`);
  await Bun.write(
    `${LOG_ROOT_PATH}/files.json`,
    JSON.stringify(files, null, 2),
    {
      createPath: true,
    },
  );

  console.log(`\n✅ 신규 매치 수: ${filteredMatches.length}`);
};

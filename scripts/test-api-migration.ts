import { LOG_ROOT_PATH } from "./const";
import { crawling, getLatestStoredLogId } from "./functions";

type DatedMatch = {
  date: string;
  match: Match;
};

const PLAYERS = ["rkdqudtjs", "JJuliring", "chuchui12_"] as const;
const PLATFORM = "kakao" as const;
const BACKUP_FILE_PATH = `${LOG_ROOT_PATH}/backup-recent-5.json`;

const loadMatchesByDate = async (): Promise<Map<string, Match[]>> => {
  const filesRef = Bun.file(`${LOG_ROOT_PATH}/files.json`);
  if (!(await filesRef.exists())) {
    throw new Error("files.json이 없어 테스트를 시작할 수 없습니다.");
  }

  const files = (await filesRef.json()) as string[];
  const byDate = new Map<string, Match[]>();

  for (const fileRef of files) {
    const filename = fileRef.split("/").pop();
    if (!filename) continue;
    const date = filename.replace(".json", "");
    const path = `${LOG_ROOT_PATH}/${filename}`;
    const file = Bun.file(path);
    if (!(await file.exists())) continue;
    const matches = (await file.json()) as Match[];
    byDate.set(date, matches);
  }

  return byDate;
};

const toSortedMatches = (byDate: Map<string, Match[]>): DatedMatch[] => {
  const all: DatedMatch[] = [];
  byDate.forEach((matches, date) => {
    matches.forEach((match) => all.push({ date, match }));
  });
  all.sort((a, b) => b.match.createdAt.localeCompare(a.match.createdAt));
  return all;
};

const saveMatchesByDate = async (byDate: Map<string, Match[]>) => {
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
  await Promise.all(
    sortedDates.map((date) => {
      const matches = byDate.get(date) ?? [];
      return Bun.write(
        `${LOG_ROOT_PATH}/${date}.json`,
        JSON.stringify(matches, null, 2),
        { createPath: true },
      );
    }),
  );

  const files = sortedDates.map((date) => `matches/${date}.json`);
  await Bun.write(`${LOG_ROOT_PATH}/files.json`, JSON.stringify(files, null, 2), {
    createPath: true,
  });
};

const normalizeParticipants = (participants: Array<Participant | LegacyParticipant>) =>
  [...participants]
    .map((item) => {
      if ("stats" in item) {
        return {
          id: item.id,
          playerId: item.stats.playerId,
          name: item.stats.name,
          rank: item.rank,
          teamTotal: item.teamTotal,
          teamId: item.teamId,
          kills: item.stats.kills,
          assists: item.stats.assists,
          dbnos: item.stats.DBNOs,
          damageDealt: item.stats.damageDealt,
          timeSurvived: item.stats.timeSurvived,
          winPlace: item.stats.winPlace,
          deathType: item.stats.deathType,
        };
      }

      return {
        id: String(item.id),
        playerId: item.playerId,
        name: item.name,
        rank: item.teamRank,
        teamTotal: item.teamTotal,
        teamId: item.teamId,
        kills: item.kills,
        assists: item.assists,
        dbnos: item.dbnos,
        damageDealt: item.damageDealt,
        timeSurvived: item.timeSurvived,
        winPlace: item.winPlace,
        deathType: item.deathType,
      };
    })
    .sort((a, b) => a.playerId.localeCompare(b.playerId));

const compareMatchCore = (a: Match, b: Match) => {
  const sameCore =
    a.id === b.id &&
    a.createdAt === b.createdAt &&
    a.duration === b.duration &&
    a.matchType === b.matchType &&
    a.gameMode === b.gameMode &&
    a.mapName === b.mapName &&
    a.isCustomMatch === b.isCustomMatch &&
    a.shard === b.shard;

  const sameParticipants =
    JSON.stringify(normalizeParticipants(a.participants)) ===
    JSON.stringify(normalizeParticipants(b.participants));

  return sameCore && sameParticipants;
};

const main = async () => {
  const beforeByDate = await loadMatchesByDate();
  const beforeSorted = toSortedMatches(beforeByDate);
  const recentFive = beforeSorted.slice(0, 5);

  if (recentFive.length < 5) {
    throw new Error("최근 매치가 5개 미만이라 테스트를 진행할 수 없습니다.");
  }

  await Bun.write(
    BACKUP_FILE_PATH,
    JSON.stringify(recentFive.map((item) => item.match), null, 2),
    { createPath: true },
  );
  console.log(`✔ 최근 5개 백업 완료: ${BACKUP_FILE_PATH}`);

  const removedIds = new Set(recentFive.map((item) => item.match.id));
  const mutatedByDate = new Map<string, Match[]>();
  beforeByDate.forEach((matches, date) => {
    const remained = matches.filter((match) => !removedIds.has(match.id));
    if (remained.length > 0) mutatedByDate.set(date, remained);
  });
  await saveMatchesByDate(mutatedByDate);
  console.log(`✔ 최근 5개 삭제 완료: ${Array.from(removedIds).join(", ")}`);

  const stopLogId = await getLatestStoredLogId();
  if (!stopLogId) {
    throw new Error("삭제 후 stopLogId를 찾지 못했습니다.");
  }
  console.log(`ℹ️ 증분 수집 stop ID: ${stopLogId}`);

  await crawling(
    {
      platform: PLATFORM,
      players: [...PLAYERS],
    },
    stopLogId,
  );

  const afterByDate = await loadMatchesByDate();
  const afterSorted = toSortedMatches(afterByDate);
  const afterTopFive = afterSorted.slice(0, 5).map((item) => item.match);

  const expectedTopIds = recentFive.map((item) => item.match.id);
  const actualTopIds = afterTopFive.map((item) => item.id);
  const idOrderMatched =
    JSON.stringify(expectedTopIds) === JSON.stringify(actualTopIds);

  const afterById = new Map(afterSorted.map((item) => [item.match.id, item.match]));
  const detailMismatches: string[] = [];
  for (const backup of recentFive.map((item) => item.match)) {
    const recollected = afterById.get(backup.id);
    if (!recollected) {
      detailMismatches.push(`${backup.id}: 미수집`);
      continue;
    }
    if (!compareMatchCore(backup, recollected)) {
      detailMismatches.push(`${backup.id}: 상세 데이터 불일치`);
    }
  }

  console.log(`\n비교 결과`);
  console.log(`- 상위 5개 ID/순서 일치: ${idOrderMatched ? "YES" : "NO"}`);
  console.log(`- 상세 데이터 일치 건수: ${5 - detailMismatches.length}/5`);
  if (detailMismatches.length > 0) {
    console.log(`- 불일치 목록: ${detailMismatches.join(" | ")}`);
    process.exitCode = 1;
    return;
  }

  if (!idOrderMatched) {
    process.exitCode = 1;
    return;
  }

  console.log("✅ API 전환 증분수집 테스트 통과");
};

await main();

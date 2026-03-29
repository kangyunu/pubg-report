import {
  crawling,
  getLatestLogIdFromFilesIndex,
  getLatestStoredLogId,
} from "./functions";

const input = {
  platform: "kakao" as const,
  players: ["rkdqudtjs", "JJuliring", "chuchui12_"],
};

const PUBLISHED_FILES_INDEX_URL =
  "https://kangyunu.github.io/pubg-report/matches/files.json";

const latestPublishedLogId = await getLatestLogIdFromFilesIndex(
  PUBLISHED_FILES_INDEX_URL,
);
const latestStoredLogId = await getLatestStoredLogId();
const latestLogId = latestPublishedLogId ?? latestStoredLogId;

if (latestPublishedLogId) {
  console.log(`ℹ️ 원격 기준 마지막 로그 ID: ${latestPublishedLogId}`);
} else if (latestStoredLogId) {
  console.log(`ℹ️ 로컬 기준 마지막 로그 ID: ${latestStoredLogId}`);
}

if (!latestLogId) {
  console.log(
    "ℹ️ 마지막 저장 로그 ID가 없어 전체 신규 탐색 모드로 실행합니다.",
  );
} else {
  console.log(`ℹ️ 이번 실행 stop ID: ${latestLogId}`);
}

await crawling(input, latestLogId);

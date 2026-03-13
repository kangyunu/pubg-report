import dayjs from "dayjs";
import { chromium, type Response } from "playwright";
import { LOG_ROOT_PATH } from "./const";

const matchFilter = (match: Match, players: string[]) => {
  const { gameMode, matchType, participants } = match;

  if (matchType !== "official") return false;
  if (gameMode !== "squad" && gameMode !== "duo") return false;
  return participants.every(({ name }) => players.includes(name));
};

type CrawlingInput = {
  season: string;
  platform: "kakao" | "steam";
  players: string[];
};

const getMatchId = (match: Match): string | null => {
  const fallback = (match as unknown as { log_id?: unknown }).log_id;
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

    let matches: Match[];
    try {
      matches = (await file.json()) as Match[];
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

export const renewBeforeCrawling = async ({
  season,
  platform,
  players,
}: CrawlingInput) => {
  const url = `https://dak.gg/pubg/profile/${platform}/${players[0]}/${season}/matches/1`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const renewButton = page.getByRole("button", {
      name: /renew|전적\s*갱신/i,
    });
    if ((await renewButton.count()) === 0) {
      console.log("ℹ️ Renew 버튼을 찾지 못해 renew 단계를 건너뜁니다.");
      return;
    }

    const responsePromise = page.waitForResponse(
      (response: Response) =>
        response.url().includes("pubg0.dakgg.io/api/v1/players") &&
        response.url().includes("matches"),
      { timeout: 60000 },
    );

    await renewButton.first().click();
    await responsePromise;
    console.log("✔ Renew 완료");
  } catch {
    console.log("ℹ️ Renew 단계 실패. 크롤링은 계속 진행합니다.");
  } finally {
    await page.close();
    await browser.close();
  }
};

export const crawling = async (
  { season, platform, players }: CrawlingInput,
  latestLogId: string | null = null,
) => {
  const url = `https://dak.gg/pubg/profile/${platform}/${players[0]}/${season}/matches/`;
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

  const browser = await chromium.launch({ headless: true });

  const accumulatedRawMatches: Match[] = [];
  const seenNewIds = new Set<string>();
  let pageNumber = 1;

  while (true) {
    console.log(`\n📄 Page ${pageNumber}`);

    const page = await browser.newPage();

    const responsePromise = page.waitForResponse(
      (response: Response) =>
        response.url().includes("pubg0.dakgg.io/api/v1/players") &&
        response.url().includes("matches"),
      { timeout: 60000 },
    );

    await page.goto(url + pageNumber, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    let response: Response;

    try {
      response = await responsePromise;
    } catch {
      console.log("🚫 API 응답 못받음. 종료.");
      await page.close();
      break;
    }

    const json: { matches: Match[] } = await response.json();

    if (!json || !json.matches || json.matches.length === 0) {
      console.log("🚫 matches 없음. 종료.");
      await page.close();
      break;
    }

    let appendedCount = 0;
    let metExistingId = false;

    for (const match of json.matches) {
      const id = getMatchId(match);
      if (!id) continue;

      if (stopLogId && id === stopLogId) {
        metExistingId = true;
        continue;
      }

      if (existingIds.has(id)) {
        continue;
      }

      if (seenNewIds.has(id)) continue;

      seenNewIds.add(id);
      accumulatedRawMatches.push(match);
      appendedCount++;
    }

    console.log(
      `✔ 페이지 응답 ${json.matches.length}건, 신규 ${appendedCount}건`,
    );

    await page.close();

    if (metExistingId) {
      console.log("ℹ️ 기존 저장 ID를 만나 증분 수집을 종료합니다.");
      break;
    }

    pageNumber++;
  }

  await browser.close();

  const filteredMatches = accumulatedRawMatches.filter((match) =>
    matchFilter(match, players),
  );

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

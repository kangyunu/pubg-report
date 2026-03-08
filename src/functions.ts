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
export const crawling = async ({
  season,
  platform,
  players,
}: CrawlingInput) => {
  const url = `https://dak.gg/pubg/profile/${platform}/${players[0]}/${season}/matches/`;

  const browser = await chromium.launch({ headless: true });

  const accmulatedRawMatches: Match[] = [];
  const matchMap = new Map<string, Match[]>();
  let pageNumber = 1;
  let keepGoing = true;

  while (keepGoing) {
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
    } catch (e) {
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

    console.log(`✔ ${json.matches.length} matches 수집`);

    accmulatedRawMatches.push(...json.matches);

    await page.close();
    pageNumber++;
  }

  await browser.close();

  const filteredMatches = accmulatedRawMatches
    .filter((match) => matchFilter(match, players))
    .map((match) => {
      const mapKey = dayjs(match.createdAt).format("YYYY-MM-DD");
      if (matchMap.has(mapKey)) {
        matchMap.get(mapKey)?.push(match);
      } else {
        matchMap.set(mapKey, [match]);
      }
    });

  const writes = Array.from(matchMap.entries()).map(([date, matches]) => {
    const filename = `${LOG_ROOT_PATH}/${date}.json`;
    return Bun.write(filename, JSON.stringify(matches, null, 2), {
      createPath: true,
    });
  });

  await Promise.all(writes);

  const files = Array.from(matchMap.keys()).map(
    (date) => `matches/${date}.json`,
  );
  await Bun.write(
    `${LOG_ROOT_PATH}/files.json`,
    JSON.stringify(files, null, 2),
    {
      createPath: true,
    },
  );

  console.log(`\n✅ 총 매치 수: ${filteredMatches.length}`);
};

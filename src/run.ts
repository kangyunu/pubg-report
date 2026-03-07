import { crawling } from "./functions";

const season = Bun.argv.at(-1);

await crawling({
  season: season || "pc-2018-40",
  platform: "kakao",
  players: ["rkdqudtjs", "JJuliring", "chuchui12_"],
});

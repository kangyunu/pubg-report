import { parseArgs } from "util";
import { crawling, renewBeforeCrawling as renew } from "./functions";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    season: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: true,
});

const input = {
  season: values.season || "pc-2018-40",
  platform: "kakao" as const,
  players: ["rkdqudtjs", "JJuliring", "chuchui12_"],
};

await renew(input);
await crawling(input);

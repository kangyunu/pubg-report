import { parseArgs } from "util";
import { crawling } from "./functions";

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

await crawling({
  season: values.season || "pc-2018-40",
  platform: "kakao",
  players: ["rkdqudtjs", "JJuliring", "chuchui12_"],
});

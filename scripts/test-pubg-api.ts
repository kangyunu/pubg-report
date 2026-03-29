import { fetchMatchesFromPubgApi } from "./functions";

async function test() {
  try {
    const matches = await fetchMatchesFromPubgApi({
      playerName: "rkdqudtjs", // 테스트용 닉네임
      platform: "kakao",
    });
    console.log("매치 개수:", matches.length);
    if (matches.length > 0) {
      console.log("첫 매치 샘플:", matches[0]);
    }
  } catch (e) {
    console.error("에러 발생:", e);
  }
}

test();

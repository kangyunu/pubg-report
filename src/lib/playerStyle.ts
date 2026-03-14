const PLAYER_COLOR_MAP: Record<string, string> = {
  rkdqudtjs: "#b3472f",
  chuchui12_: "#2f5b4b",
  JJuliring: "#515882",
};

const FALLBACK_COLORS = ["#b78b44", "#4f7c8d", "#7d5a99", "#8b5a3c"];

export const getPlayerColor = (name: string) => {
  const exact = PLAYER_COLOR_MAP[name];
  if (exact) {
    return exact;
  }

  // Stable fallback color for unknown players.
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }

  const index = Math.abs(hash) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[index];
};

const MAP_NAME_KO: Record<string, string> = {
  Savage: "사녹",
  Tiger: "태이고",
  Chimera: "파라모",
  Erangel: "에란겔",
  Desert: "미라마",
  DihorOtok: "비켄디",
  Baltic: "비켄디",
  Summerland: "카라킨",
  Heaven: "헤이븐",
  Kiki: "데스턴",
  Neon: "론도",
};

export const formatMapNameKo = (mapName: string) => {
  const normalized = mapName.replace("_Main", "");
  return MAP_NAME_KO[normalized] ?? normalized;
};

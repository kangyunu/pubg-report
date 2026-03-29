import { useQuery } from "@tanstack/react-query";
import { normalizeMatch } from "../lib/normalizeMatch";

const useMatches = () => {
  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const host = "https://kangyunu.github.io/pubg-report";
      const files = await fetch(`${host}/matches/files.json`);
      if (!files.ok) {
        throw new Error("Failed to fetch matches files");
      }
      const fileNames: string[] = await files.json();

      const matchChunks = await Promise.all(
        fileNames.map(async (fileName) => {
          const res = await fetch(`${host}/${fileName}`);
          if (!res.ok) {
            console.warn(`Failed to fetch ${fileName}, skipping.`);
            return [] as Match[];
          }
          const data = (await res.json()) as Array<Match | LegacyMatch>;
          return data.map(normalizeMatch);
        }),
      );

      return matchChunks.flat();
    },
  });

  return { matches };
};

export default useMatches;

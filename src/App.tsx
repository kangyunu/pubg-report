import { useQuery } from "@tanstack/react-query";

const App = () => {
  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const host = "https://kangyunu.github.io/pubg-report";
      const files = await fetch(`${host}/matches/files.json`);
      if (!files.ok) {
        throw new Error("Failed to fetch matches files");
      }
      const fileNames: string[] = await files.json();

      const allMatches: Match[] = [];
      for (const fileName of fileNames) {
        const res = await fetch(`${host}/${fileName}`);
        if (!res.ok) {
          console.warn(`Failed to fetch ${fileName}, skipping.`);
          continue;
        }
        const matches: Match[] = await res.json();
        allMatches.push(...matches);
      }
      return allMatches;
    },
  });

  return <pre>{JSON.stringify(matches, null, 2)}</pre>;
};

export default App;

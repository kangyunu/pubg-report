import { useQuery } from "@tanstack/react-query";
import RootProvider from "./components/providers/RootProvider";

const App = () => {
  const { data: matches } = useQuery({
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
        const res = await fetch(`${host}/matches/${fileName}`);
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

  return (
    <RootProvider>
      <pre>{JSON.stringify(matches, null, 2)}</pre>{" "}
    </RootProvider>
  );
};

export default App;

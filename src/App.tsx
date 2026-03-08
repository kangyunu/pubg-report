import useMatches from "./hooks/useMatches";

const App = () => {
  const { matches } = useMatches();

  return <pre>{JSON.stringify(matches, null, 2)}</pre>;
};

export default App;

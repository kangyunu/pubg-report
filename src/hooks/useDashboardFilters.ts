import { useMemo, useState } from "react";

export type PeriodFilter = "all" | "6m" | "3m" | "1m";

const useDashboardFilters = () => {
  const [period, setPeriod] = useState<PeriodFilter>("all");

  const monthsBack = useMemo<number | null>(() => {
    if (period === "all") {
      return null;
    }

    if (period === "6m") {
      return 6;
    }

    if (period === "3m") {
      return 3;
    }

    return 1;
  }, [period]);

  return { period, setPeriod, monthsBack };
};

export default useDashboardFilters;

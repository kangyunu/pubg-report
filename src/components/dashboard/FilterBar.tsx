import type { PeriodFilter } from "../../hooks/useDashboardFilters";

type Props = {
  period: PeriodFilter;
  onPeriodChange: (value: PeriodFilter) => void;
};

const FilterBar = ({ period, onPeriodChange }: Props) => {
  return (
    <section className="panel chart-span-12">
      <div className="filter-bar">
        <label>
          <select
            className="filter-control"
            value={period}
            onChange={(event) =>
              onPeriodChange(event.target.value as PeriodFilter)
            }
          >
            <option value="all">All Time</option>
            <option value="6m">Last 6 months</option>
            <option value="3m">Last 3 months</option>
            <option value="1m">Last 1 month</option>
          </select>
        </label>
      </div>
    </section>
  );
};

export default FilterBar;

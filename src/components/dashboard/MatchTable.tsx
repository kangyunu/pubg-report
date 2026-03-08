import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMapNameKo } from "../../lib/mapName";

type Row = {
  id: string;
  createdAt: string;
  mode: "solo" | "duo" | "squad";
  mapName: string;
  teamRank: number;
  teamTotal: number;
  kills: number;
  damage: number;
  surviveSeconds: number;
};

type Props = {
  rows: Row[];
  title?: string;
};

const PAGE_SIZE = 20;

const MatchTable = ({ rows, title = "Latest Matches" }: Props) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [rows]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) {
          return;
        }

        setVisibleCount((prev) => {
          if (prev >= rows.length) {
            return prev;
          }
          return Math.min(prev + PAGE_SIZE, rows.length);
        });
      },
      { rootMargin: "180px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [rows.length]);

  const visibleRows = useMemo(
    () => rows.slice(0, visibleCount),
    [rows, visibleCount],
  );

  return (
    <section className="panel chart-span-12">
      <h3 className="panel-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="filter-note">No matches on the selected date.</p>
      ) : null}
      <div className="match-list">
        {visibleRows.map((row) => {
          const mapLabel = formatMapNameKo(row.mapName);

          return (
            <article className="match-card" key={row.id}>
              <div className="match-head">
                <strong>{dayjs(row.createdAt).format("MM-DD HH:mm")}</strong>
                <span>{row.mode.toUpperCase()}</span>
              </div>
              <div className="match-stats">
                <span className="badge-map">{mapLabel}</span>
                <span>
                  Rank {row.teamRank}/{row.teamTotal}
                </span>
                <span>KILL {row.kills}</span>
                <span>DAMAGE {row.damage.toFixed(0)}</span>
                <span>TIME {Math.round(row.surviveSeconds / 60)}m</span>
              </div>
            </article>
          );
        })}
      </div>
      {rows.length > 0 ? (
        <div className="match-list-sentinel" ref={loadMoreRef} />
      ) : null}
      {visibleCount < rows.length ? (
        <p className="filter-note">Loading more matches...</p>
      ) : null}
    </section>
  );
};

export default MatchTable;

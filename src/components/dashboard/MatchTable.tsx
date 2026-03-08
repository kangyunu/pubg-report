import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMapNameKo } from "../../lib/mapName";
import { getMatchScore, getScoreGrade } from "../../lib/metrics";

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

const formatInt = (value: number) => value.toLocaleString("en-US");
const formatFixed = (value: number, digits: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

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
      <div className="table-wrap">
        <table className="table table-compact matches-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th className="cell-center">MODE</th>
              <th>MAP</th>
              <th className="cell-right">SCORE</th>
              <th className="cell-center">RANK</th>
              <th className="cell-right">KILL</th>
              <th className="cell-right">DAMAGE</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const mapLabel = formatMapNameKo(row.mapName);
              const matchScore = getMatchScore(row);
              const matchGrade = getScoreGrade(matchScore);
              const isGradeS = matchGrade === "S";
              const isGradeA = matchGrade === "A";
              const isTop1 = row.teamRank === 1;
              const isTop5 = row.teamRank <= 5;
              const isDamage800 = row.damage >= 800;
              const isDamage1k = row.damage >= 1000;

              return (
                <tr className={isTop1 ? "top1-row" : undefined} key={row.id}>
                  <td>{dayjs(row.createdAt).format("MM-DD HH:mm")}</td>
                  <td className="cell-center">{row.mode.toUpperCase()}</td>
                  <td>{mapLabel}</td>
                  <td className="cell-right">
                    <span
                      className={`score-mark ${isGradeS ? "score-s" : isGradeA ? "score-a" : ""}`}
                    >
                      {`${formatFixed(matchScore, 1)} ${matchGrade}`}
                    </span>
                  </td>
                  <td className="cell-center">
                    <span
                      className={`rank-mark ${isTop1 ? "rank-top1" : isTop5 ? "rank-top5" : ""}`}
                    >
                      {`${formatInt(row.teamRank)}/${formatInt(row.teamTotal)}`}
                    </span>
                  </td>
                  <td className="cell-right">{formatInt(row.kills)}</td>
                  <td className="cell-right">
                    <span
                      className={
                        isDamage1k
                          ? "damage-1k"
                          : isDamage800
                            ? "damage-800"
                            : undefined
                      }
                    >
                      {formatInt(Math.round(row.damage))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

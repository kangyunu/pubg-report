import dayjs from "dayjs";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { formatMapNameKo } from "../../lib/mapName";
import { getMatchScore, getScoreGrade } from "../../lib/metrics";
import { getPlayerColor } from "../../lib/playerStyle";

type Row = {
  id: string;
  createdAt: string;
  day: string;
  mode: "solo" | "duo" | "squad";
  mapName: string;
  teamRank: number;
  teamTotal: number;
  kills: number;
  damage: number;
  surviveSeconds: number;
  players?: Array<{
    playerId: string;
    name: string;
    kills: number;
    assists: number;
    dbnos: number;
    damage: number;
    surviveSeconds: number;
  }>;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setExpandedId(null);
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
              const isExpanded = expandedId === row.id;
              const isGradeS = matchGrade === "S";
              const isGradeA = matchGrade === "A";
              const isTop1 = row.teamRank === 1;
              const isTop5 = row.teamRank <= 5;
              const isDamage800 = row.damage >= 800;
              const isDamage1k = row.damage >= 1000;

              return (
                <Fragment key={row.id}>
                  <tr
                    className={`${isTop1 ? "top1-row" : ""} ${isExpanded ? "row-expanded" : ""}`.trim()}
                    onClick={() =>
                      setExpandedId((prev) => (prev === row.id ? null : row.id))
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return;
                      }
                      event.preventDefault();
                      setExpandedId((prev) =>
                        prev === row.id ? null : row.id,
                      );
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                  >
                    <td>{dayjs(row.createdAt).format("MM-DD HH:mm")}</td>
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
                  {isExpanded ? (
                    <tr className="match-detail-row">
                      <td colSpan={6}>
                        {row.players && row.players.length > 0 ? (
                          <div className="match-detail-wrap">
                            <table className="table table-compact detail-table">
                              <thead>
                                <tr>
                                  <th>PLAYER</th>
                                  <th className="cell-right">KILL</th>
                                  <th className="cell-right">ASSIST</th>
                                  <th className="cell-right">KNOCK</th>
                                  <th className="cell-right">DAMAGE</th>
                                  <th className="cell-right">SURV</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.players.map((player) => (
                                  <tr key={`${row.id}-${player.playerId}`}>
                                    <td
                                      style={{
                                        color: getPlayerColor(player.name),
                                        fontWeight: 700,
                                      }}
                                    >
                                      {player.name}
                                    </td>
                                    <td className="cell-right">
                                      {formatInt(player.kills)}
                                    </td>
                                    <td className="cell-right">
                                      {formatInt(player.assists)}
                                    </td>
                                    <td className="cell-right">
                                      {formatInt(player.dbnos)}
                                    </td>
                                    <td className="cell-right">
                                      {formatInt(Math.round(player.damage))}
                                    </td>
                                    <td className="cell-right">
                                      {`${Math.floor(player.surviveSeconds / 60)}m`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="filter-note">
                            No player details for this match.
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
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

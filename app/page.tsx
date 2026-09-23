"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { summarizeMatch } from "@/lib/standings";
import type { AppState, Match, MatchCategory, Player, Standing } from "@/lib/types";

const title = process.env.NEXT_PUBLIC_TOURNAMENT_TITLE || "제1회 쀼 피클볼 대항전";

const categoryLabel: Record<MatchCategory, string> = {
  doubles: "부부 복식",
  mens: "남자 단식",
  womens: "여자 단식",
};

function sideName(ids: number[], players: Player[]) {
  return ids.map((id) => players.find((p) => p.id === id)?.name ?? `#${id}`).join(" · ");
}

function setText(match: Match) {
  const pairs = [
    [match.set1_a, match.set1_b],
    [match.set2_a, match.set2_b],
    [match.set3_a, match.set3_b],
  ];
  return pairs
    .filter(([a, b]) => a !== null && b !== null)
    .map(([a, b]) => `${a}:${b}`)
    .join(" · ");
}

function StandingTable({ rows, doubles = false }: { rows: Standing[]; doubles?: boolean }) {
  return (
    <div className="ranking-card">
      <div className="ranking-head">
        <span>순위</span><span>{doubles ? "팀" : "선수"}</span><span>승-패</span><span>세트</span><span>득실</span>
      </div>
      {rows.map((s, i) => (
        <div className="ranking-row" key={s.entityId}>
          <span className={`rank ${i === 0 ? "first" : ""}`}>{i + 1}</span>
          <span className="player">{s.name}</span>
          <span>{s.wins}-{s.losses}</span>
          <span className={s.setDiff > 0 ? "plus" : s.setDiff < 0 ? "minus" : ""}>{s.setDiff > 0 ? `+${s.setDiff}` : s.setDiff}</span>
          <span className={s.pointDiff > 0 ? "plus" : s.pointDiff < 0 ? "minus" : ""}>{s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Match | null>(null);
  const [scores, setScores] = useState(["", "", "", "", "", ""]);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [tab, setTab] = useState<"matches" | "ranking">("matches");
  const [category, setCategory] = useState<MatchCategory>("doubles");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "데이터 로딩 실패");
      setData(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로딩 실패");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 15000);
    return () => clearInterval(timer);
  }, [load]);

  const filteredMatches = useMemo(
    () => data?.matches.filter((m) => m.category === category) ?? [],
    [data, category]
  );

  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const match of filteredMatches) {
      map.set(match.round, [...(map.get(match.round) ?? []), match]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [filteredMatches]);

  const completed = data?.matches.filter((m) => m.status === "completed").length ?? 0;

  function openEditor(match: Match) {
    setEditing(match);
    setScores([
      match.set1_a?.toString() ?? "", match.set1_b?.toString() ?? "",
      match.set2_a?.toString() ?? "", match.set2_b?.toString() ?? "",
      match.set3_a?.toString() ?? "", match.set3_b?.toString() ?? "",
    ]);
    setFormError("");
  }

  function updateScore(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    setScores((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  const firstTwoComplete = scores.slice(0, 4).every((v) => v !== "");
  const firstTwoAWins = firstTwoComplete
    ? Number(scores[0]) > Number(scores[1]) && Number(scores[2]) > Number(scores[3])
    : false;
  const firstTwoBWins = firstTwoComplete
    ? Number(scores[0]) < Number(scores[1]) && Number(scores[2]) < Number(scores[3])
    : false;
  const thirdNotNeeded = firstTwoAWins || firstTwoBWins;

  async function submit(action: "save" | "clear") {
    if (!editing) return;
    setSaving(true);
    setFormError("");
    try {
      const body = action === "clear" ? { action, pin } : {
        action,
        pin,
        set1A: scores[0] === "" ? null : Number(scores[0]),
        set1B: scores[1] === "" ? null : Number(scores[1]),
        set2A: scores[2] === "" ? null : Number(scores[2]),
        set2B: scores[3] === "" ? null : Number(scores[3]),
        set3A: scores[4] === "" ? null : Number(scores[4]),
        set3B: scores[5] === "" ? null : Number(scores[5]),
      };
      const res = await fetch(`/api/matches/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      setEditing(null);
      setPin("");
      await load(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return <main className="center"><div className="spinner" /><p>대진표를 불러오는 중…</p></main>;
  }
  if (error && !data) {
    return <main className="center"><h1>연결 설정이 필요합니다</h1><p>{error}</p><button onClick={() => load()}>다시 시도</button></main>;
  }
  if (!data) return null;

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">COUPLES · SINGLES · ROUND ROBIN</div>
        <h1>{title}</h1>
        <p>8명이 함께하는 풀리그. 모든 경기는 3판 2선승, 각 세트 11점이며 듀스에서는 2점 차로 승리합니다.</p>
        <div className="progress-card">
          <div><strong>{completed}</strong><span>완료 경기</span></div>
          <div className="divider" />
          <div><strong>18</strong><span>전체 경기</span></div>
          <div className="progress-track"><i style={{ width: `${(completed / 18) * 100}%` }} /></div>
        </div>
      </section>

      <nav className="tabs">
        <button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}>대진 · 결과</button>
        <button className={tab === "ranking" ? "active" : ""} onClick={() => setTab("ranking")}>순위</button>
        <button className="refresh" onClick={() => load(true)} aria-label="새로고침">↻</button>
      </nav>

      <div className="category-tabs">
        {(Object.keys(categoryLabel) as MatchCategory[]).map((key) => (
          <button key={key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}>
            {categoryLabel[key]}
          </button>
        ))}
      </div>

      {tab === "matches" ? (
        <section className="rounds">
          {rounds.map(([round, matches]) => (
            <div className="round" key={round}>
              <div className="round-title"><span>ROUND {round}</span><small>2 MATCHES</small></div>
              <div className="match-list">
                {matches.map((match) => {
                  const a = sideName(match.side_a, data.players);
                  const b = sideName(match.side_b, data.players);
                  const result = summarizeMatch(match);
                  const complete = result.complete;
                  return (
                    <button className={`match-card ${complete ? "complete" : ""}`} key={match.id} onClick={() => openEditor(match)}>
                      <div className="match-meta">
                        <span>#{match.match_no}</span>
                        <span>{complete ? "경기 종료" : "결과 입력"}</span>
                      </div>
                      <div className={`team-row ${complete && result.winner === "A" ? "winner" : ""}`}>
                        <strong>{a}</strong><b>{complete ? result.setsA : "-"}</b>
                      </div>
                      <div className={`team-row ${complete && result.winner === "B" ? "winner" : ""}`}>
                        <strong>{b}</strong><b>{complete ? result.setsB : "-"}</b>
                      </div>
                      {complete && <div className="set-summary">{setText(match)}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section>
          <div className="ranking-title">
            <span>{categoryLabel[category]} 순위</span>
            <small>승수 → 맞대결 → 세트득실 → 점수득실</small>
          </div>
          <StandingTable rows={data.standings[category]} doubles={category === "doubles"} />
          <p className="rule">※ 같은 승수인 2명/2팀은 맞대결 승자를 우선합니다. 3명 이상 동률이면 세트 득실 → 점수 득실 순으로 비교합니다.</p>
        </section>
      )}

      {editing && (
        <div className="backdrop" onMouseDown={() => !saving && setEditing(null)}>
          <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-meta">{categoryLabel[editing.category]} · ROUND {editing.round}</div>
            <h2>{sideName(editing.side_a, data.players)} <em>vs</em> {sideName(editing.side_b, data.players)}</h2>
            <p className="score-rule">11점 선취 · 10:10 듀스부터 2점 차 · 3판 2선승</p>

            <div className="set-grid head"><span>세트</span><span>{sideName(editing.side_a, data.players)}</span><span>{sideName(editing.side_b, data.players)}</span></div>
            {[0, 1, 2].map((setIndex) => {
              const disabled = setIndex === 2 && thirdNotNeeded;
              return (
                <div className={`set-grid ${disabled ? "disabled" : ""}`} key={setIndex}>
                  <strong>{setIndex + 1}</strong>
                  <input disabled={disabled} inputMode="numeric" pattern="[0-9]*" value={disabled ? "" : scores[setIndex * 2]} onChange={(e) => updateScore(setIndex * 2, e.target.value)} placeholder="-" />
                  <input disabled={disabled} inputMode="numeric" pattern="[0-9]*" value={disabled ? "" : scores[setIndex * 2 + 1]} onChange={(e) => updateScore(setIndex * 2 + 1, e.target.value)} placeholder="-" />
                </div>
              );
            })}
            {thirdNotNeeded && <p className="third-note">2세트 만에 승부가 끝나 3세트는 입력하지 않습니다.</p>}

            <label className="pin-label">대회 공용 PIN<input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN 입력" /></label>
            {formError && <p className="form-error">{formError}</p>}
            <button className="save" disabled={saving} onClick={() => submit("save")}>{saving ? "저장 중…" : "경기 결과 저장"}</button>
            {editing.status === "completed" && <button className="clear" disabled={saving} onClick={() => submit("clear")}>결과 초기화</button>}
            <button className="cancel" disabled={saving} onClick={() => setEditing(null)}>닫기</button>
          </section>
        </div>
      )}
    </main>
  );
}

import { DEMO_PLAYERS } from "@/lib/trialDemo";

/**
 * Scripted sample game used by the landing page animated preview.
 * Every step is the exact action a scorekeeper taps on the real scoring
 * screen, so the animation mirrors the original UI rather than a mock-up.
 */

const STAT_LABELS = { reb: "REBOUND", ast: "ASSIST", stl: "STEAL", blk: "BLOCK" };

const SCRIPT = [
  { team: "home", player: 0, kind: "score", points: 3, control: "pt3" },
  { team: "away", player: 1, kind: "score", points: 2, control: "pt2" },
  { team: "home", player: 2, kind: "stat", stat: "reb", control: "reb" },
  { team: "home", player: 0, kind: "score", points: 2, control: "pt2" },
  { team: "away", player: 0, kind: "score", points: 2, control: "pt2" },
  { team: "home", player: 3, kind: "foul", control: "foul" },
  { team: "away", player: 2, kind: "stat", stat: "ast", control: "ast" },
  { team: "home", player: 1, kind: "score", points: 1, control: "pt1" },
  { team: "away", player: 3, kind: "stat", stat: "stl", control: "stl" },
  { team: "home", player: 2, kind: "stat", stat: "blk", control: "blk" },
  { team: "away", player: 1, kind: "score", points: 3, control: "pt3" },
  { team: "period" },
  { team: "home", player: 0, kind: "score", points: 2, control: "pt2" },
  { team: "away", player: 2, kind: "score", points: 2, control: "pt2" },
  { team: "home", player: 3, kind: "stat", stat: "reb", control: "reb" },
  { team: "away", player: 3, kind: "foul", control: "foul" },
  { team: "home", player: 1, kind: "score", points: 3, control: "pt3" },
  { team: "away", player: 0, kind: "stat", stat: "ast", control: "ast" },
  { team: "home", player: 2, kind: "score", points: 2, control: "pt2" },
];

const emptyPlayer = () => ({ points: 0, reb: 0, ast: 0, stl: 0, blk: 0, fl: 0 });

const cloneStats = (stats) => ({
  home: Object.fromEntries(Object.entries(stats.home).map(([k, v]) => [k, { ...v }])),
  away: Object.fromEntries(Object.entries(stats.away).map(([k, v]) => [k, { ...v }])),
});

/** Precomputes one frame per scripted action, so rendering stays a lookup. */
export const buildFrames = () => {
  const state = {
    home: 0,
    away: 0,
    period: 1,
    periodScores: [],
    homeFouls: 0,
    awayFouls: 0,
    homeTimeouts: 1,
    awayTimeouts: 1,
    stats: { home: {}, away: {} },
  };

  const snapshot = (selected, control, label) => ({
    ...state,
    periodScores: state.periodScores.map((p) => ({ ...p })),
    stats: cloneStats(state.stats),
    selected,
    control,
    label,
  });

  const frames = [snapshot(null, null, "Tip-off · game ready to score")];
  let periodHome = 0;
  let periodAway = 0;

  SCRIPT.forEach((step) => {
    if (step.kind === "period") {
      state.periodScores = [
        ...state.periodScores,
        { quarter: state.period, home: state.home - periodHome, away: state.away - periodAway },
      ];
      periodHome = state.home;
      periodAway = state.away;
      state.homeFouls = 0;
      state.awayFouls = 0;
      state.period += 1;
      frames.push(snapshot(null, null, `End of Q${state.period - 1} · saved to the game record`));
      return;
    }

    const roster = DEMO_PLAYERS.basketball[step.team];
    const key = String(step.player % roster.length);
    const player = roster[Number(key)];
    const playerStats = (state.stats[step.team][key] = state.stats[step.team][key] || emptyPlayer());
    const selected = {
      team: step.team,
      key,
      jersey: player.jersey_number,
      name: `${player.first_name} ${player.last_name}`,
      position: player.position,
    };

    let label;
    if (step.kind === "score") {
      if (step.team === "home") state.home += step.points;
      else state.away += step.points;
      playerStats.points += step.points;
      label = `#${player.jersey_number} ${player.last_name} · ${step.points} PT`;
    } else if (step.kind === "foul") {
      if (step.team === "home") state.homeFouls += 1;
      else state.awayFouls += 1;
      playerStats.fl += 1;
      label = `#${player.jersey_number} ${player.last_name} · FOUL`;
    } else {
      playerStats[step.stat] += 1;
      label = `#${player.jersey_number} ${player.last_name} · ${STAT_LABELS[step.stat]}`;
    }

    frames.push(snapshot(selected, step.control, label));
  });

  return frames;
};
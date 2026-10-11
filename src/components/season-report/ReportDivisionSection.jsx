import React from "react";
import { Trophy } from "lucide-react";

function StatChips({ player, sport }) {
  if (sport === 'basketball') {
    const stats = [
      { label: 'PPG', value: player.ppg },
      { label: 'RPG', value: player.rpg },
      { label: 'APG', value: player.apg },
      { label: 'SPG', value: player.spg },
      { label: 'BPG', value: player.bpg },
    ];
    return (
      <div className="flex flex-wrap gap-1.5">
        {stats.map((s) => (
          <span key={s.label} className="bg-[#354139] px-2 py-0.5 text-xs font-bold text-[#F5F7F4] tabular-nums">
            {s.label}<em className="not-italic text-[#25DA67] ml-1">{s.value}</em>
          </span>
        ))}
      </div>
    );
  }
  const stats = [
    { label: 'Aces/G', value: player.acpg },
    { label: 'Att/G', value: player.atpg },
    { label: 'Err/G', value: player.repg },
    { label: 'PPG', value: player.ppg },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {stats.map((s) => (
        <span key={s.label} className="bg-[#354139] px-2 py-0.5 text-xs font-bold text-[#F5F7F4] tabular-nums">
          {s.label}<em className="not-italic text-[#25DA67] ml-1">{s.value}</em>
        </span>
      ))}
    </div>
  );
}

function CandidateCard({ candidate, rank, sport, showPosition }) {
  const isOutline = showPosition;
  return (
    <div className="border border-[#354139] bg-[#17201a] p-4.5 flex gap-3.5 mb-3">
      <span
        className={`flex-none w-8 h-8 text-center font-extrabold text-base ${
          isOutline
            ? 'bg-transparent border-2 border-[#25DA67] text-[#25DA67] leading-[28px]'
            : 'bg-[#25DA67] text-[#101713] leading-8'
        }`}
      >
        {rank}
      </span>
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-[#9fb0a5] text-[13px]">
          <b className="text-[#F5F7F4] text-base font-bold">
            {candidate.first_name} {candidate.last_name}
            {candidate.jersey_number && ` #${candidate.jersey_number}`}
            {showPosition && candidate.position && (
              <span className="inline-block bg-[rgba(37,218,103,0.14)] text-[#25DA67] border border-[rgba(37,218,103,0.4)] px-2 py-0.5 text-xs ml-2 align-middle">
                {candidate.position}
              </span>
            )}
          </b>
          <span>{candidate.team_name}</span>
        </div>
        <StatChips player={candidate} sport={sport} />
        {candidate.reasoning && (
          <p className="text-[#c5d0c9] text-sm leading-relaxed m-0">{candidate.reasoning}</p>
        )}
      </div>
    </div>
  );
}

export default function ReportDivisionSection({ division }) {
  const isBasketball = division.sport === 'basketball';
  const mythicalLabel = isBasketball ? 'Mythical Five' : 'Mythical Six';

  const bballHeaders = ['PPG', 'RPG', 'APG', 'SPG', 'BPG', '3PT'];
  const vballHeaders = ['Aces/G', 'Att/G', 'Err/G', 'PPG'];
  const headers = isBasketball ? bballHeaders : vballHeaders;

  const getStatValue = (p, header) => {
    const map = {
      'PPG': p.ppg, 'RPG': p.rpg, 'APG': p.apg, 'SPG': p.spg, 'BPG': p.bpg, '3PT': p.tpg,
      'Aces/G': p.acpg, 'Att/G': p.atpg, 'Err/G': p.repg,
    };
    return map[header] ?? 0;
  };

  return (
    <section className="bg-[#131b16] border border-[#354139] p-7 md:p-8 flex flex-col gap-7 bb-rise-3">
      {/* Division header */}
      <div className="flex gap-3.5 items-center border-b border-[#354139] pb-4.5">
        <Trophy className="w-7 h-7 text-[#25DA67] flex-none" strokeWidth={2} />
        <div>
          <h2 className="text-2xl md:text-[30px] font-extrabold uppercase tracking-[0.02em] text-[#F5F7F4]">{division.name}</h2>
          <p className="text-[#9fb0a5] text-sm capitalize mt-1">{division.sport} — {division.team_count} teams</p>
        </div>
      </div>

      {/* Top 10 Performers */}
      <div>
        <h3 className="text-xl font-extrabold uppercase tracking-[0.02em] text-[#F5F7F4] mb-3.5">Top 10 Performers</h3>
        {division.top_performers.length === 0 ? (
          <p className="border border-dashed border-[#354139] p-6 text-center text-[#9fb0a5] text-sm">
            No player stats recorded for this division yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs uppercase tracking-[0.14em] font-bold text-[#9fb0a5] py-2.5 px-2 border-b border-[#354139]">#</th>
                  <th className="text-left text-xs uppercase tracking-[0.14em] font-bold text-[#9fb0a5] py-2.5 px-2 border-b border-[#354139]">Player</th>
                  <th className="text-left text-xs uppercase tracking-[0.14em] font-bold text-[#9fb0a5] py-2.5 px-2 border-b border-[#354139]">Team</th>
                  <th className="text-center text-xs uppercase tracking-[0.14em] font-bold text-[#9fb0a5] py-2.5 px-2 border-b border-[#354139]">GP</th>
                  {headers.map((h) => (
                    <th key={h} className="text-center text-xs uppercase tracking-[0.14em] font-bold text-[#9fb0a5] py-2.5 px-2 border-b border-[#354139]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {division.top_performers.map((p, i) => (
                  <tr key={p.player_id} className="transition-colors hover:bg-[#1b261f]">
                    <td className="py-3 px-2 border-b border-[#243028] text-[#25DA67] font-extrabold tabular-nums">{i + 1}</td>
                    <td className="py-3 px-2 border-b border-[#243028] text-[#F5F7F4]">
                      <b className="font-bold">{p.first_name} {p.last_name}</b>
                      {p.jersey_number && <span className="text-[#9fb0a5] ml-1.5">#{p.jersey_number}</span>}
                    </td>
                    <td className="py-3 px-2 border-b border-[#243028] text-[#9fb0a5]">{p.team_name}</td>
                    <td className="py-3 px-2 border-b border-[#243028] text-center text-[#9fb0a5] tabular-nums">{p.games_played}</td>
                    {headers.map((h, hi) => (
                      <td
                        key={h}
                        className={`py-3 px-2 border-b border-[#243028] text-center tabular-nums ${hi === 0 ? 'text-[#25DA67] font-extrabold' : 'text-[#F5F7F4] font-medium'}`}
                      >
                        {getStatValue(p, h)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Award candidates — two column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Season MVP Candidates */}
        {division.season_mvp_candidates.length > 0 && (
          <div>
            <h3 className="text-xl font-extrabold uppercase tracking-[0.02em] text-[#25DA67] mb-3.5">Season MVP Candidates</h3>
            {division.season_mvp_candidates.map((c, i) => (
              <CandidateCard key={c.player_id || i} candidate={c} rank={i + 1} sport={division.sport} />
            ))}
          </div>
        )}

        {/* Final MVP Candidates */}
        {division.final_mvp_candidates.length > 0 && (
          <div>
            <h3 className="text-xl font-extrabold uppercase tracking-[0.02em] text-[#25DA67] mb-3.5">Final MVP Candidates</h3>
            {division.final_mvp_candidates.map((c, i) => (
              <CandidateCard key={c.player_id || i} candidate={c} rank={i + 1} sport={division.sport} />
            ))}
          </div>
        )}
      </div>

      {/* Mythical Candidates */}
      {division.mythical_candidates.length > 0 && (
        <div>
          <h3 className="text-xl font-extrabold uppercase tracking-[0.02em] text-[#25DA67] mb-3.5">{mythicalLabel} Candidates</h3>
          {division.mythical_candidates.map((c, i) => (
            <CandidateCard key={c.player_id || i} candidate={c} rank={i + 1} sport={division.sport} showPosition />
          ))}
        </div>
      )}
    </section>
  );
}
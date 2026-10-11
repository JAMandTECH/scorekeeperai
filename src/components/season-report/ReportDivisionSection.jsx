import React from "react";
import { Trophy, Award, Star } from "lucide-react";

function PlayerName({ player }) {
  return (
    <span className="font-medium text-foreground">
      {player.first_name} {player.last_name}
      {player.jersey_number && (
        <span className="text-muted-foreground ml-1.5">#{player.jersey_number}</span>
      )}
    </span>
  );
}

function StatBadge({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-xs font-medium text-muted-foreground tabular-nums">
      {label} {value}
    </span>
  );
}

function PlayerStats({ player, sport }) {
  if (sport === 'basketball') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <StatBadge label="PPG" value={player.ppg} />
        <StatBadge label="RPG" value={player.rpg} />
        <StatBadge label="APG" value={player.apg} />
        <StatBadge label="SPG" value={player.spg} />
        <StatBadge label="BPG" value={player.bpg} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatBadge label="Aces/G" value={player.acpg} />
      <StatBadge label="Att/G" value={player.atpg} />
      <StatBadge label="Err/G" value={player.repg} />
      <StatBadge label="PPG" value={player.ppg} />
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
    <section className="report-section report-division space-y-8">
      {/* Division header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">{division.name}</h2>
            <p className="text-sm text-muted-foreground capitalize">{division.sport} - {division.team_count} teams</p>
          </div>
        </div>
      </div>

      {/* Top 10 Performers */}
      <div className="report-card">
        <h3 className="text-lg font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Top 10 Performers
        </h3>
        {division.top_performers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No player stats recorded for this division yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="report-table w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Player</th>
                  <th className="py-2 pr-4 font-medium">Team</th>
                  <th className="py-2 pr-4 font-medium text-center">GP</th>
                  {headers.map((h) => (
                    <th key={h} className="py-2 px-2 font-medium text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {division.top_performers.map((p, i) => (
                  <tr key={p.player_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 pr-4 font-heading font-bold text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="py-2.5 pr-4">
                      <PlayerName player={p} />
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{p.team_name}</td>
                    <td className="py-2.5 pr-4 text-center text-muted-foreground tabular-nums">{p.games_played}</td>
                    {headers.map((h) => (
                      <td key={h} className="py-2.5 px-2 text-center tabular-nums font-medium text-foreground">
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

      {/* Season MVP Candidates */}
      {division.season_mvp_candidates.length > 0 && (
        <div className="report-card">
          <h3 className="text-lg font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Season MVP Candidates
          </h3>
          <div className="space-y-3">
            {division.season_mvp_candidates.map((c, i) => (
              <div key={c.player_id || i} className="border border-border p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground text-sm font-heading font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <PlayerName player={c} />
                      <span className="text-xs text-muted-foreground">{c.team_name}</span>
                    </div>
                    <PlayerStats player={c} sport={division.sport} />
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.reasoning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final MVP Candidates */}
      {division.final_mvp_candidates.length > 0 && (
        <div className="report-card">
          <h3 className="text-lg font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Final MVP Candidates
          </h3>
          <div className="space-y-3">
            {division.final_mvp_candidates.map((c, i) => (
              <div key={c.player_id || i} className="border border-border p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground text-sm font-heading font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <PlayerName player={c} />
                      <span className="text-xs text-muted-foreground">{c.team_name}</span>
                    </div>
                    <PlayerStats player={c} sport={division.sport} />
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.reasoning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mythical 5/6 Candidates */}
      {division.mythical_candidates.length > 0 && (
        <div className="report-card">
          <h3 className="text-lg font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            {mythicalLabel} Candidates
          </h3>
          <div className="space-y-3">
            {division.mythical_candidates.map((c, i) => (
              <div key={c.player_id || i} className="border border-border p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 border border-primary text-primary text-sm font-heading font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <PlayerName player={c} />
                        {c.position && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                            {c.position}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{c.team_name}</span>
                    </div>
                    <PlayerStats player={c} sport={division.sport} />
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.reasoning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
import React from 'react';

export default function StandingsWidget({ title, teams }) {
  return (
    <div className="w-full max-w-xl mx-auto text-foreground">
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
      <div className="rounded-lg border bg-card/80 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 w-10">#</th>
              <th className="text-left px-3 py-2">Team</th>
              <th className="text-center px-2 py-2 w-12">W</th>
              <th className="text-center px-2 py-2 w-12">L</th>
              <th className="text-center px-2 py-2 w-16">Win%</th>
            </tr>
          </thead>
          <tbody>
            {(teams || []).map((t) => (
              <tr key={t.team_id} className="odd:bg-background">
                <td className="px-3 py-2 align-middle">{t.rank}</td>
                <td className="px-3 py-2 flex items-center gap-2">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt="logo" className="h-5 w-5 rounded-sm border object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded-sm border bg-muted" />
                  )}
                  <span className="truncate">{t.name}</span>
                </td>
                <td className="px-2 py-2 text-center">{t.wins}</td>
                <td className="px-2 py-2 text-center">{t.losses}</td>
                <td className="px-2 py-2 text-center">{t.win_pct.toFixed(3)}</td>
              </tr>
            ))}
            {(!teams || teams.length === 0) && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No teams found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Powered by SCOREKEEPERAI</div>
    </div>
  );
}
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function DivisionChampionSelector({ divisions, champions, onChange, loading }) {
  if (loading) {
    return (
      <div className="border border-[#354139] bg-[#17201a] p-6 flex items-center gap-3 bb-rise-2">
        <Loader2 className="w-5 h-5 text-[#25DA67] animate-spin" />
        <p className="text-[#9fb0a5] text-sm">Loading divisions and teams...</p>
      </div>
    );
  }

  if (divisions.length === 0) return null;

  const divisionsWithTeams = divisions.filter((d) => d.teams.length > 0);
  const allSelected = divisionsWithTeams.every((d) => champions[d.name]);

  return (
    <div className="border border-[#354139] bg-[#17201a] p-6 md:p-7 flex flex-col gap-5 bb-rise-2">
      <div className="flex items-center gap-3 border-b border-[#354139] pb-4">
        <Trophy className="w-6 h-6 text-[#25DA67] flex-none" strokeWidth={2} />
        <div>
          <h3 className="text-xl font-extrabold uppercase tracking-[0.02em] text-[#F5F7F4]">
            Finals Champions
          </h3>
          <p className="text-[#9fb0a5] text-sm mt-0.5">
            Select the champion team for each division. This determines Finals MVP candidates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {divisions.map((div) => {
          const selected = champions[div.name] || "";
          const hasTeams = div.teams.length > 0;
          return (
            <div key={div.name} className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-[0.14em] font-bold text-[#9fb0a5] flex items-center gap-2">
                <span className="capitalize text-[#F5F7F4]">{div.name}</span>
                <span className="text-[10px] bg-[rgba(37,218,103,0.14)] text-[#25DA67] border border-[rgba(37,218,103,0.4)] px-1.5 py-0.5 uppercase tracking-wide">
                  {div.sport}
                </span>
                {selected && <CheckCircle2 className="w-3.5 h-3.5 text-[#25DA67]" />}
                {!selected && hasTeams && (
                  <span className="text-[#ff6b6b] text-[10px] normal-case tracking-normal flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Required
                  </span>
                )}
              </div>
              {hasTeams ? (
                <Select value={selected} onValueChange={(v) => onChange(div.name, v)}>
                  <SelectTrigger className="h-10 w-full bg-[#354139] border border-[#4a594f] text-[#F5F7F4] hover:border-[#25DA67] focus:border-[#25DA67] rounded-none [&>svg]:text-[#9fb0a5]">
                    <SelectValue placeholder="Select champion..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#17201a] border border-[#354139] text-[#F5F7F4] rounded-none max-h-[280px]">
                    {div.teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-[#F5F7F4] focus:bg-[#354139] focus:text-[#25DA67] rounded-none">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[#9fb0a5] text-xs italic border border-dashed border-[#354139] px-3 py-2.5">
                  No teams in this division
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!allSelected && divisionsWithTeams.length > 0 && (
        <p className="text-[#ff6b6b] text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Please select a champion for all divisions before generating the report.
        </p>
      )}
    </div>
  );
}
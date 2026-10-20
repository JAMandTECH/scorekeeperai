import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  "Tap any player to score points and log rebounds, assists, steals and blocks",
  "Track fouls, timeouts and quarter-by-quarter scores as the game unfolds",
  "Undo any action, end periods and see the final result — basketball or volleyball",
];

const sports = [
  {
    sport: "basketball",
    title: "Basketball Demo",
    detail: "4 quarters · fouls, timeouts and player plus/minus",
  },
  {
    sport: "volleyball",
    title: "Volleyball Demo",
    detail: "5 sets · attack, block, ace, dig and rally stats",
  },
];

export default function DemoLaunchPanel() {
  return (
    <div className="mt-10 grid lg:grid-cols-2 gap-px bg-border border border-border">
      <div className="bg-card p-8">
        <p className="text-xs font-semibold tracking-wide uppercase text-primary mb-4">Take the controls</p>
        <h3 className="font-heading text-2xl font-bold tracking-tight mb-4">
          Everything your scorekeeper taps
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          This is the real scoring screen, not a mock-up. Pick a sport, then run a full game with sample teams and rosters — every button behaves exactly as it does on game day.
        </p>
        <ul className="space-y-3 mb-6">
          {capabilities.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border pt-5 flex items-start gap-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <span>No sign-up needed. Every score is simulated in your browser and resets when you leave — nothing is saved to your league.</span>
        </div>
      </div>

      <div className="bg-card p-8 flex flex-col justify-center gap-px">
        {sports.map((s) => (
          <div key={s.sport} className="border border-border p-6 mb-4 last:mb-0">
            <h4 className="font-heading text-lg font-bold mb-1">{s.title}</h4>
            <p className="text-sm text-muted-foreground mb-5">{s.detail}</p>
            <Button asChild className="w-full rounded-none font-heading font-bold">
              <Link to={`/DemoLiveScoring?sport=${s.sport}`}>
                Start the demo
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-1">Opens instantly — no account, no setup.</p>
      </div>
    </div>
  );
}
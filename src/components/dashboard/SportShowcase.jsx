import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

function ShowcaseCard({ label, title, stat, statLabel, to }) {
  return (
    <Link to={to} className="group block border border-border bg-card p-6 h-48 hover:bg-muted transition-colors">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <h3 className="font-heading text-2xl font-bold tracking-tight mt-1">{title}</h3>
      <div className="mt-auto pt-6 flex items-center justify-between">
        <div>
          <span className="font-heading text-3xl font-bold tabular-nums">{stat}</span>
          <span className="ml-2 text-sm text-muted-foreground">{statLabel}</span>
        </div>
        <div className="w-9 h-9 border border-border flex items-center justify-center group-hover:bg-secondary transition-colors">
          <ArrowRight className="w-4 h-4 text-foreground" />
        </div>
      </div>
    </Link>
  );
}

export default function SportShowcase({ basketballTeams = 0, volleyballTeams = 0 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ShowcaseCard
        label="League Spotlight"
        title="Basketball"
        stat={basketballTeams}
        statLabel="teams competing"
        to="/teams"
      />
      <ShowcaseCard
        label="League Spotlight"
        title="Volleyball"
        stat={volleyballTeams}
        statLabel="teams competing"
        to="/teams"
      />
    </div>
  );
}
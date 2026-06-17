import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const BASKETBALL_IMG = "https://media.base44.com/images/public/690476f21c3624553ac82b4f/51a6d4f65_generated_image.png";
const VOLLEYBALL_IMG = "https://media.base44.com/images/public/690476f21c3624553ac82b4f/0e1f778f3_generated_image.png";

function ShowcaseCard({ image, label, title, stat, statLabel, gradient, to }) {
  return (
    <Link to={to} className="group relative block overflow-hidden rounded-3xl h-56">
      <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className={`absolute inset-0 bg-gradient-to-t ${gradient}`} />
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <span className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">{label}</span>
        <h3 className="text-2xl font-black text-white drop-shadow-lg">{title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-4xl font-black text-white">{stat}</span>
            <span className="ml-2 text-sm font-semibold text-white/70">{statLabel}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SportShowcase({ basketballTeams = 0, volleyballTeams = 0 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ShowcaseCard
        image={BASKETBALL_IMG}
        label="League Spotlight"
        title="Basketball"
        stat={basketballTeams}
        statLabel="teams competing"
        gradient="from-orange-950/95 via-orange-900/40 to-transparent"
        to="/teams"
      />
      <ShowcaseCard
        image={VOLLEYBALL_IMG}
        label="League Spotlight"
        title="Volleyball"
        stat={volleyballTeams}
        statLabel="teams competing"
        gradient="from-cyan-950/95 via-blue-900/40 to-transparent"
        to="/teams"
      />
    </div>
  );
}
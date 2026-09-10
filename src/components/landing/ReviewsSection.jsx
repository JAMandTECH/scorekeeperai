import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "Marcus Delgado",
    role: "League Director, Metro Basketball Assoc.",
    initials: "MD",
    rating: 5,
    text: "ScorekeeperAI completely transformed how we run our league. Live scoring and instant standings saved our volunteers hours every week.",
  },
  {
    name: "Sarah Whitman",
    role: "Volleyball Club Coordinator",
    initials: "SW",
    rating: 5,
    text: "The voice scoring is a game changer. Our scorekeepers just talk and everything updates in real-time. Parents love following games live.",
  },
  {
    name: "James Okafor",
    role: "Youth Sports Organizer",
    initials: "JO",
    rating: 5,
    text: "Setting up our divisions and teams took minutes. The AI insights help us spot our top performers instantly. Highly recommended.",
  },
  {
    name: "Elena Rossi",
    role: "Community Center Manager",
    initials: "ER",
    rating: 5,
    text: "Running three sports leagues at once used to be chaos. Now everything lives in one place and fans can check scores from anywhere.",
  },
  {
    name: "David Chen",
    role: "University Intramural Lead",
    initials: "DC",
    rating: 5,
    text: "The statistics and historical tracking are incredibly detailed. Our students are obsessed with the leaderboards and player rankings.",
  },
  {
    name: "Priya Nair",
    role: "Tournament Director",
    initials: "PN",
    rating: 5,
    text: "Bracket management and automated standings made our tournament run flawlessly. The best league software we've ever used.",
  },
];

export default function ReviewsSection() {
  return (
    <section className="border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <div className="mb-12">
          <p className="text-sm text-muted-foreground mb-3">Loved by Leagues</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
            What our users say
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-primary fill-primary" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">4.9/5 from 500+ organizations</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {reviews.map((review, i) => (
            <Card key={i} className="border-0 rounded-none p-8">
              <CardContent className="p-0">
                <Quote className="w-7 h-7 text-muted-foreground/40 mb-4" />
                <div className="flex mb-4">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  "{review.text}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 border border-border flex items-center justify-center">
                    <span className="text-xs font-heading font-bold">{review.initials}</span>
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
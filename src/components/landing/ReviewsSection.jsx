import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "Marcus Delgado",
    role: "League Director, Metro Basketball Assoc.",
    initials: "MD",
    color: "from-orange-500 to-red-600",
    rating: 5,
    text: "ScorekeeperAI completely transformed how we run our league. Live scoring and instant standings saved our volunteers hours every week.",
  },
  {
    name: "Sarah Whitman",
    role: "Volleyball Club Coordinator",
    initials: "SW",
    color: "from-cyan-500 to-blue-600",
    rating: 5,
    text: "The voice scoring is a game changer. Our scorekeepers just talk and everything updates in real-time. Parents love following games live.",
  },
  {
    name: "James Okafor",
    role: "Youth Sports Organizer",
    initials: "JO",
    color: "from-purple-500 to-pink-600",
    rating: 5,
    text: "Setting up our divisions and teams took minutes. The AI insights help us spot our top performers instantly. Highly recommended.",
  },
  {
    name: "Elena Rossi",
    role: "Community Center Manager",
    initials: "ER",
    color: "from-green-500 to-emerald-600",
    rating: 5,
    text: "Running three sports leagues at once used to be chaos. Now everything lives in one place and fans can check scores from anywhere.",
  },
  {
    name: "David Chen",
    role: "University Intramural Lead",
    initials: "DC",
    color: "from-blue-500 to-indigo-600",
    rating: 5,
    text: "The statistics and historical tracking are incredibly detailed. Our students are obsessed with the leaderboards and player rankings.",
  },
  {
    name: "Priya Nair",
    role: "Tournament Director",
    initials: "PN",
    color: "from-yellow-500 to-orange-600",
    rating: 5,
    text: "Bracket management and automated standings made our tournament run flawlessly. The best league software we've ever used.",
  },
];

export default function ReviewsSection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient opacity-30"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 text-sm font-bold px-4 py-2">
            ⭐ LOVED BY LEAGUES
          </Badge>
          <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
            What Our Users Say
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">4.9/5 from 500+ organizations</span>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Trusted by league directors, coaches, and organizers around the world.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <Card
              key={i}
              className="relative overflow-hidden border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 group card-hover"
            >
              <CardContent className="p-8 relative z-10">
                <Quote className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-4" />
                <div className="flex mb-4">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 font-medium">
                  "{review.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${review.color} rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg`}
                  >
                    {review.initials}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{review.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{review.role}</p>
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
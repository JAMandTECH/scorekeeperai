import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Sparkles, ChevronRight, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK_GUIDES = [
  { 
    title: "Getting Started",
    steps: [
      "1. Go to Dashboard to see your organization overview",
      "2. Add Teams in the Teams section",
      "3. Add Players to each team in the Players section",
      "4. Schedule games in the Games section",
      "5. Start live scoring when games begin!"
    ]
  },
  {
    title: "How to Schedule Games",
    steps: [
      "1. Click 'Games' in the sidebar",
      "2. Click 'Schedule Game' button",
      "3. Select sport, teams, date/time, and court",
      "4. Assign scorekeepers (optional)",
      "5. Click 'Schedule Game' to save"
    ]
  },
  {
    title: "How to Do Live Scoring",
    steps: [
      "1. Go to Games or Live Scoring page",
      "2. Find your scheduled game",
      "3. Click 'Start Game' button",
      "4. Tap players to record points, rebounds, assists",
      "5. Game auto-saves after each action"
    ]
  },
  {
    title: "Managing Teams & Players",
    steps: [
      "1. Go to Teams page to add/edit teams",
      "2. Set team name, sport, and division",
      "3. Go to Players page to add players",
      "4. Enter jersey number, name, and position",
      "5. Players are now available for game stats"
    ]
  }
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your ALAB Sports AI assistant. I can help you navigate the platform and answer any questions. Select a quick guide below or ask me anything!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Hide pulse after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleGuideSelect = (guide) => {
    setSelectedGuide(guide);
    setShowGuides(false);
    setMessages(prev => [...prev, 
      { role: "user", content: `How do I: ${guide.title}?` },
      { role: "assistant", content: `📋 **${guide.title}**\n\n${guide.steps.join('\n')}\n\nNeed more help? Just ask!` }
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setShowGuides(false);
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const conversationContext = messages
        .slice(-4)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const prompt = `You are a helpful AI assistant for ALAB Sports, a basketball and volleyball league management platform.

Previous conversation:
${conversationContext}

User's new question: ${userMessage}

PLATFORM NAVIGATION GUIDE:
- Dashboard: Main overview with stats, quick actions. Click "Dashboard" in sidebar.
- Teams: Add/edit teams. Go to Teams page → Click "Add Team" → Fill details → Save.
- Players: Manage player profiles. Go to Players page → Click "Add Player" → Enter jersey#, name, position.
- Games: Schedule matches. Go to Games page → "Schedule Game" → Select teams, date, court → Save.
- Live Scoring: Real-time scoring. Go to Games → Find scheduled game → Click "Start Game" → Tap players to record stats.
- Statistics: View analytics. Go to Statistics page → Filter by sport/team → View charts and leaderboards.
- Divisions: Create divisions. Go to Divisions page → Add division by sport.
- Scorekeepers: Assign scorekeepers. Go to Scorekeepers page → Add users who can score games.
- Tournament Brackets: Create playoffs. Go to Tournament Brackets → Create tournament → Seed teams.
- AI Schedule Generator: Auto-generate schedules. Go to Games → Click "AI Generate Schedule" → Select sport and rounds.

Provide step-by-step instructions when asked about features. Use emojis for friendliness. Be concise but thorough.
Format steps with numbers (1. 2. 3.) for clarity.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment."
      }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button with Attention-Grabbing Animation */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Pulsing ring effect */}
          {showPulse && (
            <>
              <div className="absolute inset-0 w-16 h-16 -m-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-ping opacity-75"></div>
              <div className="absolute inset-0 w-16 h-16 -m-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse opacity-50"></div>
            </>
          )}
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 whitespace-nowrap animate-bounce">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xl">
              👋 Need help? Click me!
              <div className="absolute top-full right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-purple-600"></div>
            </div>
          </div>
          
          <Button
            onClick={() => { setIsOpen(true); setShowPulse(false); }}
            className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 shadow-2xl p-0 border-4 border-white dark:border-gray-800 transition-transform hover:scale-110"
            style={{ backgroundSize: '200% 200%', animation: 'gradient-shift 3s ease infinite' }}
          >
            <HelpCircle className="w-8 h-8 text-white" />
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[400px] h-[550px] shadow-2xl z-50 border-2 border-purple-200 dark:border-purple-800 flex flex-col bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
          <CardHeader className="border-b-2 border-purple-100 dark:border-purple-900 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">AI Assistant</CardTitle>
                  <p className="text-xs text-purple-100 font-medium">Here to help you navigate</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-9 w-9 rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/50 to-white dark:from-gray-900 dark:to-gray-900">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Quick Guide Buttons */}
            {showGuides && messages.length === 1 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">📚 Quick Guides</p>
                {QUICK_GUIDES.map((guide, index) => (
                  <button
                    key={index}
                    onClick={() => handleGuideSelect(guide)}
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-400 transition-all text-left group"
                  >
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{guide.title}</span>
                    <ChevronRight className="w-4 h-4 text-purple-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            )}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t-2 border-purple-100 dark:border-purple-900 bg-white dark:bg-gray-900">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 border-2 border-purple-200 dark:border-purple-800 rounded-xl focus:border-purple-500 bg-gray-50 dark:bg-gray-800"
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2 font-medium">
              Powered by AI • Ask about any feature
            </p>
          </div>
        </Card>
      )}
      
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
}
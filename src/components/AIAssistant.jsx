import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Sparkles, ChevronRight, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Role-based quick guides
const ADMIN_GUIDES = [
  { 
    title: "Getting Started (Admin)",
    steps: [
      "1. Go to Dashboard to see your organization overview",
      "2. Create Divisions in the Divisions section",
      "3. Add Teams in the Teams section",
      "4. Add Players to each team in the Players section",
      "5. Schedule games in the Games section",
      "6. Assign Scorekeepers to manage live scoring"
    ]
  },
  {
    title: "How to Schedule Games",
    steps: [
      "1. Click 'Games' in the sidebar",
      "2. Click 'Schedule Game' or 'AI Generate Schedule'",
      "3. Select sport, teams, date/time, and court",
      "4. Assign scorekeepers (optional)",
      "5. Click 'Schedule Game' to save"
    ]
  },
  {
    title: "Managing Scorekeepers",
    steps: [
      "1. Go to Scorekeepers page in sidebar",
      "2. Click 'Add Scorekeeper' button",
      "3. Enter the user's email address",
      "4. Select which sports they can score",
      "5. They will receive access to score assigned games"
    ]
  },
  {
    title: "Tournament Brackets",
    steps: [
      "1. Go to Tournament Brackets page",
      "2. Click 'Create Tournament' button",
      "3. Select sport, division, and number of teams",
      "4. Seed teams in order of ranking",
      "5. Games will be auto-generated for each round"
    ]
  }
];

const SCOREKEEPER_GUIDES = [
  {
    title: "How to Score a Game",
    steps: [
      "1. Go to 'My Games' in the sidebar",
      "2. Find your assigned game",
      "3. Click 'Start Game' when ready",
      "4. Tap players to record points, rebounds, assists",
      "5. Use voice commands for hands-free scoring"
    ]
  },
  {
    title: "Using Voice Commands",
    steps: [
      "1. Click the microphone button during live scoring",
      "2. Say commands like 'Number 23, three pointer'",
      "3. The system will auto-record the stat",
      "4. Confirm the action was recorded correctly",
      "5. Continue scoring with voice or tap"
    ]
  },
  {
    title: "Managing Game Flow",
    steps: [
      "1. Use 'End Quarter' to advance periods",
      "2. Track timeouts using the timeout buttons",
      "3. Record fouls for each player",
      "4. Add notes about the game if needed",
      "5. Click 'End Game' when finished"
    ]
  }
];

const USER_GUIDES = [
  {
    title: "Register Your Team",
    steps: [
      "1. Click 'Register Team' in the sidebar",
      "2. Select your organization and sport",
      "3. Enter team name and coach details",
      "4. Add your player roster with jersey numbers",
      "5. Submit for admin approval"
    ]
  },
  {
    title: "View Standings & Stats",
    steps: [
      "1. Go to the Home page",
      "2. View team standings by division",
      "3. Check player leaderboards for top performers",
      "4. See upcoming and completed game schedules",
      "5. Filter by basketball or volleyball"
    ]
  },
  {
    title: "Social Feed",
    steps: [
      "1. Click 'Social Feed' in the sidebar",
      "2. View posts from your organization",
      "3. Create new posts with photos or videos",
      "4. Like and comment on posts",
      "5. Stay connected with your league community"
    ]
  }
];

const PUBLIC_GUIDES = [
  {
    title: "Explore ALAB Sports",
    steps: [
      "1. View live scores and standings on the Home page",
      "2. Check team and player statistics",
      "3. See upcoming game schedules",
      "4. Sign up to register a team or join a league",
      "5. Request admin access to manage your own organization"
    ]
  },
  {
    title: "How to Sign Up",
    steps: [
      "1. Click 'Get Started' on the landing page",
      "2. Create your account with email",
      "3. Choose your role (fan, player, or admin)",
      "4. Join an existing organization or request to create one",
      "5. Start exploring the platform!"
    ]
  }
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const messagesEndRef = useRef(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'super_admin', 'admin', 'scorekeeper', 'user', 'public'
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Load user and determine role
  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setUserRole('public');
        return;
      }
      
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.role === 'admin' && currentUser.is_super_admin) {
        setUserRole('super_admin');
      } else if (currentUser.role === 'admin') {
        setUserRole('admin');
      } else if (currentUser.is_scorekeeper) {
        setUserRole('scorekeeper');
      } else {
        setUserRole('user');
      }
    } catch (error) {
      setUserRole('public');
    }
  };

  // Get guides based on user role
  const getGuidesForRole = () => {
    switch (userRole) {
      case 'super_admin':
      case 'admin':
        return ADMIN_GUIDES;
      case 'scorekeeper':
        return SCOREKEEPER_GUIDES;
      case 'user':
        return USER_GUIDES;
      default:
        return PUBLIC_GUIDES;
    }
  };

  // Get welcome message based on role
  const getWelcomeMessage = () => {
    switch (userRole) {
      case 'super_admin':
        return "👋 Hi Super Admin! I can help you manage organizations, users, and platform-wide settings. Select a guide or ask me anything!";
      case 'admin':
        return "👋 Hi Admin! I can help you manage your organization, teams, games, and scorekeepers. Select a guide below or ask me anything!";
      case 'scorekeeper':
        return "👋 Hi Scorekeeper! I can help you with live scoring, voice commands, and managing games. Select a guide or ask me anything!";
      case 'user':
        return "👋 Hi! I can help you register your team, view standings, and use the social feed. Select a guide below or ask me anything!";
      default:
        return "👋 Welcome to ALAB Sports! I can help you explore the platform and get started. Select a guide below or ask me anything!";
    }
  };

  const [messages, setMessages] = useState([]);

  // Set initial message when role is determined
  useEffect(() => {
    if (userRole) {
      setMessages([{ role: "assistant", content: getWelcomeMessage() }]);
    }
  }, [userRole]);

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

      // Build role-specific context
      let roleContext = "";
      let accessibleFeatures = "";
      
      switch (userRole) {
        case 'super_admin':
          roleContext = "The user is a SUPER ADMIN with full platform access. They can manage all organizations, users, and system settings.";
          accessibleFeatures = `
SUPER ADMIN FEATURES:
- Super Admin Dashboard: Platform-wide analytics and metrics
- Organizations: Create, edit, delete any organization
- Admin Approvals: Approve/reject admin access requests
- All Teams/Games: View and manage across all organizations
- User Management: Manage all users and their roles`;
          break;
        case 'admin':
          roleContext = "The user is an ORGANIZATION ADMIN. They can manage their organization's teams, players, games, and scorekeepers.";
          accessibleFeatures = `
ADMIN FEATURES:
- Dashboard: Organization overview with stats
- Divisions: Create and manage divisions by sport
- Teams: Add/edit teams, upload logos
- Players: Manage player profiles and rosters
- Games: Schedule games, use AI schedule generator
- Scorekeepers: Assign and manage scorekeepers
- Live Scoring: Start and score games
- Statistics: View analytics and leaderboards
- Tournament Brackets: Create playoff brackets
- Roles & Permissions: Manage user roles
- Data Backup: Export organization data
- Organization Settings: Update org details`;
          break;
        case 'scorekeeper':
          roleContext = "The user is a SCOREKEEPER. They can score assigned games using the live scoring interface.";
          accessibleFeatures = `
SCOREKEEPER FEATURES:
- My Games (Scorekeeper Dashboard): View assigned games
- Live Scoring: Score games in real-time
- Voice Commands: Hands-free scoring with voice
- Social Feed: View and post to organization feed
Note: Scorekeepers cannot manage teams, players, or schedules.`;
          break;
        case 'user':
          roleContext = "The user is a REGULAR USER. They can register teams, view standings, and use the social feed.";
          accessibleFeatures = `
USER FEATURES:
- Home: View standings, schedules, and stats
- Register Team: Submit a team for admin approval
- Social Feed: Post and interact with organization
- Statistics: View public statistics
Note: Users cannot manage games or access admin features.`;
          break;
        default:
          roleContext = "The user is NOT LOGGED IN. They can view public information and sign up.";
          accessibleFeatures = `
PUBLIC FEATURES:
- View live scores and standings
- See team and player statistics
- Get Started: Create an account
- Request Admin Access: Apply to manage an organization`;
      }

      const prompt = `You are a helpful AI assistant for ALAB Sports, a basketball and volleyball league management platform.

USER ROLE: ${userRole?.toUpperCase() || 'PUBLIC'}
${roleContext}

ACCESSIBLE FEATURES FOR THIS USER:
${accessibleFeatures}

Previous conversation:
${conversationContext}

User's question: ${userMessage}

IMPORTANT INSTRUCTIONS:
1. Only provide guidance for features the user has access to based on their role.
2. If they ask about a feature they don't have access to, politely explain they need different permissions.
3. Provide step-by-step instructions when asked about features.
4. Use emojis for friendliness. Be concise but thorough.
5. Format steps with numbers (1. 2. 3.) for clarity.
6. If you're unsure about their access, suggest they contact their admin.`;

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
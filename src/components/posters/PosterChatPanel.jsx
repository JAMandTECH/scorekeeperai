import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Eraser, MessageSquare } from "lucide-react";

export default function PosterChatPanel({
  templateId,
  game,
  org,
  homeName,
  awayName,
  backgroundUrl,
  composedText,
  currentLayout,
  onRemoveBg,
  bestPlayerImageUrl,
  onApplyLayout,
  onApplyBackground,
}) {
  const [conversation, setConversation] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const autoNudgedRef = React.useRef(false);

  // Create conversation and send initial context
  React.useEffect(() => {
    let unsubscribe = null;
    if (conversation) return;
    (async () => {
      const meta = {
        ...(templateId ? { template_id: templateId } : {}),
        mode: "composer_live",
        game_id: game?.id || null,
        background_url: backgroundUrl || null,
        composed_text: composedText || null,
        org_theme: org?.theme || null,
        current_layout: currentLayout || null,
      };
      const conv = await base44.agents.createConversation({
        agent_name: "poster_enhancer",
        metadata: meta,
      });
      setConversation(conv);

      // Subscribe to live updates
      unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
        // Auto-apply results if the assistant returned structured tool results
        try {
          const last = (data.messages || []).slice().reverse().find(m => m.role === 'assistant');
          const toolCalls = last?.tool_calls || [];
          toolCalls.forEach((tc) => {
            // Expecting the agent to emit standardized function names and JSON results
            const name = (tc.name || '').toLowerCase();
            if (!tc.results) return;
            let parsed = tc.results;
            if (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); } catch (_) {}
            }
            if (name.includes('applylayout') && parsed?.layout && onApplyLayout) {
              onApplyLayout(parsed.layout);
            }
            if (name.includes('applybackground') && parsed?.background_url && onApplyBackground) {
              onApplyBackground(parsed.background_url);
            }
          });

          // If the assistant asks for a template ID or fails to read a template, auto-respond with live composer state
          const needsTemplate = /template id|template_id|posterTemplate|not found|cannot read/i.test(last?.content || '');
          if (needsTemplate && !autoNudgedRef.current) {
            autoNudgedRef.current = true;
            const state = {
              layout: currentLayout || {},
              background_url: backgroundUrl || null,
              composed_text: composedText || null,
              org_theme: org?.theme || null,
              mode: 'composer_live'
            };
            // Fire-and-forget helper message to steer the agent
            base44.agents.addMessage(conv, {
              role: 'user',
              content: `Do not use templates. Work in composer_live on the current poster. Here is the current state JSON to modify:\n\n${JSON.stringify(state, null, 2)}`
            });
          }
        } catch (_) {}
      });

      // Provide rich context so the agent can improve layout/colors/spacing/fonts
      const contextLines = [
        templateId ? `Template ID: ${templateId}` : `Mode: Live Composer (no template id)`;
        game ? `Game: ${homeName} vs ${awayName} • Final ${(game?.home_score ?? 0)}-${(game?.away_score ?? 0)} • Division ${game?.division || "N/A"}` : "Game: not selected",
        org?.theme ? `Org Colors: primary ${org.theme.primary_color}, secondary ${org.theme.secondary_color}, accent ${org.theme.accent_color}` : "Org Colors: default",
        backgroundUrl ? `Background URL available.` : "No background image yet.",
        bestPlayerImageUrl ? `Best player image provided.` : "No best player image yet.",
        "Please focus on: text sizing, fonts, spacing, gaps, alignment, arrangement, color contrast, legibility.",
        "Enhance the CURRENT COMPOSED POSTER in the generator, not a stored template. Do NOT ask for template IDs.",
        "Do NOT persist yet. Propose changes via tool calls: applyLayout {layout: ...}, applyBackground {background_url: ...}. Keep it simple and production-ready. Persist only if user explicitly says 'save template'.",
      ].join("\n");

      await base44.agents.addMessage(conv, {
        role: "user",
        content: `Context for improvement:\n${contextLines}\nInstructions: Adjust the live composed poster using tool calls (applyLayout/applyBackground). Do not ask for template IDs. Persist only if the user explicitly says \"save template\". Reply with a short summary of what you changed and why.`,
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [templateId, game?.id]);

  const handleSend = async () => {
    if (!conversation || !input.trim()) return;
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: input.trim(),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>Poster Enhancer</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRemoveBg} disabled={!bestPlayerImageUrl}>
            <Eraser className="h-4 w-4" /> Remove player background
          </Button>
          <a
            href={base44.agents.getWhatsAppConnectURL("poster_enhancer")}
            target="_blank"
            rel="noreferrer"
          >
            <Button size="sm" variant="secondary">WhatsApp</Button>
          </a>
        </div>
      </div>

      <ScrollArea className="flex-1 my-3 pr-2">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground">Start chatting to refine the poster layout and styling.</div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`${m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-card border'} rounded-2xl px-3 py-2 text-sm max-w-[80%]`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 pt-2 border-t">
        <Input
          placeholder="Ask to adjust spacing, fonts, colors, alignment..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <Button onClick={handleSend} disabled={!conversation || sending} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
        </Button>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border'} max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm`}>
        {message.content && <ReactMarkdown>{message.content}</ReactMarkdown>}
      </div>
    </div>
  );
}

export default function PosterChat() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id') || '';
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState('Make the logo 2x larger, center everything, increase spacing below the name.');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!templateId) return;
    let mounted = true;
    (async () => {
      const conv = await base44.agents.createConversation({
        agent_name: 'poster_enhancer',
        metadata: { template_id: templateId }
      });
      if (!mounted) return;
      setConversation(conv);

      // live updates
      const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
        setConversation(data);
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
      return () => unsub?.();
    })();
    return () => { mounted = false; };
  }, [templateId]);

  const messages = useMemo(() => conversation?.messages || [], [conversation]);

  const send = async () => {
    if (!input.trim() || !conversation) return;
    setLoading(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: input });
    setInput('');
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>AI Poster Enhancement</CardTitle>
            <p className="text-sm text-muted-foreground">Template: {templateId || 'Select from generator'}</p>
          </div>
          {templateId && (
            <a href={base44.agents.getWhatsAppConnectURL('poster_enhancer')} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2"><Sparkles className="w-4 h-4"/>WhatsApp</Button>
            </a>
          )}
        </CardHeader>
        <CardContent>
          <div ref={listRef} className="h-[55vh] overflow-auto rounded-lg border bg-background p-3">
            {messages.map((m) => (<MessageBubble key={m.id || Math.random()} message={m} />))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Describe how to improve the poster..."/>
            <Button onClick={send} disabled={loading || !conversation} className="gap-2">
              <Send className="w-4 h-4"/> Send
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Tip: Pass template_id in URL, e.g. /PosterChat?template_id=tpl_123</p>
        </CardContent>
      </Card>
    </div>
  );
}
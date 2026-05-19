'use client';
import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '@/lib/api';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'Which customers are most likely to churn this month?',
  'What is our current churn rate and MRR at risk?',
  'Which industry has the highest churn risk?',
  'Why are enterprise customers churning?',
  'Who are our top 5 at-risk customers by MRR?',
  'What is the average sentiment score across active customers?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI retention analyst. I have access to your live customer data and can answer questions about churn risk, MRR, customer health, and more. What would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(messageText, history);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto" style={{ height: 'calc(100vh - 48px)' }}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles size={24} className="text-indigo-400" />
          AI Analyst
        </h2>
        <p className="text-gray-400 text-sm mt-1">Ask anything about your customer data</p>
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="text-left px-4 py-3 bg-gray-900 border border-gray-800 hover:border-indigo-500 rounded-xl text-sm text-gray-300 hover:text-white transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              m.role === 'assistant' ? 'bg-indigo-600' : 'bg-gray-700'
            }`}>
              {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'assistant'
                ? 'bg-gray-900 border border-gray-800 text-gray-200'
                : 'bg-indigo-600 text-white'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 pb-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about your customers..."
          className="flex-1 bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-gray-500"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
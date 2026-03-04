import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askAI } from '../../services/ai';

/**
 * AI Asistan Tab Page
 * 
 * tarpovizyonai.netlify.app API + lokal bilgi bankası.
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestions = [
  'Buğday ekim zamanı ne zaman?',
  'Türkiye\'de en çok üretilen ürün hangisi?',
  'Organik tarım nedir?',
  'Sulama yöntemleri nelerdir?',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Gerçek AI API çağrısı
      const response = await askAI(msgText);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      {/* Header */}
      <header className="px-5 pt-safe pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
            <Bot size={22} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI Asistan</h1>
            <p className="text-[10px] text-gray-500">Tarımsal yapay zeka danışmanı</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-[140px]">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <Sparkles size={32} className="text-primary-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-300">
                Tarım AI Asistanına Hoş Geldiniz
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                Tarımsal üretim, fiyatlar ve teknikler hakkında sorular sorabilirsiniz.
              </p>
            </div>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-[300px]">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 rounded-full bg-dark-800 border border-white/5 text-[11px] text-gray-400 tap-active hover:text-primary-400 hover:border-primary-500/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Messages */
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-primary-400" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-primary-500/20 text-white'
                    : 'bg-dark-800 text-gray-200 border border-white/5'
                }`}
              >
                <div className="text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-table:text-xs">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                <p className="text-[9px] text-gray-600 mt-1.5 text-right">
                  {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={14} className="text-gray-400" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-primary-400" />
            </div>
            <div className="bg-dark-800 border border-white/5 rounded-2xl px-4 py-3">
              <Loader2 size={16} className="text-primary-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-[72px] left-0 right-0 px-4 py-3 bg-dark-900/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tarımsal bir soru sorun..."
            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={`p-2.5 rounded-xl transition-all duration-200 tap-active ${
              input.trim() && !isLoading
                ? 'bg-primary-500 text-white'
                : 'bg-dark-800 text-gray-600'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

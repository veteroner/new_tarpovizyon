import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchAIChat } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Türkiye\'de süt üretimi 2023 yılında ne kadardı?',
  'Dünya buğday ticaretinde en büyük ihracatçılar hangileri?',
  'Kırmızı et sektöründe Türkiye\'nin dünya sıralaması nedir?',
  'Tarımda dijitalleşme trendleri nelerdir?',
  'Organik tarım alanları son 10 yılda nasıl değişti?',
  'Türkiye\'nin tarımsal dış ticaret açığı ne durumda?',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetchAIChat(msg);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.success && res.reply ? res.reply : (res.error || 'Yanıt alınamadı'),
        model: res.model,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h1 className="page-title">🤖 Tarpol AI Asistan</h1>
        <p className="page-subtitle">Tarım, hayvancılık ve gıda sektörü hakkında sorularınızı sorun</p>
      </div>
      <style>{`
        .ai-assistant-prose p { color: #1e293b; margin: 0.25rem 0; }
        .ai-assistant-prose ul, .ai-assistant-prose ol { color: #1e293b; padding-left: 1.2rem; }
        .ai-assistant-prose strong { color: #0f172a; }
        .ai-assistant-prose h1, .ai-assistant-prose h2, .ai-assistant-prose h3 { color: #0f172a; font-weight: 700; margin: 0.5rem 0; }
        .ai-assistant-prose code { background: #f1f5f9; color: #0f172a; padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
        .ai-suggestion-btn:hover { background: #eff6ff !important; border-color: #93c5fd !important; }
      `}</style>

      {/* Chat Container */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 1rem', marginBottom: '1rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <div style={{ 
            flex: 1, display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', gap: '2rem',
            padding: '2rem',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌾🤖</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                Tarpol AI'ya Hoş Geldiniz
              </h2>
              <p style={{ color: '#64748b', maxWidth: '500px' }}>
                Tarım, hayvancılık, gıda güvenliği ve tarımsal dış ticaret hakkında her türlü sorunuzu sorabilirsiniz.
                AI asistan güncel verilerle desteklenen yanıtlar sunar.
              </p>
            </div>
            
            {/* Suggestion chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem', maxWidth: '700px', width: '100%' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="ai-suggestion-btn"
                  style={{
                    padding: '0.75rem 1rem', borderRadius: '1rem',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    color: '#374151', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.85rem', transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  💬 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              padding: '0.25rem 0',
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: msg.role === 'user' ? '0.75rem 1rem' : '1rem 1.25rem',
              borderRadius: msg.role === 'user' ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                : '#f8fafc',
              border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
              color: msg.role === 'user' ? '#ffffff' : '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
            }}>
              {msg.role === 'assistant' ? (
                <div className="ai-assistant-prose prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
              )}
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '0.5rem', fontSize: '0.65rem',
                color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#94a3b8',
              }}>
                <span>{msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.model && <span>⚡ {msg.model}</span>}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem' }}>
            <div style={{
              background: '#f1f5f9', borderRadius: '1rem', padding: '1rem',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#6366f1',
                    animation: `pulse 1.4s ${i * 0.2}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
              <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={{
        flexShrink: 0, padding: '0.75rem 1rem',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '900px', margin: '0 auto' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tarım, hayvancılık veya gıda hakkında bir soru sorun..."
            rows={1}
            style={{
              flex: 1, resize: 'none', padding: '0.75rem 1rem',
              borderRadius: '1rem', border: '1px solid #d1d5db',
              background: '#ffffff', color: '#0f172a',
              fontSize: '0.9rem', lineHeight: 1.5, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '1rem', border: 'none',
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                : '#e2e8f0',
              color: input.trim() && !loading ? '#fff' : '#94a3b8',
              fontWeight: 700, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontSize: '1.1rem', transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳' : '🚀'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Tarpol AI — Tarım &amp; Hayvancılık Uzmanı
        </p>
      </form>
    </div>
  );
}

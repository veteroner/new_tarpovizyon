import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askAI } from '../services/ai';
import DynamicChart from '../../components/DynamicChart';
import type { ChartConfig } from '../../components/DynamicChart';
import { NavBar } from '../components/ui/IosList';

/**
 * AI Asistan — sohbet.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Her balonun yanında 28 px'lik bir avatar kutusu vardı (🤖 / 👤). Sohbette
 * kimin konuştuğunu balonun HİZASI ve rengi zaten söylüyor; avatar her satırda
 * tekrar eden gürültüydü ve metne kalan genişliği daraltıyordu. iOS Mesajlar
 * da avatar göstermez.
 *
 * Gönder düğmesi eskiden yeşil zeminde KOYU metin taşıyordu — kontrast
 * okunaklılık sınırının altındaydı. Artık beyaz ok.
 *
 * Yazma alanı sekme çubuğunun hemen üstünde sabit; klavye açıldığında güvenli
 * alan korunuyor.
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ONERILER = [
  'Buğday ekim zamanı ne zaman?',
  'Türkiye\'de en çok üretilen ürün hangisi?',
  'Organik tarım nedir?',
  'Sulama yöntemleri nelerdir?',
];

export default function MobileAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sonRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const gonder = async (text?: string) => {
    const soru = (text ?? input).trim();
    if (!soru || isLoading) return;

    setMessages((p) => [...p, {
      id: `${Date.now()}`, role: 'user', content: soru, timestamp: new Date(),
    }]);
    setInput('');
    setIsLoading(true);

    try {
      const cevap = await askAI(soru);
      setMessages((p) => [...p, {
        id: `${Date.now() + 1}`, role: 'assistant', content: cevap.answer, timestamp: new Date(),
      }]);
    } catch {
      setMessages((p) => [...p, {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: 'Bağlantı kurulamadı. Lütfen tekrar deneyin.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saat = (d: Date) =>
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <NavBar title="AI Asistan" subtitle="Tarımsal yapay zekâ danışmanı" />

      <div className="ios-scroll ios-chat">
        {messages.length === 0 && !isLoading ? (
          <div className="ios-chat-empty">
            <p className="ios-chat-empty-title">Ne sormak istersiniz?</p>
            <p>Üretim, fiyatlar ve tarım teknikleri hakkında soru sorabilirsiniz.</p>
            <div className="ios-chips">
              {ONERILER.map((s) => (
                <button key={s} type="button" className="ios-chip" onClick={() => gonder(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`ios-bubble ios-bubble-${msg.role}`}>
              {msg.role === 'user' ? (
                <p className="ios-bubble-text">{msg.content}</p>
              ) : (
                <div className="ios-bubble-text ios-md">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...rest }) {
                        const m = /language-(\w+)/.exec(className || '');
                        if (m?.[1] === 'chart-json') {
                          try {
                            const config: ChartConfig = JSON.parse(String(children));
                            return <DynamicChart config={config} />;
                          } catch {
                            return (
                              <pre><code className={className} {...rest}>{children}</code></pre>
                            );
                          }
                        }
                        return <code className={className} {...rest}>{children}</code>;
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
              <span className="ios-bubble-time">{saat(msg.timestamp)}</span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="ios-bubble ios-bubble-assistant" aria-live="polite">
            <Loader2 size={16} className="ios-spin" aria-hidden="true" />
            <span className="sr-only">Yanıt hazırlanıyor</span>
          </div>
        )}

        <div ref={sonRef} />
      </div>

      <form
        className="ios-composer"
        onSubmit={(e) => { e.preventDefault(); gonder(); }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tarımsal bir soru sorun"
          aria-label="Sorunuz"
          enterKeyHint="send"
        />
        <button
          type="submit"
          className="ios-send"
          disabled={!input.trim() || isLoading}
          aria-label="Gönder"
        >
          <ArrowUp size={18} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </form>
    </>
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Loader2, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askAI, AIHatasi } from '../services/ai';
import DynamicChart from '../../components/DynamicChart';
import type { ChartConfig } from '../../components/DynamicChart';
import { NavBar } from '../components/ui/IosList';
import { BASIC_MENU } from '../../components/nav/menu';
import { sayfaBul, type ModelSonucu } from '../../components/nav/modelArama';

/**
 * AI Asistan — sohbet.
 *
 * ─── NEDEN CEVABIN ALTINDA SAYFA BAĞLANTISI VAR ─────────────────────────────
 * Model, uygulamanın verisine bakmıyor; kendi ezberinden konuşuyor. Ölçülen
 * örnek: "süt üretimi" sorusuna "İnek Sütü ~19,5–21 milyon ton" dedi, oysa
 * uygulamanın kendi doğrulanmış rakamı çiğ sütte 21.379.088 ton (2025) olarak
 * bir dokunuş ötede duruyordu.
 *
 * Üstelik ekran çıkmaz sokaktı: sistem istemi cevabın sonuna "En güncel
 * veriler için TarpoVizyon platformunu ziyaret edin" ekliyordu — kullanıcı
 * ZATEN platformun içindeyken. Sayfaya götüren hiçbir bağlantı yoktu.
 *
 * Artık her cevabın altında ilgili sayfa duruyor ve tek dokunuşla açılıyor.
 *
 * DİKKAT: bu, modelin yanlış rakam söylemesini ENGELLEMİYOR — doğruyu yanına
 * koyuyor. Rakamın kendisini düzeltmek, cevabı üretmeden önce modele bizim
 * verimizi vermeyi gerektiriyor; o ayrı bir adım.
 *
 * ─── NE DEĞİŞTİ (daha önce) ─────────────────────────────────────────────────
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
  /** Cevabın altında gösterilecek uygulama sayfası; aranıyorsa 'araniyor'. */
  ilgili?: ModelSonucu | null | 'araniyor';
}

const ONERILER = [
  'Buğday ekim zamanı ne zaman?',
  'Türkiye\'de en çok üretilen ürün hangisi?',
  'Organik tarım nedir?',
  'Sulama yöntemleri nelerdir?',
];

export default function MobileAIPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sonRef = useRef<HTMLDivElement>(null);

  const tumOgeler = useMemo(() => BASIC_MENU.flatMap((k) => k.items), []);

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
      const cevapId = `${Date.now() + 1}`;
      setMessages((p) => [...p, {
        id: cevapId, role: 'assistant', content: cevap, timestamp: new Date(), ilgili: 'araniyor',
      }]);

      /*
       * Sayfa arama cevabı BEKLETMİYOR: cevap ekrana basıldıktan sonra
       * arkada çalışıyor, bulununca altına iliştiriliyor. Bekletseydik
       * kullanıcı iki model çağrısının toplam süresini beklerdi.
       *
       * Soru tam bir cümle olduğu için doğrudan modele soruluyor; yerel
       * arama kelime eşleştirmesi yapıyor ve cümledeki taşıyıcı kelimeler
       * ("nedir", "ne kadar") onu yanıltıyor. Aynı soru önbellekten geliyor.
       */
      sayfaBul(soru, tumOgeler)
        .then((s) => setMessages((p) => p.map((m) => (m.id === cevapId ? { ...m, ilgili: s } : m))))
        .catch(() => setMessages((p) => p.map((m) => (m.id === cevapId ? { ...m, ilgili: null } : m))));
    } catch (e) {
      /*
       * Servisin kendi mesajı gösteriliyor: zaman aşımı, ağ yok, hız sınırı ve
       * yapılandırma eksiği farklı sorunlar. Hepsini tek "bağlantı kurulamadı"
       * metnine indirmek, kullanıcıya da bize de yanlış yönü gösteriyordu.
       */
      setMessages((p) => [...p, {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: e instanceof AIHatasi ? e.message : 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
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
      <NavBar title="TarpoVizyon AI" subtitle="Tarım ve hayvancılık asistanı" />

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
              {/*
                * İlgili sayfa balonun İÇİNDE, saatin üstünde: cevabın parçası,
                * ayrı bir mesaj değil. Model rakamı ezberinden söylüyor;
                * doğrulanmış hâli burada.
                */}
              {msg.role === 'assistant' && msg.ilgili && msg.ilgili !== 'araniyor' && (
                <button
                  type="button"
                  className="ios-kaynak"
                  onClick={() => navigate((msg.ilgili as ModelSonucu).yol)}
                >
                  <span className="ios-kaynak-ust">Uygulamadaki doğrulanmış verisi</span>
                  <span className="ios-kaynak-ad">
                    {(msg.ilgili as ModelSonucu).ad}
                    <ChevronRight size={15} aria-hidden="true" />
                  </span>
                </button>
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

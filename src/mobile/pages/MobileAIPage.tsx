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
import { sayfaVerisi } from '../../components/nav/sayfaVerisi';

/**
 * AI Asistan — sohbet.
 *
 * ─── CEVAP UYGULAMANIN KENDİ VERİSİYLE ÜRETİLİYOR ───────────────────────────
 * Model eskiden uygulamanın verisine hiç bakmıyor, kendi ezberinden
 * konuşuyordu. Ölçülen örnek: "süt üretimi" sorusuna "~19,5–21 milyon ton"
 * dedi; uygulamanın kendi doğrulanmış rakamı çiğ sütte 21.379.088 ton (2025)
 * olarak bir dokunuş ötede duruyordu.
 *
 * Üstelik ekran çıkmaz sokaktı: sistem istemi cevabın sonuna "En güncel
 * veriler için TarpoVizyon platformunu ziyaret edin" ekliyordu — kullanıcı
 * ZATEN platformun içindeyken. Sayfaya götüren hiçbir bağlantı yoktu.
 *
 * Şimdi sıra şöyle: soru → ilgili sayfa bulunur → o sayfanın ucundan son
 * satırlar çekilir → model cevabı BU satırlarla üretir. Cevabın altında da
 * rakamların geldiği sayfa duruyor, tek dokunuşla açılıyor.
 *
 * Besleme başarısız olursa (uç yok, istek düşer, süre yetmez) cevap yine
 * üretiliyor ama beslemesiz; kart o zaman "Rakamların kaynağı" değil
 * "İlgili sayfa" diyor. İki durumu aynı göstermek, beslenmemiş bir cevabı
 * doğrulanmış gibi sunmak olurdu.
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
  /** Cevabın altında gösterilecek uygulama sayfası. */
  ilgili?: ModelSonucu | null;
  /** Cevap uygulamanın kendi verisiyle mi üretildi? Kartın metnini belirliyor. */
  beslendi?: boolean;
}

/**
 * Besleme için üst sınırlar. Aşılırsa besleme atlanıyor ve cevap yine
 * üretiliyor: veri gelmedi diye kullanıcıyı cevapsız bırakmak daha kötü.
 */
const SAYFA_BULMA_MS = 3500;
const VERI_CEKME_MS = 2500;

/** Söz verilen sürede bitmezse null döner; işi iptal etmiyor, beklemeyi bırakıyor. */
function sinirliSure<T>(is: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    is.catch(() => null),
    new Promise<null>((coz) => setTimeout(() => coz(null), ms)),
  ]);
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
  /* Yükleme balonundaki metin: besleme mi sürüyor, cevap mı yazılıyor. */
  const [asama, setAsama] = useState<'veri' | 'cevap'>('cevap');
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
      /*
       * ─── BESLEME CEVAPTAN ÖNCE ────────────────────────────────────────
       * Model rakamı uydurmasın diye gerçek veriyi cevap ÜRETİLMEDEN önce
       * görmesi gerekiyor. Önce ilgili sayfa bulunuyor, sonra o sayfanın
       * ucundan son satırlar çekilip modele veriliyor.
       *
       * Ama bu her soruyu geciktirmemeli: "buğday ekim zamanı ne zaman"
       * sorusunun beslemeye ihtiyacı yok ve kullanıcı boşuna bekler. Bu
       * yüzden besleme SÜRE SINIRLI — yetişmezse cevap beslemesiz üretiliyor.
       */
      setAsama('veri');
      const sayfa = await sinirliSure(sayfaBul(soru, tumOgeler), SAYFA_BULMA_MS);
      const oge = sayfa ? tumOgeler.find((o) => o.any === sayfa.yol) : undefined;
      const veri = oge ? await sinirliSure(sayfaVerisi(oge), VERI_CEKME_MS) : null;

      setAsama('cevap');
      const cevap = await askAI(soru, veri);
      setMessages((p) => [...p, {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: cevap,
        timestamp: new Date(),
        ilgili: sayfa,
        beslendi: Boolean(veri),
      }]);
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
              {msg.role === 'assistant' && msg.ilgili && (
                <button
                  type="button"
                  className="ios-kaynak"
                  onClick={() => navigate(msg.ilgili!.yol)}
                >
                  {/*
                    * Metin, cevabın nasıl üretildiğini söylüyor. "Kaynak"
                    * ile "ilgili sayfa" aynı şey değil: besleme yapıldıysa
                    * rakamlar gerçekten o sayfadan geliyor, yapılmadıysa
                    * sayfa yalnızca konuyla ilgili.
                    */}
                  <span className="ios-kaynak-ust">
                    {msg.beslendi ? 'Rakamların kaynağı' : 'İlgili sayfa'}
                  </span>
                  <span className="ios-kaynak-ad">
                    {msg.ilgili.ad}
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
            <span className="ios-yukleniyor">
              {asama === 'veri' ? 'İlgili veriler alınıyor…' : 'Yanıt yazılıyor…'}
            </span>
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

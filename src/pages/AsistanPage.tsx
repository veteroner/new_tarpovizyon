import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, AlertCircle, User } from 'lucide-react';

import { askAI } from '../mobile/services/ai';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';

/**
 * Yapay zekâ asistanı — web.
 *
 * Mobil uygulamada vardı, webde yoktu. Aynı `askAI` servisini kullanıyor;
 * istek Netlify Function üzerinden gidiyor (anahtarlar sunucuda, istemcide
 * hiçbir anahtar yok).
 *
 * ─── ERİŞİLEBİLİRLİK ────────────────────────────────────────────────────────
 * Yanıt alanı `aria-live="polite"`: ekran okuyucu yeni cevabı odağı çalmadan
 * duyuruyor. Gönder düğmesi istek sürerken devre dışı ve durumu yazıyla da
 * bildiriyor — yalnız dönen bir çark yeterli değil.
 *
 * ─── SORUMLULUK ─────────────────────────────────────────────────────────────
 * Yanıtların hatalı olabileceği ekranın altında sabit duruyor. Mobil
 * uygulamanın kullanım şartlarında da aynı uyarı var; ikisi tutarlı.
 */

type Mesaj = { rol: 'kullanici' | 'asistan'; metin: string };

const ORNEKLER = [
  'Türkiye’de buğday üretimi son 10 yılda nasıl değişti?',
  'Çiğ süt maliyetini etkileyen başlıca kalemler neler?',
  'Kırmızı et üretiminde Türkiye dünyada nerede?',
  'Havza bazlı üretim planlaması ne demek?',
];

export default function AsistanPage() {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [giris, setGiris] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const altRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mesajlar, bekliyor]);

  async function gonder(soru: string) {
    const s = soru.trim();
    if (!s || bekliyor) return;
    setHata(null);
    setGiris('');
    setMesajlar((m) => [...m, { rol: 'kullanici', metin: s }]);
    setBekliyor(true);
    try {
      const cevap = await askAI(s);
      setMesajlar((m) => [...m, { rol: 'asistan', metin: cevap }]);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yanıt alınamadı.');
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tv-zemin)] text-[var(--tv-murekkep)] antialiased">
      <VitrinHeader />

      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 py-12 sm:px-6">
        <h1 className="text-[clamp(1.75rem,3.6vw,2.5rem)] font-semibold tracking-[-0.02em]">
          Yapay Zekâ Asistanı
        </h1>
        <p className="mt-2 text-[19px] leading-relaxed text-[var(--tv-ikincil)]">
          Tarım, hayvancılık ve gıda konularında soru sorun.
        </p>

        {mesajlar.length === 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {ORNEKLER.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => gonder(o)}
                className="rounded-[16px] border border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)] p-4 text-left text-[15px] leading-relaxed shadow-[var(--tv-golge)] transition-shadow hover:shadow-[var(--tv-golge-kart)]"
              >
                {o}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-4" aria-live="polite">
          {mesajlar.map((m, i) => (
            <div key={i} className={m.rol === 'kullanici' ? 'flex justify-end' : 'flex gap-3'}>
              {m.rol === 'asistan' && (
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--tv-vurgu-sis)] text-[var(--tv-vurgu)]">
                  <Sparkles size={16} />
                </span>
              )}
              <div
                className={
                  m.rol === 'kullanici'
                    ? 'max-w-[80%] rounded-[16px] bg-[var(--tv-vurgu)] px-4 py-3 text-[15px] leading-relaxed text-[var(--tv-vurgu-ust)]'
                    : 'max-w-[85%] whitespace-pre-wrap rounded-[16px] border border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)] px-4 py-3 text-[15px] leading-relaxed shadow-[var(--tv-golge)]'
                }
              >
                {m.metin}
              </div>
              {m.rol === 'kullanici' && (
                <span className="ml-3 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--tv-zemin-2)] text-[var(--tv-ikincil)]">
                  <User size={16} />
                </span>
              )}
            </div>
          ))}

          {bekliyor && (
            <div className="flex items-center gap-3 text-[14px] text-[var(--tv-ikincil)]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--tv-vurgu-sis)] text-[var(--tv-vurgu)]">
                <Sparkles size={16} className="animate-pulse" />
              </span>
              Yanıt hazırlanıyor…
            </div>
          )}

          {hata && (
            <div className="flex items-start gap-3 rounded-[16px] border border-[#e8c87a] bg-[#fdf6e3] p-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#8a6d1f]" />
              <p className="text-[14px] text-[#6b5416]">{hata}</p>
            </div>
          )}
          <div ref={altRef} />
        </div>

        <form
          className="sticky bottom-4 mt-8 flex gap-2 rounded-full border border-[var(--tv-cizgi)] bg-[var(--tv-kart)] p-1.5 shadow-[var(--tv-golge-kart)]"
          onSubmit={(e) => {
            e.preventDefault();
            gonder(giris);
          }}
        >
          <label htmlFor="asistan-soru" className="sr-only">
            Sorunuz
          </label>
          <input
            id="asistan-soru"
            value={giris}
            onChange={(e) => setGiris(e.target.value)}
            placeholder="Bir soru yazın…"
            className="min-h-[44px] flex-1 bg-transparent px-4 text-[16px] outline-none placeholder:text-[var(--tv-ikincil)]"
          />
          <button
            type="submit"
            disabled={bekliyor || !giris.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--tv-vurgu)] text-[var(--tv-vurgu-ust)] transition-colors hover:bg-[var(--tv-vurgu-koyu)] disabled:opacity-40"
            aria-label="Gönder"
          >
            <Send size={17} />
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--tv-ikincil)]">
          Yapay zekâ yanıtları hatalı olabilir; önemli kararlarda kaynak veriyi doğrulayın.
        </p>
      </main>

      <VitrinFooter />
    </div>
  );
}

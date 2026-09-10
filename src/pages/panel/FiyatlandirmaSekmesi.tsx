import { useEffect, useState } from 'react';
import { Tag, Check, Loader2 } from 'lucide-react';
import { ayarOku, ayarYaz, yonetimHatasi, type Ayarlar } from './yonetimApi';

/**
 * Fiyatlandırma — abonelik tutarları ve deneme süresi.
 *
 * ─── NEDEN VERİTABANINDA, KODDA DEĞİL ───────────────────────────────────────
 * Koda gömülü bir tutarı değiştirmek yeniden derleme ve dağıtım gerektirir;
 * fiyat ise ürün ömrü boyunca defalarca değişen bir şey. `ayar` tablosundan
 * okunduğu için buradan yapılan değişiklik anında geçerli oluyor.
 *
 * ─── YILLIK İNDİRİM SAKLANMIYOR, HESAPLANIYOR ───────────────────────────────
 * Ayrı bir "indirim yüzdesi" alanı tutmak, iki sayının birbiriyle çelişmesine
 * kapı açardı: aylık tutar değişince indirim alanı eski kalır ve sayfada
 * yanlış bir yüzde görünürdü. Bu depoda tam olarak bu sınıf hata pahalıya
 * patladı (hesaplanan oranlar elle güncellenmeyip aylarca yanlış kaldı).
 * Yüzde iki tutardan türetiliyor.
 */

type Alan = { anahtar: keyof Ayarlar; etiket: string; birim: string; ipucu: string };

const ALANLAR: Alan[] = [
  { anahtar: 'fiyat_aylik', etiket: 'Aylık abonelik', birim: '₺', ipucu: 'Aylık ödemede alınacak tutar' },
  { anahtar: 'fiyat_yillik', etiket: 'Yıllık abonelik', birim: '₺', ipucu: 'Peşin yıllık ödemede alınacak tutar' },
  { anahtar: 'deneme_gun', etiket: 'Ücretsiz deneme', birim: 'gün', ipucu: 'Yeni kullanıcıya verilen süre' },
];

export default function FiyatlandirmaSekmesi() {
  const [deger, setDeger] = useState<Record<string, string>>({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      try {
        const a = await ayarOku();
        if (!iptal) setDeger({ ...(a as Record<string, string>) });
      } catch {
        /* Okuma yetkisiz uç; hata olursa boş formla devam — kaydetmeye
           çalışınca gerçek hata zaten görünecek. */
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, []);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null); setKaydedildi(false); setKaydediyor(true);
    try {
      const gonderilecek: Record<string, string> = {};
      for (const { anahtar } of ALANLAR) {
        const v = (deger[anahtar] ?? '').trim();
        if (v !== '') gonderilecek[anahtar] = v;
      }
      await ayarYaz(gonderilecek);
      setKaydedildi(true);
    } catch (x) {
      setHata(yonetimHatasi(x));
    } finally { setKaydediyor(false); }
  };

  const aylik = Number(deger.fiyat_aylik);
  const yillik = Number(deger.fiyat_yillik);
  const indirim = Number.isFinite(aylik) && Number.isFinite(yillik) && aylik > 0 && yillik > 0
    ? Math.round((1 - yillik / (aylik * 12)) * 100)
    : null;

  return (
    <form className="panel-kart" onSubmit={kaydet}>
      <h2 className="panel-kart-baslik">
        <Tag size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Fiyatlandırma
      </h2>

      {yukleniyor ? (
        <p className="panel-not">Yükleniyor…</p>
      ) : (
        <>
          <div className="panel-satir">
            {ALANLAR.map(({ anahtar, etiket, birim, ipucu }) => (
              <label className="panel-alan" key={anahtar}>
                <span className="panel-etiket">{etiket} ({birim})</span>
                <input
                  className="panel-girdi"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={anahtar === 'deneme_gun' ? 1 : 0.01}
                  placeholder="—"
                  title={ipucu}
                  value={deger[anahtar] ?? ''}
                  onChange={(ev) => setDeger((d) => ({ ...d, [anahtar]: ev.target.value }))}
                />
              </label>
            ))}
          </div>

          {indirim != null && (
            <p className="panel-not" style={{ marginTop: 12 }}>
              Yıllık ödemede indirim: <b>%{indirim}</b>
              {' '}(aylık ×12 = {(aylik * 12).toLocaleString('tr-TR')} ₺ yerine {yillik.toLocaleString('tr-TR')} ₺).
              {/* Bu yüzde SAKLANMIYOR, iki tutardan hesaplanıyor — ayrı alan
                  tutmak, aylık değişince eski kalan bir indirim değeri
                  üretirdi. */}
            </p>
          )}

          {hata && <p className="panel-not" style={{ color: 'var(--danger, #dc2626)', marginTop: 10 }} role="alert">{hata}</p>}
          {kaydedildi && (
            <p className="panel-not" style={{ color: 'var(--accent, #16a34a)', marginTop: 10 }}>
              <Check size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Kaydedildi.
            </p>
          )}

          <div style={{ marginTop: 14 }}>
            <button className="panel-dugme" type="submit" disabled={kaydediyor}>
              {kaydediyor && <Loader2 size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />}
              {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>

          <p className="panel-not" style={{ marginTop: 14, fontSize: '0.78rem' }}>
            Boş bırakılan alan değiştirilmez. Değerler kaydedildiği anda geçerli
            olur; yeni sürüm yayınlamak gerekmez.
          </p>
        </>
      )}
    </form>
  );
}

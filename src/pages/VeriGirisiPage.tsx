import { useEffect, useMemo, useState } from 'react';
import { SEKTOR_FORMLARI, type SektorFormu } from './admin/sektorFormlari';

/**
 * Sektör fiyatları — rehberli veri girişi.
 *
 * ─── NEDEN IZGARANIN YANINDA AYRI BİR EKRAN ─────────────────────────────────
 * `/tarpovizyon/veri-yukle` genel amaçlı bir ızgara: her tabloyu açar, tüm
 * sütunları yan yana dizer. Sektör fiyat tablolarında bu iki sorun üretiyordu:
 *
 *  1. 14 sütun yatay kaydırma demek; hangi alanın ne olduğu belli değil.
 *  2. Sütunların yarısı HESAPLANAN oran (parite, fark, kârlılık) ama ızgarada
 *     ham alanlarla aynı görünüyor. Sonuç: ham alanlar güncellenirken
 *     hesaplananlar elle güncellenmedi ve DONDU — çiğ sütte 8, kırmızı ette 5,
 *     yumurtada 2 ay yanlış kaydedilmiş. 2026-01'de kayıtlı kârlılık %−1,82
 *     iken doğrusu %+3,54; yani sayfa zarar gösterirken gerçekte kâr vardı.
 *
 * Bu ekranda yalnızca ÖLÇÜLEN değerler giriliyor; oranları ekran hesaplıyor ve
 * formülünü de yazıyor. Yanlış hesaplama ihtimali ortadan kalkıyor.
 */

const API_BASE = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';
const ANAHTAR_DEPO = 'tarpovizyon_admin_key';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

type Satir = Record<string, number | string | null>;

/** "2026-02-01 00:00:00" → { yil: 2026, ay: 2 } */
function donemAyir(tarih: unknown): { yil: number; ay: number } | null {
  const m = String(tarih ?? '').match(/^(\d{4})-(\d{2})/);
  return m ? { yil: Number(m[1]), ay: Number(m[2]) } : null;
}

const donemMetni = (yil: number, ay: number) => `${AYLAR[ay - 1]} ${yil}`;
/** D1'deki biçimle birebir aynı olmalı, yoksa ikiz satır oluşur. */
const tarihYaz = (yil: number, ay: number) => `${yil}-${String(ay).padStart(2, '0')}-01 00:00:00`;

const sayi = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const goster = (v: number | null, basamak = 2) =>
  v === null ? '—' : v.toLocaleString('tr-TR', { maximumFractionDigits: basamak });

export default function VeriGirisiPage() {
  const [anahtar, setAnahtar] = useState(() => localStorage.getItem(ANAHTAR_DEPO) ?? '');
  const [formTablo, setFormTablo] = useState<string>(SEKTOR_FORMLARI[0].tablo);
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [durum, setDurum] = useState<{ tip: 'ok' | 'hata'; mesaj: string } | null>(null);
  const [girdiler, setGirdiler] = useState<Record<string, string>>({});
  const [yil, setYil] = useState(new Date().getFullYear());
  const [ay, setAy] = useState(new Date().getMonth() + 1);

  const form = useMemo<SektorFormu>(
    () => SEKTOR_FORMLARI.find((f) => f.tablo === formTablo) ?? SEKTOR_FORMLARI[0],
    [formTablo],
  );

  const anahtarYaz = (v: string) => {
    setAnahtar(v);
    if (v) localStorage.setItem(ANAHTAR_DEPO, v);
    else localStorage.removeItem(ANAHTAR_DEPO);
  };

  // Tablo değişince mevcut satırları çek: son dönemi bulmak ve bozukları
  // listelemek için ikisi de gerekiyor.
  useEffect(() => {
    let iptal = false;
    setSatirlar([]);
    setDurum(null);
    fetch(`${API_BASE}/api/admin/schema/${formTablo}`)
      .then(() => fetch(`${API_BASE}/api/${rotaBul(formTablo)}?limit=500`))
      .then((r) => r.json())
      .then((j) => {
        if (iptal) return;
        const d = (j.data ?? []) as Satir[];
        d.sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
        setSatirlar(d);
        // Sıradaki ay: son dönemin bir sonrası.
        const son = donemAyir(d.at(-1)?.tarih);
        if (son) {
          const sonraki = son.ay === 12 ? { yil: son.yil + 1, ay: 1 } : { yil: son.yil, ay: son.ay + 1 };
          setYil(sonraki.yil);
          setAy(sonraki.ay);
        }
      })
      .catch(() => { if (!iptal) setDurum({ tip: 'hata', mesaj: 'Mevcut satırlar okunamadı.' }); });
    return () => { iptal = true; };
  }, [formTablo]);

  const sayisalGirdiler = useMemo(() => {
    const g: Record<string, number | null> = {};
    form.girdiler.forEach((x) => { g[x.alan] = sayi(girdiler[x.alan]); });
    return g;
  }, [girdiler, form]);

  const hesaplananlar = useMemo(
    () => form.turetilenler.map((t) => ({ ...t, deger: t.hesapla(sayisalGirdiler) })),
    [sayisalGirdiler, form],
  );

  const eksikZorunlu = form.girdiler.filter((x) => x.zorunlu && sayisalGirdiler[x.alan] === null);
  const ayniDonem = satirlar.find((r) => {
    const d = donemAyir(r.tarih);
    return d && d.yil === yil && d.ay === ay;
  });

  /* Kayıtlı türetilen değerleri formülle karşılaştır — bozuk satırları bul. */
  const bozukSatirlar = useMemo(() => satirlar.filter((r) => form.turetilenler.some((t) => {
    const beklenen = t.hesapla(r as Record<string, number | null>);
    const kayitli = r[t.alan] as number | null;
    if (beklenen === null || kayitli === null || kayitli === undefined) return false;
    return Math.abs(beklenen - kayitli) > Math.max(0.01, Math.abs(beklenen) * 0.001);
  })), [satirlar, form]);

  async function yaz(govde: Record<string, unknown>, basariMesaji: string) {
    setYukleniyor(true);
    setDurum(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': anahtar },
        body: JSON.stringify(govde),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
      setDurum({ tip: 'ok', mesaj: basariMesaji });
      // Tazele
      const g = await (await fetch(`${API_BASE}/api/${rotaBul(formTablo)}?limit=500`)).json();
      const d = (g.data ?? []) as Satir[];
      d.sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
      setSatirlar(d);
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: (e as Error).message });
    } finally {
      setYukleniyor(false);
    }
  }

  function kaydet() {
    const satir: Record<string, unknown> = { [form.donemAlani]: tarihYaz(yil, ay) };
    form.girdiler.forEach((x) => { satir[x.alan] = sayisalGirdiler[x.alan]; });
    hesaplananlar.forEach((t) => { satir[t.alan] = t.deger; });
    void yaz({ tablo: form.tablo, eklenecek: [satir] },
      `${donemMetni(yil, ay)} eklendi.`);
  }

  function bozuklariDuzelt() {
    const guncellenecek = bozukSatirlar.map((r) => {
      const s: Record<string, unknown> = { id: r.id };
      form.turetilenler.forEach((t) => {
        const yeni = t.hesapla(r as Record<string, number | null>);
        if (yeni !== null) s[t.alan] = yeni;
      });
      return s;
    });
    void yaz({ tablo: form.tablo, guncellenecek },
      `${guncellenecek.length} satırın hesaplanan değerleri düzeltildi.`);
  }

  const kutu: React.CSSProperties = {
    background: 'var(--bg-card, #fff)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 16, marginBottom: 16,
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Sektör Fiyatları — Veri Girişi</h1>
        <p className="page-subtitle">
          Yalnızca ölçülen değerleri gir; oranlar (parite, fark, kârlılık) otomatik hesaplanır.
        </p>
      </div>

      {/* Anahtar */}
      <div style={kutu}>
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6 }}>Yönetici anahtarı</label>
        <input
          type="password" value={anahtar} onChange={(e) => anahtarYaz(e.target.value)}
          placeholder="Anahtarı yapıştır" className="filter-select"
          style={{ width: '100%', maxWidth: 380 }}
        />
      </div>

      {/* Tablo seçimi */}
      <div style={{ ...kutu, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
        {SEKTOR_FORMLARI.map((f) => {
          const secili = f.tablo === formTablo;
          return (
            <button
              key={f.tablo} type="button" onClick={() => { setFormTablo(f.tablo); setGirdiler({}); }}
              style={{
                textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${secili ? 'var(--accent, #16a34a)' : 'var(--border)'}`,
                background: secili ? 'rgba(22,163,74,.08)' : 'transparent', color: 'inherit',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.ad}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>{f.aciklama}</div>
            </button>
          );
        })}
      </div>

      {/* Bozuk satır uyarısı */}
      {bozukSatirlar.length > 0 && (
        <div style={{ ...kutu, borderColor: 'rgba(245,158,11,.6)', background: 'rgba(245,158,11,.06)' }}>
          <strong style={{ fontSize: '0.92rem' }}>
            {bozukSatirlar.length} satırda hesaplanan değerler ham verilerle uyuşmuyor
          </strong>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '6px 0 10px' }}>
            Bu satırlarda fiyat/maliyet güncellenmiş ama parite, fark ve kârlılık eski değerinde kalmış.
            Düzeltme yalnızca hesaplanan sütunları yeniden yazar; ölçülen değerlere dokunmaz.
          </p>
          <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: '0.8rem', marginBottom: 10 }}>
            {bozukSatirlar.map((r) => {
              const d = donemAyir(r.tarih);
              const t = form.turetilenler[form.turetilenler.length - 1];
              return (
                <div key={String(r.id)} style={{ padding: '2px 0' }}>
                  {d ? donemMetni(d.yil, d.ay) : '—'} · {t.etiket}: {goster(r[t.alan] as number)} →{' '}
                  <strong>{goster(t.hesapla(r as Record<string, number | null>))}</strong>
                </div>
              );
            })}
          </div>
          <button
            type="button" onClick={bozuklariDuzelt} disabled={!anahtar || yukleniyor}
            style={{
              minHeight: 40, padding: '0 18px', borderRadius: 999, border: 'none', fontWeight: 700,
              background: anahtar && !yukleniyor ? '#f59e0b' : 'var(--border)', color: '#fff',
              cursor: anahtar && !yukleniyor ? 'pointer' : 'not-allowed',
            }}
          >
            {yukleniyor ? 'Düzeltiliyor…' : 'Hesaplanan değerleri düzelt'}
          </button>
        </div>
      )}

      {/* Dönem + giriş */}
      <div style={kutu}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: 4 }}>Ay</label>
            <select value={ay} onChange={(e) => setAy(Number(e.target.value))} className="filter-select">
              {AYLAR.map((a, i) => <option key={a} value={i + 1}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: 4 }}>Yıl</label>
            <input type="number" value={yil} onChange={(e) => setYil(Number(e.target.value))}
              className="filter-select" style={{ width: 110 }} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingBottom: 8 }}>
            Tabloda {satirlar.length} satır var
            {satirlar.length > 0 && (() => {
              const d = donemAyir(satirlar.at(-1)?.tarih);
              return d ? ` · son dönem ${donemMetni(d.yil, d.ay)}` : '';
            })()}
          </div>
        </div>

        {ayniDonem && (
          <p style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: 0 }}>
            {donemMetni(yil, ay)} bu tabloda ZATEN VAR. Kaydedersen ikinci bir satır oluşur —
            düzeltme için ızgara ekranını kullan.
          </p>
        )}

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {form.girdiler.map((g) => (
            <div key={g.alan}>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: 4 }}>
                {g.etiket}
                {g.birim && <span style={{ color: 'var(--text-secondary)' }}> ({g.birim})</span>}
                {g.zorunlu && <span style={{ color: '#ef4444' }}> *</span>}
              </label>
              <input
                inputMode="decimal" value={girdiler[g.alan] ?? ''}
                onChange={(e) => setGirdiler((p) => ({ ...p, [g.alan]: e.target.value }))}
                className="filter-select" style={{ width: '100%' }} placeholder="—"
              />
            </div>
          ))}
        </div>

        {/* Hesaplananlar */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>
            Otomatik hesaplanan
          </div>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
            {hesaplananlar.map((t) => (
              <div key={t.alan} style={{
                padding: 10, borderRadius: 8, background: 'var(--bg-main, rgba(0,0,0,.03))',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {t.etiket}{t.birim ? ` (${t.birim})` : ''}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {goster(t.deger)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {t.formul}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <button
            type="button" onClick={kaydet}
            disabled={!anahtar || yukleniyor || eksikZorunlu.length > 0}
            style={{
              minHeight: 44, padding: '0 22px', borderRadius: 999, border: 'none', fontWeight: 700, color: '#fff',
              background: anahtar && !yukleniyor && !eksikZorunlu.length ? 'var(--accent, #16a34a)' : 'var(--border)',
              cursor: anahtar && !yukleniyor && !eksikZorunlu.length ? 'pointer' : 'not-allowed',
            }}
          >
            {yukleniyor ? 'Kaydediliyor…' : `${donemMetni(yil, ay)} olarak kaydet`}
          </button>
          {eksikZorunlu.length > 0 && (
            <span style={{ color: '#ef4444', fontSize: '0.82rem' }}>
              Zorunlu: {eksikZorunlu.map((x) => x.etiket).join(', ')}
            </span>
          )}
          {!anahtar && <span style={{ color: '#ef4444', fontSize: '0.82rem' }}>Önce yönetici anahtarını gir.</span>}
        </div>
      </div>

      {durum && (
        <div style={{
          ...kutu,
          borderColor: durum.tip === 'hata' ? 'rgba(239,68,68,.5)' : 'rgba(34,197,94,.5)',
          color: durum.tip === 'hata' ? '#ef4444' : 'inherit',
        }}>{durum.mesaj}</div>
      )}
    </div>
  );
}

/** Tablo → okuma rotası. Yazma `tablo` adıyla, okuma rotayla yapılıyor. */
function rotaBul(tablo: string): string {
  const eslem: Record<string, string> = {
    cig_sut_ekonomik_gostergeler: 'cig-sut/ekonomik-gostergeler',
    kirmizi_et_ekonomik_gostergeler: 'kirmizi-et/ekonomik-gostergeler',
    kanatli_eti_maliyet_fiyat: 'kanatli/maliyet-fiyat',
    yumurta_maliyet_fiyat: 'yumurta/maliyet-fiyat',
  };
  return eslem[tablo] ?? tablo;
}

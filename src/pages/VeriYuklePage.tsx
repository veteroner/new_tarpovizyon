import { useMemo, useRef, useState } from 'react';
import { useVeriIzgara, PENCERE, type IzgaraSatir } from './admin/useVeriIzgara';

const kutu: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 16, marginBottom: 16,
};

/** Sayfa yolunu okunur bir ada çevirir. */
const sayfaAdi = (yol: string) =>
  yol.replace('/tarpovizyon/', '').replace(/\//g, ' › ').replace(/-/g, ' ');

/** Tablo adını okunur hale getirir. */
const tabloAdi = (t: string) =>
  t.replace(/^(oner_|tuik_|fao_|tr_|il_)/, '').replace(/_/g, ' ');

/**
 * Veri düzenleme ızgarası.
 *
 * Veritabanındaki her tablo seçilebiliyor; hangi sayfalarda kullanıldığı
 * listede yazıyor ki kullanıcı neyi etkilediğini bilsin. Mevcut satırlar
 * doğrudan düzenlenebiliyor, altına elle satır eklenebiliyor veya dosyadan
 * içe aktarılıyor — içe aktarılanlar mevcutların ALTINA, "yeni" işaretiyle
 * geliyor. Hiçbir şey onaylanmadan veritabanına gitmiyor.
 *
 * Veritabanından SATIR SİLME bilinçli olarak yok: geri alınamaz ve bu ekranın
 * amacı eksik veriyi tamamlamak, veri kaybetmek değil.
 */
export default function VeriYuklePage() {
  const {
    tablolar, seciliTablo, tabloSec,
    sutunlar, yazilabilirSutunlar, satirlar,
    anahtar, anahtarKaydet,
    hucreDegistir, hucreDegisti, satirEkle, satirSil, dosyaAktar,
    degisiklikler, kaydet, yukleniyor, durum,
  } = useVeriIzgara();

  const [ara, setAra] = useState('');
  const dosyaRef = useRef<HTMLInputElement>(null);

  const suzulmus = useMemo(() => {
    const a = ara.trim().toLocaleLowerCase('tr');
    if (!a) return tablolar;
    return tablolar.filter((t) =>
      t.tablo.toLocaleLowerCase('tr').includes(a)
      || t.sayfalar.some((s) => s.toLocaleLowerCase('tr').includes(a)));
  }, [tablolar, ara]);

  const degisiklikSayisi = degisiklikler.guncellenecek.length;
  const yeniSayisi = degisiklikler.eklenecek.length;
  const kaydedilecek = degisiklikSayisi + yeniSayisi;
  const secili = tablolar.find((t) => t.tablo === seciliTablo);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🗂️ Veri Düzenle</h1>
        <p className="page-subtitle">
          Tabloyu seç, satırları düzenle veya dosyadan içe aktar, onayla.
        </p>
      </div>

      {/* Anahtar */}
      <div style={kutu}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: 6 }}>
          Yönetici anahtarı
        </label>
        <input type="password" value={anahtar} autoComplete="off"
          onChange={(e) => anahtarKaydet(e.target.value)}
          placeholder="Anahtarı yapıştır" className="filter-select"
          style={{ width: '100%', maxWidth: 420 }} />
      </div>

      {/* Tablo seçimi */}
      <div style={kutu}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: 6 }}>
          Hangi veri? <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
            ({tablolar.length} tablo)
          </span>
        </label>
        <input value={ara} onChange={(e) => setAra(e.target.value)}
          placeholder="Tablo veya sayfa adıyla ara…" className="filter-select"
          style={{ width: '100%', maxWidth: 420, marginBottom: 10 }} />

        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          {suzulmus.map((t) => (
            <button key={t.tablo} type="button" onClick={() => tabloSec(t.tablo)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', padding: '10px 12px',
                background: t.tablo === seciliTablo ? 'rgba(59,130,246,.12)' : 'transparent',
              }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{tabloAdi(t.tablo)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>
                {t.sayfalar.length
                  ? `Kullanıldığı sayfalar: ${t.sayfalar.map(sayfaAdi).join(' · ')}`
                  : 'Hangi sayfada kullanıldığı tespit edilemedi'}
              </div>
            </button>
          ))}
          {!suzulmus.length && (
            <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Eşleşen tablo yok.</div>
          )}
        </div>
      </div>

      {/* Izgara */}
      {seciliTablo && sutunlar.length > 0 && (
        <div style={kutu}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: '0.95rem' }}>{tabloAdi(seciliTablo)}</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {satirlar.length} satır gösteriliyor
              {satirlar.length >= PENCERE && ` (en son ${PENCERE})`}
            </span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={satirEkle} className="filter-select"
              style={{ cursor: 'pointer', fontWeight: 600 }}>+ Satır ekle</button>
            <button type="button" onClick={() => dosyaRef.current?.click()} className="filter-select"
              style={{ cursor: 'pointer', fontWeight: 600 }}>Dosyadan aktar</button>
            <input ref={dosyaRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) dosyaAktar(f); e.target.value = ''; }} />
          </div>

          {secili?.sayfalar.length ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 0 }}>
              Bu tabloyu değiştirmek şu sayfaları etkiler:{' '}
              <strong>{secili.sayfalar.map(sayfaAdi).join(' · ')}</strong>
            </p>
          ) : null}

          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main, rgba(0,0,0,.03))' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>#</th>
                  {yazilabilirSutunlar.map((s) => (
                    <th key={s.ad} style={{ padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                      {s.ad}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {satirlar.map((r: IzgaraSatir, i) => (
                  <tr key={r._k} style={{
                    background: r._yeni ? 'rgba(34,197,94,.08)' : 'transparent',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <td style={{ padding: '4px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {r._yeni ? 'yeni' : i + 1}
                    </td>
                    {yazilabilirSutunlar.map((s) => {
                      const degisti = hucreDegisti(r, s.ad);
                      return (
                        <td key={s.ad} style={{ padding: 2 }}>
                          <input
                            value={r[s.ad] === null || r[s.ad] === undefined ? '' : String(r[s.ad])}
                            onChange={(e) => hucreDegistir(r._k, s.ad, e.target.value)}
                            style={{
                              width: '100%', minWidth: 110, padding: '6px 8px', fontSize: '0.8rem',
                              border: `1px solid ${degisti ? '#f59e0b' : 'transparent'}`,
                              borderRadius: 6, background: degisti ? 'rgba(245,158,11,.10)' : 'transparent',
                              color: 'inherit',
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: '4px 8px' }}>
                      {r._yeni && (
                        <button type="button" onClick={() => satirSil(r._k)}
                          aria-label="Satırı kaldır"
                          style={{
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1,
                          }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kaydet */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(245,158,11,.14)', fontSize: '0.85rem' }}>
              {degisiklikSayisi} satır <strong>değişti</strong>
            </span>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(34,197,94,.14)', fontSize: '0.85rem' }}>
              {yeniSayisi} satır <strong>yeni</strong>
            </span>
            <button type="button" onClick={kaydet}
              disabled={!kaydedilecek || !anahtar || yukleniyor}
              style={{
                minHeight: 44, padding: '0 22px', borderRadius: 999, border: 'none',
                background: kaydedilecek && anahtar && !yukleniyor ? 'var(--accent, #16a34a)' : 'var(--border)',
                color: '#fff', fontWeight: 700,
                cursor: kaydedilecek && anahtar && !yukleniyor ? 'pointer' : 'not-allowed',
              }}>
              {yukleniyor ? 'Kaydediliyor…' : 'Veritabanına kaydet'}
            </button>
            {!anahtar && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Önce yönetici anahtarını gir.</span>
            )}
          </div>
        </div>
      )}

      {durum.mesaj && (
        <div style={{
          ...kutu,
          borderColor: durum.tip === 'hata' ? 'rgba(239,68,68,.5)' : 'var(--border)',
          color: durum.tip === 'hata' ? '#ef4444' : 'inherit',
        }}>{durum.mesaj}</div>
      )}
    </div>
  );
}

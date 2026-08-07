import { useRef, useState } from 'react';
import { useVeriYukle } from './admin/useVeriYukle';

const kutu: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 20, marginBottom: 16,
};

const adimBaslik: React.CSSProperties = {
  fontSize: '0.95rem', fontWeight: 700, marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 8,
};

function Rozet({ n }: { n: number }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%', background: 'var(--accent, #16a34a)',
      color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.75rem', fontWeight: 700, flex: '0 0 auto',
    }}>{n}</span>
  );
}

/**
 * Elle veri yükleme ekranı.
 *
 * TÜİK'in bir kısım serisi API'de yayımlanmıyor (bkz. useVeriYukle). Bu ekran
 * indirilen Excel/CSV dosyasını SQL veya D1 bilgisi gerektirmeden aktarıyor.
 *
 * Akış bilinçli olarak "önizle, sonra yaz": yükleme geri alınamıyor, o yüzden
 * kullanıcı kaç satırın güncelleneceğini ve kaçının YENİ ekleneceğini
 * görmeden düğme etkinleşmiyor.
 */
export default function VeriYuklePage() {
  const {
    hedefler, hedefId, setHedefId, hedef,
    anahtar, anahtarKaydet,
    dosyaAdi, basliklar, satirlar, dosyaSec,
    eslesme, setEslesme, anahtarEksik,
    gonderilecek, onizleme, onizlemeHesapla,
    yukle, durum, ilerleme,
  } = useVeriYukle();

  const dosyaRef = useRef<HTMLInputElement>(null);
  const [surukle, setSurukle] = useState(false);

  const hazir = !!hedef && !!anahtar && gonderilecek.length > 0 && anahtarEksik.length === 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📥 Veri Yükle</h1>
        <p className="page-subtitle">
          TÜİK/MEDAS'tan indirdiğin Excel veya CSV dosyasını doğrudan veritabanına aktar.
        </p>
      </div>

      {/* 1 — Anahtar */}
      <div style={kutu}>
        <div style={adimBaslik}><Rozet n={1} /> Yönetici anahtarı</div>
        <input
          type="password"
          value={anahtar}
          onChange={(e) => anahtarKaydet(e.target.value)}
          placeholder="Anahtarı yapıştır"
          className="filter-select"
          style={{ width: '100%', maxWidth: 420 }}
          autoComplete="off"
        />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '8px 0 0' }}>
          Bir kez girmen yeterli; bu tarayıcıda saklanır. Yazma yetkisi yalnızca bu anahtarla var.
        </p>
      </div>

      {/* 2 — Hedef */}
      <div style={kutu}>
        <div style={adimBaslik}><Rozet n={2} /> Hangi veri?</div>
        <select className="filter-select" value={hedefId}
          onChange={(e) => setHedefId(e.target.value)} style={{ width: '100%', maxWidth: 420 }}>
          <option value="">— seç —</option>
          {hedefler.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
        </select>
        {hedef && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '8px 0 0' }}>
            Satırları eşleştiren sütun{hedef.keys.length > 1 ? 'lar' : ''}:{' '}
            <strong>{hedef.keys.join(', ')}</strong> — dosyanda bu sütun{hedef.keys.length > 1 ? 'lar' : ''} olmalı.
          </p>
        )}
      </div>

      {/* 3 — Dosya */}
      <div style={kutu}>
        <div style={adimBaslik}><Rozet n={3} /> Dosya</div>
        <div
          onDragOver={(e) => { e.preventDefault(); setSurukle(true); }}
          onDragLeave={() => setSurukle(false)}
          onDrop={(e) => {
            e.preventDefault(); setSurukle(false);
            const f = e.dataTransfer.files?.[0];
            if (f) dosyaSec(f);
          }}
          onClick={() => dosyaRef.current?.click()}
          style={{
            border: `2px dashed ${surukle ? 'var(--accent, #16a34a)' : 'var(--border)'}`,
            borderRadius: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
            background: surukle ? 'rgba(22,163,74,0.06)' : 'transparent',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--text-secondary)', marginBottom: 6 }} aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5-5 5 5" /><path d="M12 5v12" />
          </svg>
          <div style={{ fontWeight: 600 }}>
            {dosyaAdi || 'Dosyayı buraya sürükle veya tıkla'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
            .xlsx, .xls veya .csv — ilk satır başlık olmalı
          </div>
        </div>
        <input ref={dosyaRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) dosyaSec(f); }} />
        {satirlar.length > 0 && (
          <p style={{ margin: '10px 0 0', fontSize: '0.85rem' }}>
            <strong>{satirlar.length}</strong> satır, <strong>{basliklar.length}</strong> sütun okundu.
          </p>
        )}
      </div>

      {/* 4 — Sütun eşleştirme */}
      {hedef && basliklar.length > 0 && (
        <div style={kutu}>
          <div style={adimBaslik}><Rozet n={4} /> Sütunları eşleştir</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 0 }}>
            Adı tutan sütunlar otomatik eşlendi. Yanlış olanı değiştir, gereksizleri “— yükleme —” yap.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {basliklar.map((b) => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <code style={{
                  minWidth: 150, fontSize: '0.8rem', overflowWrap: 'anywhere',
                  color: 'var(--text-secondary)',
                }}>{b}</code>
                <span style={{ color: 'var(--text-secondary)' }}>→</span>
                <select
                  className="filter-select"
                  value={eslesme[b] ?? ''}
                  onChange={(e) => setEslesme({ ...eslesme, [b]: e.target.value })}
                  style={{ flex: '1 1 180px', minWidth: 0 }}
                >
                  <option value="">— yükleme —</option>
                  {hedef.cols.map((c) => (
                    <option key={c} value={c}>
                      {c}{hedef.keys.includes(c) ? '  (eşleştirme anahtarı)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {anahtarEksik.length > 0 && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 0 }}>
              Eşleştirme anahtarı eksik: <strong>{anahtarEksik.join(', ')}</strong>.
              Bu sütun eşlenmeden yükleme yapılamaz — yoksa her satır yeni kayıt olarak eklenir.
            </p>
          )}
        </div>
      )}

      {/* 5 — Önizleme + yükleme */}
      {hedef && gonderilecek.length > 0 && anahtarEksik.length === 0 && (
        <div style={kutu}>
          <div style={adimBaslik}><Rozet n={5} /> Kontrol et ve yükle</div>

          <button type="button" className="filter-select"
            onClick={onizlemeHesapla}
            style={{ cursor: 'pointer', fontWeight: 600 }}>
            Ne olacağını göster
          </button>

          {onizleme && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(59,130,246,.12)', fontSize: '0.85rem' }}>
                  {onizleme.eslesen} satır <strong>güncellenecek</strong>
                </span>
                <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(34,197,94,.12)', fontSize: '0.85rem' }}>
                  {onizleme.yeni} satır <strong>eklenecek</strong>
                </span>
              </div>

              {/*
                * En sık yapılan hata: anahtar biçimi tutmuyor (tabloda
                * '2023-01-01 00:00:00', dosyada '2023') ve her satır yeni
                * kayıt olarak ekleniyor, tabloda ikizler oluşuyor.
                */}
              {onizleme.eslesen === 0 && (
                <div style={{
                  background: 'rgba(239,68,68,.10)', border: '1px solid rgba(239,68,68,.35)',
                  borderRadius: 10, padding: 12, fontSize: '0.85rem',
                }}>
                  <strong>Dikkat: hiçbir satır mevcut kayıtla eşleşmedi.</strong>
                  <div style={{ marginTop: 6 }}>
                    Hepsi <em>yeni kayıt</em> olarak eklenecek. Var olan veriyi güncellemek
                    istiyorsan anahtar biçimi tutmuyor demektir.
                  </div>
                  <div style={{ marginTop: 8, color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                    Dosyandaki: <code>{onizleme.ornekAnahtar.join(' · ') || '—'}</code><br />
                    Tablodaki: <code>{onizleme.mevcutOrnek.join(' · ') || '—'}</code>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={!hazir || durum.tip === 'calisiyor'}
                onClick={yukle}
                style={{
                  marginTop: 14, minHeight: 44, padding: '0 22px', borderRadius: 999, border: 'none',
                  background: hazir ? 'var(--accent, #16a34a)' : 'var(--border)',
                  color: '#fff', fontWeight: 700, cursor: hazir ? 'pointer' : 'not-allowed',
                }}
              >
                {durum.tip === 'calisiyor' ? `Yükleniyor… %${ilerleme}` : 'Veritabanına yaz'}
              </button>
            </div>
          )}
        </div>
      )}

      {durum.mesaj && (
        <div style={{
          ...kutu,
          borderColor: durum.tip === 'hata' ? 'rgba(239,68,68,.5)' : 'var(--border)',
          color: durum.tip === 'hata' ? '#ef4444' : 'inherit',
        }}>
          {durum.mesaj}
        </div>
      )}
    </div>
  );
}

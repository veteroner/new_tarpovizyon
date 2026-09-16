import { useCallback, useEffect, useState } from 'react';
import { Ticket, RefreshCw, Copy, Check } from 'lucide-react';
import { kuponlariOku, kuponOlustur, kuponDurumu, yonetimHatasi, type Kupon } from './yonetimApi';

/**
 * Kuponlar — bedava Pro erişimi veren kodlar.
 *
 * ─── KUPON ÖDEME DEĞİL ──────────────────────────────────────────────────────
 * Kupon iyzico'ya hiç uğramıyor: ortada tahsilat yok. Sunucu kodu doğrulayıp
 * doğrudan `abonelik` satırı yazıyor, erişim de zaten oradan hesaplanıyor.
 * Bu yüzden burada fiyat/plan alanı YOK — verilen şey gün.
 *
 * ─── SİLME YOK, KAPATMA VAR ─────────────────────────────────────────────────
 * Kuponu silmek, onu kullanmış kişilerin erişiminin nereden geldiğini
 * cevapsız bırakırdı. Kapatılan kupon listede kalıyor, yeni kullanım kabul
 * etmiyor; daha önce verilmiş erişimler etkilenmiyor (verilmiş gün geri
 * alınmıyor — alınsaydı kullanıcı sebepsiz erişim kaybederdi).
 */

const tarih = (sn: number | null) =>
  sn == null ? '—' : new Date(sn * 1000).toLocaleDateString('tr-TR');

/* Durumu sunucu hesaplıyor: burada `Date.now()` çağırmak hem render'ı saf
   olmaktan çıkarır hem de ziyaretçinin saatine güvenmek olurdu. */
const ROZET: Record<Kupon['durum'], { ad: string; sinif: string }> = {
  acik: { ad: 'açık', sinif: 'panel-rozet-aktif' },
  kapali: { ad: 'kapalı', sinif: 'panel-rozet-bitti' },
  tukendi: { ad: 'tükendi', sinif: 'panel-rozet-bitti' },
  suresi_doldu: { ad: 'süresi doldu', sinif: 'panel-rozet-bitti' },
};

function Rozet({ k }: { k: Kupon }) {
  const r = ROZET[k.durum] ?? ROZET.kapali;
  return <span className={`panel-rozet ${r.sinif}`}>{r.ad}</span>;
}

export default function KuponlarSekmesi() {
  const [kuponlar, setKuponlar] = useState<Kupon[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [islemde, setIslemde] = useState<string | null>(null);
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);
  const [form, setForm] = useState({ kod: '', gun: '30', azami: '1', gecerlilikGun: '', aciklama: '' });

  const yukle = useCallback(async () => {
    setYukleniyor(true); setHata(null);
    try {
      setKuponlar((await kuponlariOku()).kuponlar);
    } catch (x) {
      setHata(yonetimHatasi(x));
      setKuponlar(null);
    } finally { setYukleniyor(false); }
  }, []);

  useEffect(() => { void yukle(); }, [yukle]);

  const olustur = async (e: React.FormEvent) => {
    e.preventDefault();
    setIslemde('yeni'); setHata(null);
    try {
      const s = await kuponOlustur({
        ...(form.kod.trim() ? { kod: form.kod.trim() } : {}),
        gun: Number(form.gun),
        ...(form.azami ? { azami: Number(form.azami) } : {}),
        ...(form.gecerlilikGun ? { gecerlilikGun: Number(form.gecerlilikGun) } : {}),
        ...(form.aciklama.trim() ? { aciklama: form.aciklama.trim() } : {}),
      });
      setForm({ kod: '', gun: form.gun, azami: form.azami, gecerlilikGun: '', aciklama: '' });
      await yukle();
      /* Yeni kod hemen panoya: yönetici onu birine iletecek, elle
         kopyalarken yanlış okunması (0/O, 1/I) en olası hata. */
      try { await navigator.clipboard.writeText(s.kod); setKopyalanan(s.kod); } catch { /* pano yoksa listeden alınır */ }
    } catch (x) {
      setHata(yonetimHatasi(x));
    } finally { setIslemde(null); }
  };

  const durumDegistir = async (k: Kupon) => {
    const ac = !k.aktif;
    if (!ac && !window.confirm(`${k.kod} kapatılsın mı? Yeni kullanım kabul etmez; verilmiş erişimler sürer.`)) return;
    setIslemde(k.kod); setHata(null);
    try {
      await kuponDurumu(k.kod, ac);
      await yukle();
    } catch (x) {
      setHata(yonetimHatasi(x));
    } finally { setIslemde(null); }
  };

  const kopyala = async (kod: string) => {
    try { await navigator.clipboard.writeText(kod); setKopyalanan(kod); } catch { /* yoksay */ }
  };

  return (
    <div className="panel-kart">
      <h2 className="panel-kart-baslik" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          <Ticket size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Kuponlar
          {kuponlar && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8, fontSize: '0.85rem' }}>
            {kuponlar.length} kupon
          </span>}
        </span>
        <button type="button" className="panel-dugme" style={{ minHeight: 34, padding: '0 12px' }} onClick={() => void yukle()}>
          <RefreshCw size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} />
          Yenile
        </button>
      </h2>

      <p className="panel-not">
        Kupon, kullanıcıya ücretsiz Pro erişimi verir; ödeme alınmaz, kart
        istenmez. Kullanıcı kodu abonelik sayfasına giriyor.
      </p>

      {hata && <p className="panel-not" style={{ color: 'var(--danger, #dc2626)' }} role="alert">{hata}</p>}

      <form className="panel-kupon-form" onSubmit={olustur}>
        <label className="panel-alan">
          <span className="panel-etiket">Kod <span style={{ fontWeight: 400, opacity: .7 }}>(boş bırakılırsa üretilir)</span></span>
          <input className="panel-girdi" value={form.kod} placeholder="TARIM2026"
            onChange={(e) => setForm({ ...form, kod: e.target.value })} />
        </label>
        <label className="panel-alan">
          <span className="panel-etiket">Gün</span>
          <input className="panel-girdi" type="number" min={1} max={3650} required value={form.gun}
            onChange={(e) => setForm({ ...form, gun: e.target.value })} />
        </label>
        <label className="panel-alan">
          <span className="panel-etiket">Kaç kişi</span>
          <input className="panel-girdi" type="number" min={1} max={100000} value={form.azami}
            onChange={(e) => setForm({ ...form, azami: e.target.value })} />
        </label>
        <label className="panel-alan">
          <span className="panel-etiket">Son geçerlilik <span style={{ fontWeight: 400, opacity: .7 }}>(gün, boş = süresiz)</span></span>
          <input className="panel-girdi" type="number" min={1} value={form.gecerlilikGun}
            onChange={(e) => setForm({ ...form, gecerlilikGun: e.target.value })} />
        </label>
        <label className="panel-alan panel-alan-genis">
          <span className="panel-etiket">Açıklama</span>
          <input className="panel-girdi" value={form.aciklama} placeholder="Fuar katılımcıları"
            onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
        </label>
        <button className="panel-dugme" type="submit" disabled={islemde === 'yeni'}>
          {islemde === 'yeni' ? 'Oluşturuluyor…' : 'Kupon oluştur'}
        </button>
      </form>

      {yukleniyor ? (
        <p className="panel-not">Yükleniyor…</p>
      ) : !kuponlar ? null : kuponlar.length === 0 ? (
        <p className="panel-not">Henüz kupon yok.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="panel-tablo">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Durum</th>
                <th className="panel-sayi">Gün</th>
                <th className="panel-sayi">Kullanım</th>
                <th>Son geçerlilik</th>
                <th>Açıklama</th>
                <th>Oluşma</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {kuponlar.map((k) => (
                <tr key={k.kod}>
                  <td>
                    <code className="panel-kod">{k.kod}</code>
                    <button type="button" className="panel-kopyala" onClick={() => void kopyala(k.kod)}
                      title="Kodu kopyala" aria-label={`${k.kod} kodunu kopyala`}>
                      {kopyalanan === k.kod
                        ? <Check size={13} aria-hidden="true" />
                        : <Copy size={13} aria-hidden="true" />}
                    </button>
                  </td>
                  <td><Rozet k={k} /></td>
                  <td className="panel-sayi">{k.gun}</td>
                  <td className="panel-sayi">{k.kullanilan} / {k.azami}</td>
                  <td>{tarih(k.gecerlilik)}</td>
                  <td>{k.aciklama ?? '—'}</td>
                  <td>{tarih(k.olusma)}</td>
                  <td>
                    <button type="button" className="panel-dugme panel-dugme-kucuk"
                      disabled={islemde === k.kod} onClick={() => void durumDegistir(k)}>
                      {k.aktif ? 'Kapat' : 'Aç'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

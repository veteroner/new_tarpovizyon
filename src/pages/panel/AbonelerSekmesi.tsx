import { useCallback, useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { aboneleriOku, abonelikDegistir, yonetimHatasi, type Abone } from './yonetimApi';

/**
 * Aboneler — kayıtlı kullanıcılar ve abonelik durumları.
 *
 * ─── LİSTE KİŞİSEL VERİ ─────────────────────────────────────────────────────
 * E-posta adresi gösteriyor. Uç `yetkili()` denetimi olmadan tek satır bile
 * döndürmüyor ve yanıt `Cache-Control: no-store` ile geliyor — ne tarayıcıda
 * ne kenarda saklanıyor.
 *
 * ─── "AKTİF" DURUMU SUNUCUDA HESAPLANIYOR ───────────────────────────────────
 * Tabloda yazan `durum` tek başına yeterli değil: bitişi geçmiş bir kayıt
 * hâlâ 'aktif' yazıyor olabilir. Sunucu tarihe bakıp `aktif` alanını
 * hesaplıyor, burada yalnız gösteriliyor.
 */

const tarih = (sn: number | null) =>
  sn == null ? '—' : new Date(sn * 1000).toLocaleDateString('tr-TR');

function DurumRozeti({ a }: { a: Abone }) {
  if (!a.aktif) return <span className="panel-rozet panel-rozet-bitti">{a.durum === 'iptal' ? 'iptal' : 'süresi doldu'}</span>;
  if (a.durum === 'deneme') return <span className="panel-rozet panel-rozet-deneme">deneme</span>;
  return <span className="panel-rozet panel-rozet-aktif">aktif</span>;
}

export default function AbonelerSekmesi() {
  const [veri, setVeri] = useState<{ toplam: number; aktifSayisi: number; aboneler: Abone[] } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [islemde, setIslemde] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true); setHata(null);
    try {
      setVeri(await aboneleriOku());
    } catch (x) {
      setHata(yonetimHatasi(x));
      setVeri(null);
    } finally { setYukleniyor(false); }
  }, []);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      try {
        const v = await aboneleriOku();
        if (!iptal) setVeri(v);
      } catch (x) {
        if (!iptal) setHata(yonetimHatasi(x));
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, []);

  const islem = async (a: Abone, tur: 'uzat' | 'iptal') => {
    /*
     * İPTAL ONAY İSTİYOR, uzatma istemiyor. Ayrım kasıtlı: uzatma yanlışlıkla
     * yapılırsa geri alınabilir (iptal edilir), iptal ise kullanıcının
     * erişimini o an kesiyor.
     */
    if (tur === 'iptal' && !window.confirm(`${a.eposta} aboneliği iptal edilsin mi?`)) return;
    setIslemde(a.id); setHata(null);
    try {
      await abonelikDegistir(a.id, tur, tur === 'uzat' ? 30 : undefined);
      await yukle();
    } catch (x) {
      setHata(yonetimHatasi(x));
    } finally { setIslemde(null); }
  };

  return (
    <div className="panel-kart">
      <h2 className="panel-kart-baslik" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          <Users size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Aboneler
          {veri && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8, fontSize: '0.85rem' }}>
            {veri.toplam} kayıt · {veri.aktifSayisi} aktif
          </span>}
        </span>
        <button type="button" className="panel-dugme" style={{ minHeight: 34, padding: '0 12px' }} onClick={() => void yukle()}>
          <RefreshCw size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} />
          Yenile
        </button>
      </h2>

      {hata && <p className="panel-not" style={{ color: 'var(--danger, #dc2626)' }} role="alert">{hata}</p>}

      {yukleniyor ? (
        <p className="panel-not">Yükleniyor…</p>
      ) : !veri ? null : veri.aboneler.length === 0 ? (
        <p className="panel-not">Henüz kayıtlı kullanıcı yok.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="panel-tablo">
            <thead>
              <tr>
                <th>E-posta</th>
                <th>Durum</th>
                <th className="panel-sayi">Kalan</th>
                <th>Bitiş</th>
                <th>Kayıt</th>
                <th>Son giriş</th>
                <th className="panel-sayi">Oturum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {veri.aboneler.map((a) => (
                <tr key={a.id}>
                  <td>{a.eposta}</td>
                  <td><DurumRozeti a={a} /></td>
                  <td className="panel-sayi">{a.kalanGun ?? '—'}</td>
                  <td>{tarih(a.bitis)}</td>
                  <td>{tarih(a.olusma)}</td>
                  <td>{tarih(a.sonGiris)}</td>
                  <td className="panel-sayi">{a.acikOturum}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="panel-dugme"
                      style={{ minHeight: 30, padding: '0 10px', fontSize: '0.8rem' }}
                      disabled={islemde === a.id}
                      onClick={() => void islem(a, 'uzat')}
                    >
                      +30 gün
                    </button>
                    {a.aktif && (
                      <button
                        type="button"
                        className="panel-dugme"
                        style={{
                          minHeight: 30, padding: '0 10px', fontSize: '0.8rem',
                          marginLeft: 6, background: 'var(--danger, #dc2626)',
                        }}
                        disabled={islemde === a.id}
                        onClick={() => void islem(a, 'iptal')}
                      >
                        İptal
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="panel-not" style={{ marginTop: 12, fontSize: '0.78rem' }}>
        Uzatma mevcut bitiş tarihinden başlar, bugünden değil — süresi dolmamış
        bir aboneliği uzatmak kalan günleri yakmaz.
      </p>
    </div>
  );
}

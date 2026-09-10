import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Database, Coins, Tag, Users, LogOut } from 'lucide-react';
import { PanelKapisi } from './PanelKapisi';
import { panelCikis, panelGecerliMi } from './yonetimApi';
import './panel.css';

const VeriYuklePage = lazy(() => import('../VeriYuklePage'));
const VeriGirisiPage = lazy(() => import('../VeriGirisiPage'));
const FiyatlandirmaSekmesi = lazy(() => import('./FiyatlandirmaSekmesi'));
const AbonelerSekmesi = lazy(() => import('./AbonelerSekmesi'));

/**
 * Yönetim paneli — tek kabuk, sekmeli.
 *
 * ─── NEDEN BİRLEŞTİRİLDİ ────────────────────────────────────────────────────
 * Yönetim iki bağımsız sayfaydı (`/tarpovizyon/veri-yukle`,
 * `/tarpovizyon/veri-girisi`); aralarında gezinme bağı yoktu ve her birine
 * ayrı ayrı girilip TOTP yazılıyordu. Abonelik geldiğinde yönetilecek şey
 * artıyor (fiyat, indirim, abone listesi); bunları üçüncü ve dördüncü
 * bağımsız sayfa olarak eklemek dağınıklığı büyütürdü.
 *
 * ─── SAYFALARIN İÇİNE DOKUNULMADI ───────────────────────────────────────────
 * Kabuk yalnızca sekme çubuğu + içerik. İki mevcut sayfa OLDUĞU GİBİ
 * çiziliyor; kimlik akışları, anahtar saklama ve veri yazma yolları hiç
 * değişmedi. Bilerek: çalışan bir veri giriş ekranını taşırken yeniden yazmak,
 * yanlış kaydedilen bir fiyat kadar pahalıya patlayabilir. Birleştirme
 * GEZİNME düzeyinde kalıyor.
 *
 * Zaten ortak bir yanları vardı: ikisi de aynı `localStorage` anahtarını
 * (`tarpovizyon_admin_key`) okuyor, yani sekme değiştirince TOTP yeniden
 * sorulmuyor.
 *
 * ─── SEKME NEDEN URL'DE ─────────────────────────────────────────────────────
 * `?sekme=` sorgu parametresinde: yerel durumda tutulsaydı tarayıcının geri
 * tuşu paneli tümüyle terk eder, sekme yer imine alınamaz ve sayfa
 * yenilenince ilk sekmeye dönerdi.
 */

const SEKMELER = [
  { id: 'veri', ad: 'Veri Izgarası', ikon: Database },
  { id: 'sektor', ad: 'Sektör Fiyatları', ikon: Coins },
  { id: 'fiyat', ad: 'Fiyatlandırma', ikon: Tag },
  { id: 'aboneler', ad: 'Aboneler', ikon: Users },
] as const;

type SekmeId = typeof SEKMELER[number]['id'];

export default function PanelKabugu() {
  /*
   * KAPI EN DIŞTA ve kararı SUNUCU veriyor.
   *
   * Üç durum var ve üçü de gerekli:
   *   'soruluyor' → hiçbir şey çizilmiyor. Kapıyı göstermek de yanlış olurdu:
   *                 geçerli oturumu olan kullanıcı her açılışta bir an giriş
   *                 ekranı görürdü.
   *   'acik'      → kabuk.
   *   'kapali'    → kapı.
   *
   * Önceki hali yerel bir dizeye bakıyordu; uydurma bir değer yazan biri
   * sekme adlarını ve panelin yapısını görebiliyordu. Artık jeton sunucuya
   * doğrulatılıyor (`admin/panel-ben`).
   */
  const [durum, setDurum] = useState<'soruluyor' | 'acik' | 'kapali'>('soruluyor');
  const [params, setParams] = useSearchParams();
  const istenen = params.get('sekme') as SekmeId | null;
  const sekme: SekmeId = SEKMELER.some((s) => s.id === istenen) ? istenen! : 'veri';

  const sec = (id: SekmeId) => {
    const y = new URLSearchParams(params);
    y.set('sekme', id);
    /* `replace` DEĞİL push: sekme geçişi kullanıcı için bir gezinme adımı,
       geri tuşu önceki sekmeye dönmeli. */
    setParams(y);
  };

  useEffect(() => {
    let iptal = false;
    void panelGecerliMi().then((g) => { if (!iptal) setDurum(g ? 'acik' : 'kapali'); });
    return () => { iptal = true; };
  }, []);

  if (durum === 'soruluyor') return null;
  if (durum === 'kapali') return <PanelKapisi acildi={() => setDurum('acik')} />;

  const cikis = async () => {
    await panelCikis();
    setDurum('kapali');
  };

  return (
    <div className="panel">
      <header className="panel-bas">
        <div className="panel-bas-satir">
          <div>
            <h1 className="panel-baslik">Yönetim Paneli</h1>
            <p className="panel-alt">
              Veri girişi, fiyatlandırma ve abonelik yönetimi
            </p>
          </div>
          <button type="button" className="panel-cikis" onClick={() => void cikis()}>
            <LogOut size={14} aria-hidden="true" /> Çıkış
          </button>
        </div>
      </header>

      <nav className="panel-sekmeler" aria-label="Panel bölümleri">
        {SEKMELER.map(({ id, ad, ikon: Ikon }) => (
          <button
            key={id}
            type="button"
            className={`panel-sekme${sekme === id ? ' panel-sekme-aktif' : ''}`}
            aria-current={sekme === id ? 'page' : undefined}
            onClick={() => sec(id)}
          >
            <Ikon size={15} aria-hidden="true" />
            {ad}
          </button>
        ))}
      </nav>

      <div className="panel-icerik">
        <Suspense fallback={<div className="loading"><div className="loading-spinner" /></div>}>
          {sekme === 'veri' && <VeriYuklePage />}
          {sekme === 'sektor' && <VeriGirisiPage />}
          {sekme === 'fiyat' && <FiyatlandirmaSekmesi />}
          {sekme === 'aboneler' && <AbonelerSekmesi />}
        </Suspense>
      </div>
    </div>
  );
}

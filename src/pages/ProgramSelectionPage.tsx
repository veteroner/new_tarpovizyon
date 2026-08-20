import { useNavigate } from 'react-router-dom';
import { Calculator, Wheat, Droplets, FlaskConical, Calendar, BarChart3 } from 'lucide-react';
import './ProgramSelectionPage.css';

/**
 * TARPOL giriş sayfası — sitenin kök adresi.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Sayfa yedi kartı eşit ağırlıkta, koyu yeşil bir zeminde ve her biri ayrı
 * renkte gösteriyordu. İki sorunu vardı:
 *
 *   • PRO SÜRÜM HERKESE AÇIKTI. "Tarpovizyon — Tarım İstihbarat ve Analiz
 *     Platformu" kartı listede duruyordu; oysa Pro yayınlanmadı ve ayrı bir
 *     sürüm olarak, lisansla gelecek. Kart kaldırıldı — adres hâlâ çalışıyor,
 *     yalnızca vitrinde durmuyor.
 *
 *   • "Basic" ADI DIŞARI SIZIYORDU. Ziyaretçi elindekinin "basit sürüm"
 *     olduğunu öğrenmek zorunda değil; ayrım bizim iç ayrımımız. Açıklamadaki
 *     "Looker Studio raporunun D1 tabanlı arayüzü" gibi iç jargon da gitti —
 *     kullanıcıya verinin nereden taşındığı değil, ne bulacağı söylenmeli.
 *
 * ─── HİYERARŞİ ──────────────────────────────────────────────────────────────
 * Veri platformu artık tek başına ve büyük; araçlar altında ikinci sırada.
 * Yedi eşit kart, hepsini eşit derecede önemsiz gösteriyordu — oysa siteye
 * gelenlerin çoğu veriye geliyor, araçlar yanında duran şeyler.
 */

const ARACLAR = [
  {
    id: 'rasyon',
    title: 'Rasyon',
    description: 'Hayvan besleme ve rasyon optimizasyonu',
    icon: Calculator,
    color: '#16a34a',
    path: '/rasyon',
  },
  {
    id: 'hasat',
    title: 'Hasat Tahmini',
    description: 'Geçmiş veriye dayalı verim ve hasat tahmini',
    icon: Wheat,
    color: '#d97706',
    path: '/hasat-tahmini',
  },
  {
    id: 'sulama',
    title: 'Sulama Planlayıcı',
    description: 'Su ihtiyacı ve sulama programı hesaplama',
    icon: Droplets,
    color: '#2563eb',
    path: '/sulama-plan',
  },
  {
    id: 'gubre',
    title: 'Gübre Hesaplayıcı',
    description: 'Toprak analizine göre NPK reçetesi',
    icon: FlaskConical,
    color: '#7c3aed',
    path: '/gubre-hesap',
  },
  {
    id: 'takvim',
    title: 'Tarımsal Takvim',
    description: 'Bölgesel görev ve sezon planlayıcı',
    icon: Calendar,
    color: '#db2777',
    path: '/tarim-takvim',
  },
];

export function ProgramSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="tarpol-giris">
      <div className="tarpol-giris__kap">
        <header className="tarpol-giris__ust">
          <h1 className="tarpol-giris__ad">TARPOL</h1>
          <p className="tarpol-giris__alt">Tarım Politika ve Yönetim Araçları</p>
        </header>

        {/*
          * Veri platformu tek başına ve geniş: siteye gelenlerin çoğunun
          * aradığı şey bu. Araçlar altında, kendi ızgarasında.
          */}
        <button
          type="button"
          className="tarpol-ana"
          onClick={() => navigate('/tarpovizyon-basic')}
        >
          <span className="tarpol-ana__ikon"><BarChart3 size={30} /></span>
          <span className="tarpol-ana__govde">
            <span className="tarpol-ana__ad">TarpoVizyon</span>
            <span className="tarpol-ana__aciklama">
              Türkiye ve dünya tarım verileri — üretim, fiyat, dış ticaret ve
              il bazında istatistikler
            </span>
            <span className="tarpol-ana__etiket">
              84 veri sayfası · TÜİK ve FAO kaynaklı · yapay zekâ asistanı
            </span>
          </span>
          <span className="tarpol-ana__ok" aria-hidden="true">→</span>
        </button>

        <h2 className="tarpol-giris__baslik">Araçlar</h2>

        <div className="tarpol-izgara">
          {ARACLAR.map((a) => {
            const Ikon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                className="tarpol-kart"
                onClick={() => navigate(a.path)}
                style={{ '--vurgu': a.color } as React.CSSProperties}
              >
                <span className="tarpol-kart__ikon"><Ikon size={22} /></span>
                <span className="tarpol-kart__ad">{a.title}</span>
                <span className="tarpol-kart__aciklama">{a.description}</span>
              </button>
            );
          })}
        </div>

        <footer className="tarpol-giris__dip">
          <p>© 2026 TARPOL · Tarım Politika ve Yönetim Araçları</p>
        </footer>
      </div>
    </div>
  );
}

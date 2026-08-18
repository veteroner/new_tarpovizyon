import { BolumKategorileri } from '../charts/BolumKategorileri';
import { KartIzgarasi } from './hayvansal/KartIzgarasi';
import { useHayvansalKartlar } from './hayvansal/useHayvansalKartlar';

/**
 * Hayvancılığın iniş sayfası — yalnızca kartlar.
 *
 * ─── NEDEN SADECE KARTLAR ───────────────────────────────────────────────────
 * Başlangıçta Pro'dan taşınan grafikler de buradaydı; sayfa uzayınca kartların
 * altında kalıyor ve aynı grafik hem burada hem kartın detayında iki kez
 * duruyordu. Grafikler ilgili kartın detayına taşındı — burada kalan tek iş
 * "durum ne" sorusuna tek ekranda cevap vermek.
 *
 * En altta `BolumKategorileri` "başka ne var" sorusunu cevaplıyor; ayrı bir
 * menü ekranı koymadık, o herkese her girişte kalıcı bir tık maliyeti
 * bindirirdi.
 */

export function HayvansalUretimOzetPage() {
  const { yukleniyor, varlik, uretim } = useHayvansalKartlar();

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner tvb-page__banner--orange">Hayvansal Üretim — Türkiye</div>
      {yukleniyor
        ? <p className="tvb-status">Yükleniyor…</p>
        : <KartIzgarasi varlik={varlik} uretim={uretim} />}
      <BolumKategorileri bolumYolu="genel" />
    </div>
  );
}

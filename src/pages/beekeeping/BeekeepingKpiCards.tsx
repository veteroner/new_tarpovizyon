import { Hexagon, Package, Users, Wheat } from 'lucide-react';
import { StatCard } from '../../components/ui/Card';
import { type KpiMetrics, formatNumber, formatTon } from './beekeepingTypes';

/**
 * Arıcılık KPI kartları.
 *
 * Eskiden dört kart da degrade zemin + beyaz yazıyla elle kuruluydu — aynı
 * şablonun `MilkEconomicsSection` ve `MilkTuikSection`'a da kopyalanmış hâli.
 * Ortak kart katmanı (`StatCard`) zaten vardı ve hiçbir sayfa kullanmıyordu.
 *
 * Renk artık kartın zeminini boyamıyor: kimliği ikon, değişimi delta rengi
 * (ok işaretiyle birlikte) taşıyor. Degradenin üstündeki %80 opak beyaz alt
 * yazı zaten WCAG kontrast sınırının altındaydı.
 */
export function BeekeepingKpiCards({ kpiMetrics, sonYil, oncekiYil }: {
  kpiMetrics: KpiMetrics;
  /* Yıllar veriden geliyor; etiketlere sabit yıl yazmak, uca yeni yıl
     eklendiğinde sayının değişip yazının kalmasına yol açıyordu. */
  sonYil: string;
  oncekiYil: string;
}) {
  return (
    <div className="kpi-grid">
      <StatCard
        label="Toplam arıcı sayısı"
        value={formatNumber(kpiMetrics.totalBeekeepers)}
        delta={kpiMetrics.beekeeperGrowth}
        sub={`${sonYil} / ${oncekiYil}`}
        icon={<Users size={18} aria-hidden="true" />}
      />
      {/* Yıllar ölçü başına ayrı: TÜİK ülke satırı kovan/balmumuda bir yıl
          geride, bal ayrı tablodan geliyor. Üçüne tek yıl yazmak yanlış. */}
      <StatCard
        label="Toplam kovan sayısı"
        value={formatNumber(kpiMetrics.totalHives)}
        sub={`Aktif kovan (${kpiMetrics.kovanYili})`}
        icon={<Package size={18} aria-hidden="true" />}
      />
      <StatCard
        label="Bal üretimi"
        value={formatTon(kpiMetrics.totalHoneyProduction)}
        sub={`Yıllık toplam (${kpiMetrics.balYili})`}
        icon={<Wheat size={18} aria-hidden="true" />}
      />
      <StatCard
        label="Balmumu üretimi"
        value={formatTon(kpiMetrics.totalBeeswaxProduction)}
        sub={`Yıllık toplam (${kpiMetrics.kovanYili})`}
        icon={<Hexagon size={18} aria-hidden="true" />}
      />
    </div>
  );
}

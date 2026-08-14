import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { OranCubugu } from '../charts/OranCubugu';
import { YearlyChart } from '../charts/YearlyChart';

export type MakroOzetPageConfig = { title: string };

export function MakroOzetPage({ config }: { config: MakroOzetPageConfig }) {
  const { data: veriler } = useQuery({ queryKey: ['tvb-makro-veriler'], queryFn: () => fetchRows('makro/veriler') });
  const { data: gsyh } = useQuery({ queryKey: ['tvb-makro-gsyh'], queryFn: () => fetchRows('makro/tarim-gsyh', { limit: '100' }) });
  const { data: ticaret } = useQuery({ queryKey: ['tvb-makro-disticaret'], queryFn: () => fetchRows('makro/tarim-disticaret', { limit: '100' }) });

  const v = veriler?.[0];
  const gsyhData = (gsyh ?? []).map((r) => ({ yil: r.yil, toplam: r.toplam_gsyh_milyar_usd, tarim: r.tarim_gsyh_milyar_usd }));
  const ticaretData = (ticaret ?? []).map((r) => ({ yil: r.yil, ihracat: r.ihracat_milyar_usd, ithalat: r.ithalat_milyar_usd }));

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      {/* Üçü de "tarımın toplam içindeki payı" — 0–100 arası, hedefi olmayan
          oranlar. Eşik verilmiyor: burada "az" ya da "çok" diye bir yargı yok,
          renk de bu yüzden yargısız. */}
      {v && (
        <div className="tvb-oran-liste">
          <OranCubugu label="TARIMIN GSYH'DEKİ PAYI" deger={Number(v.gsyh_pay)} olcekEtiketleri={['%0', '%100']} neutral />
          <OranCubugu label="TARIMIN İHRACATTAKİ PAYI" deger={Number(v.ihracat_pay)} olcekEtiketleri={['%0', '%100']} neutral />
          <OranCubugu label="TARIMIN İSTİHDAMDAKİ PAYI" deger={Number(v.istihdam_pay)} olcekEtiketleri={['%0', '%100']} neutral />
        </div>
      )}

      {gsyhData.length > 0 && (
        <div className="tvb-section">
          {/* Toplam GSYH (~1000 Mr$) dwarfs tarım GSYH (~60 Mr$); a shared axis
              flattens the farm line, so tarım rides its own right axis. */}
          <YearlyChart
            data={gsyhData as unknown as Record<string, number | string>[]}
            xKey="yil"
            series={[
              { key: 'toplam', label: 'Türkiye Toplam GSYH (Milyar-$)', type: 'bar' },
              { key: 'tarim', label: 'Türkiye Tarım GSYH (Milyar-$)', type: 'bar', axis: 'right' },
            ]}
          />
        </div>
      )}

      {ticaretData.length > 0 && (
        <div className="tvb-section">
          <YearlyChart
            data={ticaretData as unknown as Record<string, number | string>[]}
            xKey="yil"
            series={[
              { key: 'ihracat', label: 'Tarım İhracat (Milyar $)', type: 'bar' },
              { key: 'ithalat', label: 'Tarım İthalat (Milyar $)', type: 'bar' },
            ]}
          />
        </div>
      )}
    </div>
  );
}

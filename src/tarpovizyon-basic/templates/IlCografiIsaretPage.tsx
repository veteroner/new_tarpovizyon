import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { TurkeyProvinceMap } from '../charts/TurkeyProvinceMap';
import { RankingBlock } from '../charts/RankingBlock';

export type IlCografiIsaretPageConfig = { title: string };

export function IlCografiIsaretPage({ config }: { config: IlCografiIsaretPageConfig }) {
  const { data } = useQuery({
    queryKey: ['tvb-cografi-isaret'],
    queryFn: () => fetchRows('il-duzeyinde/cografi-isaret', { limit: '2000' }),
  });
  const rows = data ?? [];

  const countByIl = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const il = String(r.il ?? '');
      if (!il) return;
      map.set(il, (map.get(il) ?? 0) + 1);
    });
    return map;
  }, [rows]);

  const items = Array.from(countByIl.entries()).map(([name, value]) => ({ name, value }));
  const mapValues = Object.fromEntries(countByIl);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      <div className="tvb-page__controls">
        <KpiCard label="Coğrafi İşaretli Ürün Sayısı" value={formatNumber(rows.length)} />
        <KpiCard label="Coğrafi İşaretli Ürünü Olan İl Sayısı" value={formatNumber(items.length)} />
      </div>

      {items.length > 0 && (
        <>
          <div className="tvb-section">
            <h3>İllere Göre Coğrafi İşaretli Ürün Sayısı</h3>
            <TurkeyProvinceMap values={mapValues} />
          </div>
          <div className="tvb-section">
            <RankingBlock items={items} />
          </div>
        </>
      )}

      <div className="tvb-section">
        <h3>Coğrafi İşaretli Tarım Ürünleri ({rows.length} kayıt)</h3>
        <div className="tvb-table-wrap">
          <table className="tvb-table">
            <thead>
              <tr>
                <th>İl</th>
                <th>Coğrafi İşaretin Adı</th>
                <th>Ürün Grubu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{String(r.il)}</td>
                  <td>{String(r.cografi_isaret_adi)}</td>
                  <td>{String(r.urun_grubu ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

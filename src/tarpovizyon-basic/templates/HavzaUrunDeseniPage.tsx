import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { HavzaDistrictMap } from '../charts/HavzaDistrictMap';

export type HavzaUrunDeseniPageConfig = { title: string };

export function HavzaUrunDeseniPage({ config }: { config: HavzaUrunDeseniPageConfig }) {
  const { data: ilceRows } = useQuery({
    queryKey: ['tvb-havza-ilce'],
    queryFn: () => fetchRows('il-duzeyinde/havza-ilce', { limit: '1500' }),
  });
  const { data: urunRows } = useQuery({
    queryKey: ['tvb-havza-urun'],
    queryFn: () => fetchRows('il-duzeyinde/havza-urun-deseni', { limit: '6000' }),
  });

  const [havza, setHavza] = useState('');
  const [il, setIl] = useState('');

  const mapRows = (ilceRows ?? []).map((r) => ({ havza: String(r.havza ?? ''), il: String(r.il ?? ''), ilce: String(r.ilce ?? '') }));

  const havzalar = useMemo(
    () => Array.from(new Set((urunRows ?? []).map((r) => String(r.havza ?? '')))).filter(Boolean).sort(),
    [urunRows]
  );
  const iller = useMemo(() => {
    const filtered = havza ? (urunRows ?? []).filter((r) => r.havza === havza) : (urunRows ?? []);
    return Array.from(new Set(filtered.map((r) => String(r.il ?? '')))).filter(Boolean).sort();
  }, [urunRows, havza]);

  const activeHavza = havza || havzalar[0] || '';

  const filteredRows = useMemo(() => {
    return (urunRows ?? []).filter((r) => r.havza === activeHavza && (!il || r.il === il));
  }, [urunRows, activeHavza, il]);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      <div className="tvb-section">
        <h3>Tarım Havzalarına Göre İlçe Dağılımı</h3>
        <HavzaDistrictMap rows={mapRows} />
      </div>

      <div className="tvb-page__controls">
        <div className="tvb-select">
          <label>Havza</label>
          <select value={activeHavza} onChange={(e) => { setHavza(e.target.value); setIl(''); }}>
            {havzalar.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="tvb-select">
          <label>İl</label>
          <select value={il} onChange={(e) => setIl(e.target.value)}>
            <option value="">Tümü</option>
            {iller.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div className="tvb-section">
        <h3>Havza Ürün Deseni {filteredRows.length > 0 ? `(${filteredRows.length} kayıt)` : ''}</h3>
        <div className="tvb-table-wrap">
          <table className="tvb-table">
            <thead>
              <tr>
                <th>Havza</th>
                <th>İl</th>
                <th>İlçe</th>
                <th>Ürün</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={i}>
                  <td>{String(r.havza)}</td>
                  <td>{String(r.il)}</td>
                  <td>{String(r.ilce)}</td>
                  <td>{String(r.urun)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

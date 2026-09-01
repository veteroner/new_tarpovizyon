import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { TurkeyProvinceMap } from '../charts/TurkeyProvinceMap';
import { RankingBlock } from '../charts/RankingBlock';

export type IlCografiIsaretPageConfig = { title: string };

/**
 * Coğrafi işaretli ürünler.
 *
 * ─── NEDEN ARAMA VE KADEMELİ LİSTE VAR ──────────────────────────────────────
 * Bu sayfa ~2.000 kaydın TAMAMINI tek tabloya döküyordu: mobilde 68 EKRAN
 * (103.000 karakter) — uygulamadaki en uzun sayfa, ikincisinin beş katı.
 * Kimse 2.000 satırı kaydırarak aramaz; bu liste böyle kullanılamıyordu.
 *
 * Artık liste bir ARAMA aracı: yazdıkça süzülüyor, ekranda bir seferde 25
 * satır duruyor, gerisi istendikçe açılıyor. Veri kırpılmıyor — sayfanın
 * üstündeki sayaç toplam kaydı, süzme sonrası sayaç da eşleşen kaydı
 * söylüyor.
 */
const SAYFA = 25;

export function IlCografiIsaretPage({ config }: { config: IlCografiIsaretPageConfig }) {
  const { data } = useQuery({
    queryKey: ['tvb-cografi-isaret'],
    queryFn: () => fetchRows('il-duzeyinde/cografi-isaret', { limit: '2000' }),
  });
  const rows = data ?? [];

  const [ara, setAra] = useState('');
  const [limit, setLimit] = useState(SAYFA);

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

  /* Türkçe küçültme: "İZMİR" araması "İzmir" kaydını bulmalı. */
  const kucult = (s: unknown) => String(s ?? '').toLocaleLowerCase('tr');

  const suzulmus = useMemo(() => {
    const q = kucult(ara).trim();
    if (!q) return rows;
    return rows.filter((r) =>
      kucult(r.il).includes(q)
      || kucult(r.cografi_isaret_adi).includes(q)
      || kucult(r.urun_grubu).includes(q));
  }, [rows, ara]);

  const gorunen = suzulmus.slice(0, limit);
  const kalan = suzulmus.length - gorunen.length;

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
            <TurkeyProvinceMap values={mapValues} birim="ürün" />
          </div>
          <div className="tvb-section">
            <RankingBlock items={items} />
          </div>
        </>
      )}

      <div className="tvb-section">
        <h3>
          Coğrafi İşaretli Tarım Ürünleri
          {ara
            ? ` (${suzulmus.length.toLocaleString('tr-TR')} / ${rows.length.toLocaleString('tr-TR')} kayıt)`
            : ` (${rows.length.toLocaleString('tr-TR')} kayıt)`}
        </h3>

        <input
          type="search"
          className="tvb-metin-arama"
          value={ara}
          onChange={(e) => { setAra(e.target.value); setLimit(SAYFA); }}
          placeholder="Ürün, il veya ürün grubu ara"
          aria-label="Coğrafi işaretli ürünlerde ara"
        />

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
              {gorunen.map((r, i) => (
                <tr key={`${r.il}-${r.cografi_isaret_adi}-${i}`}>
                  <td>{String(r.il)}</td>
                  <td>{String(r.cografi_isaret_adi)}</td>
                  <td>{String(r.urun_grubu ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {kalan > 0 && (
          <button
            type="button"
            className="tvb-daha"
            onClick={() => setLimit((n) => n + SAYFA * 2)}
          >
            {/* `formatNumber` kısaltıyor ("1,45 B"); kayıt sayısında tam
                değer gerekiyor. */}
            Daha fazla göster ({kalan.toLocaleString('tr-TR')} kayıt kaldı)
          </button>
        )}

        {!suzulmus.length && rows.length > 0 && (
          <p className="tvb-bos">“{ara}” için kayıt bulunamadı.</p>
        )}
      </div>
    </div>
  );
}

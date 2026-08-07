import {
  ResponsiveContainer, ComposedChart, Area, Line, BarChart, Bar, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { useMaddeFiyatData, type FiyatDegisim } from './useMaddeFiyatData';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { LINE_Y_DOMAIN, VALUE_HEADROOM, truncTick } from '../../utils/chartTicks';
import { BAR_COLOR } from '../../utils/chartColors';
import { ChartCard } from '../../components/ui/Card';

const tl = (v: number) =>
  v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);

function DegisimGrafigi({ veri, baslik, renk }: {
  veri: FiyatDegisim[]; baslik: string; renk: string;
}) {
  if (!veri.length) return null;
  return (
    <ChartCard title={<>{baslik}</>} action={<ChartInsightButton title={baslik} description="Aylık fiyat değişimi" data={veri} context={{ birim: '%' }} compact />}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={veri} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={VALUE_HEADROOM} tickFormatter={(v: number) => `%${Number(v).toFixed(0)}`}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
          <YAxis type="category" dataKey="urun" width={110} interval={0} tickFormatter={truncTick}
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
          <Tooltip
            formatter={(v: number, _n, p) => {
              const d = p.payload as FiyatDegisim;
              return [`%${v.toFixed(1)}  (${tl(d.oncekiFiyat)} → ${tl(d.sonFiyat)} ${d.birim})`, 'Aylık değişim'];
            }}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          <Bar dataKey="degisim" radius={[0, 4, 4, 0]}>
            {veri.map((_, i) => <Cell key={i} fill={renk} />)}
            <LabelList dataKey="degisim" position="right"
              formatter={(v: number) => `%${v.toFixed(1)}`}
              style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/**
 * Tarım Ürünleri ÜFE Madde Fiyatları (TL).
 *
 * Sayfanın geri kalanı endeks (2020=100) gösteriyor; burası aynı maddelerin
 * gerçek lira fiyatı. Ayrı bölüm olmasının sebebi ölçeklerin karışmaması:
 * "endeks 1150" ile "buğday 12,40 TL/kg" aynı eksende anlamsız olur.
 */
export default function MaddeFiyatSection() {
  const {
    loading, urunler, aktifUrun, setSecili, aktifBirim, seri,
    sonDonem, enCokArtan, enCokAzalan,
  } = useMaddeFiyatData();

  if (loading) return null;
  if (!urunler.length) return null;

  const sonFiyat = seri.at(-1)?.fiyat;

  return (
    <>
      <h2 style={{ marginTop: 32, marginBottom: 4 }}>💰 Ürün Fiyatları (TL)</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: 16, fontSize: '0.9rem', lineHeight: 1.5 }}>
        Yukarıdaki endeksler fiyatın <strong>ne kadar arttığını</strong> gösteriyor; bu bölüm
        ürünün <strong>kaç lira</strong> olduğunu. Kaynak: TÜİK Tarım ÜFE madde fiyatları
        {sonDonem && <> · son dönem <strong>{sonDonem}</strong></>} · {urunler.length} ürün.
      </p>

      <ChartCard title={<>📈 {aktifUrun}{aktifBirim && ` (${aktifBirim})`}
            {sonFiyat !== undefined && <> — son: <strong>{tl(sonFiyat)}</strong></>}</>} action={<ChartInsightButton title={`${aktifUrun} fiyat trendi`} description="Aylık TL fiyat trendi"
            data={seri} context={{ birim: aktifBirim }} compact />}>
        <select
          className="filter-select"
          value={aktifUrun}
          onChange={(e) => setSecili(e.target.value)}
          style={{ marginBottom: 12, maxWidth: '100%' }}
          aria-label="Ürün seç"
        >
          {urunler.map((u) => (
            <option key={u.urun} value={u.urun}>{u.urun} ({u.birim})</option>
          ))}
        </select>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={seri} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="donem" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              angle={-45} textAnchor="end" height={58} interval="preserveStartEnd" minTickGap={16} />
            {/* Fiyat serisinde okunan şey eğim; taban 0'a çakılırsa düz çizgi olur. */}
            <YAxis domain={LINE_Y_DOMAIN} width={52} tickFormatter={(v: number) => tl(Number(v))}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => [`${tl(v)} ${aktifBirim}`, aktifUrun]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
            />
            <Area type="monotone" dataKey="fiyat" fill={BAR_COLOR} stroke={BAR_COLOR}
              fillOpacity={0.15} strokeWidth={0} tooltipType="none" legendType="none" />
            <Line type="monotone" dataKey="fiyat" stroke={BAR_COLOR} strokeWidth={2}
              dot={{ r: 2 }} name={aktifUrun} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="chart-grid">
        <DegisimGrafigi veri={enCokArtan} renk="#ef4444"
          baslik={`📈 En Çok Artan (${sonDonem})`} />
        <DegisimGrafigi veri={enCokAzalan} renk="#22c55e"
          baslik={`📉 En Çok Azalan (${sonDonem})`} />
      </div>
    </>
  );
}

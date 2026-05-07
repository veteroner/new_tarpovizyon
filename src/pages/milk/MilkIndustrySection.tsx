import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Area, Line, LineChart, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { type IndustrySutData } from './milkUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type Props = {
  industrySutData: IndustrySutData[];
};

export default function MilkIndustrySection({ industrySutData }: Props) {
  if (industrySutData.length === 0) return null;

  const reversed = industrySutData.slice().reverse();

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          🏭 Sanayiye Giden Süt ve Ürünler
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Süt sanayiinde kullanılan süt ve üretilen ürün miktarları - Aylık tüketim analizi
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Radar Chart - Ürün Dağılımı */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🎯 Ürün Dağılım Haritası
            </h3>
            <ChartInsightButton title="🎯 Ürün Dağılım Haritası" description="Süt sanayii ürün dağılım radar grafik" data={industrySutData} context={{ section: 'Süt Sanayii' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={[
              { urun: 'Yoğurt', miktar: (industrySutData[0]?.yogurt_ton || 0) / 1000 },
              { urun: 'Peynir', miktar: (industrySutData[0]?.inek_peyniri_ton || 0) / 1000 },
              { urun: 'Ayran', miktar: (industrySutData[0]?.ayran_ton || 0) / 1000 },
              { urun: 'İçme Sütü', miktar: (industrySutData[0]?.icme_sutu_pastorize_uht_vb_ton || 0) / 1000 },
              { urun: 'Tereyağı', miktar: (industrySutData[0]?.tereyag_ton || 0) / 1000 },
              { urun: 'Süt Tozu', miktar: (industrySutData[0]?.yagsiz_sut_tozu_ton || 0) / 1000 },
            ]}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="urun" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Radar name="Tüketim (bin ton)" dataKey="miktar" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Yoğurt */}
        <div style={{ 
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🥣 Yoğurt Üretimi (Aylık)
            </h3>
            <ChartInsightButton title="🥣 Yoğurt Üretimi (Aylık)" description="Aylık yoğurt üretim miktarı" data={industrySutData} context={{ urun: 'yogurt' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={reversed} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="yogurt_ton" name="Yoğurt" fill="#10b981" stroke="#10b981" fillOpacity={0.4} strokeWidth={2} />
              <Line type="monotone" dataKey="yogurt_ton" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Peynir */}
        <div style={{ 
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🧀 Peynir Üretimi (Aylık)
            </h3>
            <ChartInsightButton title="🧀 Peynir Üretimi (Aylık)" description="Aylık peynir üretim miktarı" data={industrySutData} context={{ urun: 'peynir' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={reversed} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="inek_peyniri_ton" name="Peynir" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.4} strokeWidth={2} />
              <Line type="monotone" dataKey="inek_peyniri_ton" stroke="#d97706" strokeWidth={3} dot={{ fill: '#d97706', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Ayran */}
        <div style={{ 
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🥤 Ayran Üretimi (Aylık)
            </h3>
            <ChartInsightButton title="🥤 Ayran Üretimi (Aylık)" description="Aylık ayran üretim miktarı" data={industrySutData} context={{ urun: 'ayran' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={reversed} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="ayran_ton" name="Ayran" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.4} strokeWidth={2} />
              <Line type="monotone" dataKey="ayran_ton" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* İçme Sütü */}
        <div style={{ 
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🥛 İçme Sütü Üretimi (Aylık)
            </h3>
            <ChartInsightButton title="🥛 İçme Sütü Üretimi (Aylık)" description="Aylık içme sütü üretim miktarı" data={industrySutData} context={{ urun: 'icme_sutu' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={reversed} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="icme_sutu_pastorize_uht_vb_ton" name="İçme Sütü" fill="#06b6d4" stroke="#06b6d4" fillOpacity={0.4} strokeWidth={2} />
              <Line type="monotone" dataKey="icme_sutu_pastorize_uht_vb_ton" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Tereyağı */}
        <div style={{ 
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🧈 Tereyağı Üretimi (Aylık)
            </h3>
            <ChartInsightButton title="🧈 Tereyağı Üretimi (Aylık)" description="Aylık tereyağı üretim miktarı" data={industrySutData} context={{ urun: 'tereyagi' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={reversed} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="tereyag_ton" name="Tereyağı" fill="#eab308" stroke="#eab308" fillOpacity={0.4} strokeWidth={2} />
              <Line type="monotone" dataKey="tereyag_ton" stroke="#ca8a04" strokeWidth={3} dot={{ fill: '#ca8a04', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Süt Tozu */}
        <div style={{ 
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🥛 Süt Tozu Üretimi (Aylık)
            </h3>
            <ChartInsightButton title="🥛 Süt Tozu Üretimi (Aylık)" description="Aylık süt tozu üretim miktarı" data={industrySutData} context={{ urun: 'sut_tozu' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={reversed} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="yagsiz_sut_tozu_ton" name="Süt Tozu" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ham İnek Sütü - Span 2 */}
        <div style={{ 
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          gridColumn: 'span 2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              📈 Sanayiye Giden Ham İnek Sütü (Aylık Trend)
            </h3>
            <ChartInsightButton title="📈 Sanayiye Giden Ham İnek Sütü (Aylık Trend)" description="Sanayiye giden ham inek sütü aylık trend" data={industrySutData} context={{ urun: 'ham_inek_sutu' }} />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={reversed} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="inek_sutu_ton" name="Ham İnek Sütü" fill="#22c55e" stroke="#22c55e" fillOpacity={0.3} strokeWidth={2} />
              <Line type="monotone" dataKey="inek_sutu_ton" stroke="#16a34a" strokeWidth={4} dot={{ fill: '#16a34a', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

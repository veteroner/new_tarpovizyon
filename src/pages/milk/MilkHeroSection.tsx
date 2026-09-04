import { TrendingUp, TrendingDown } from 'lucide-react';
import { yuzde } from '../../utils/sayi';
import { formatTon, type WorldRankings } from './milkUtils';

type Props = {
  latest: { year: number; totalTon: number; cattleTon: number } | undefined;
  yoy: number;
  cattleShare: number;
  cagr: number;
  sufficiency: Record<string, string | number> | null;
  worldRankings: WorldRankings | null;
};

export default function MilkHeroSection({ latest, yoy, cattleShare, cagr, sufficiency, worldRankings }: Props) {
  return (
    <>
      {/* Hero KPI Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px' 
      }}>
        <div style={{ 
          background: 'var(--tv-kart, #fff)',
          border: '1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07))', 
          padding: '28px', 
          borderRadius: '16px', 
          boxShadow: 'var(--tv-golge)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🥛</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--tv-ikincil, #6e6e73)', marginBottom: '12px' }}>
              TOPLAM ÜRETİM {latest?.year}
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--tv-murekkep, #1d1d1f)', lineHeight: 1 }}>
              {formatTon(latest?.totalTon ?? 0)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--tv-ikincil, #6e6e73)', marginTop: '12px' }}>
              Yıllık süt üretimi
            </div>
          </div>
        </div>

        <div style={{ 
          background: yoy >= 0 ? 'linear-gradient(135deg, #17693a 0%, #12522d 100%)' : 'linear-gradient(135deg, #9b3d51 0%, #7d3142 100%)',
          padding: '28px', 
          borderRadius: '16px', 
          boxShadow: `0 4px 16px ${yoy >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>{yoy >= 0 ? <TrendingUp size={18} aria-hidden="true" /> : <TrendingDown size={18} aria-hidden="true" />}</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
              YILLIK DEĞİŞİM
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>
              {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '12px' }}>
              Önceki yıla göre
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'var(--tv-kart, #fff)',
          border: '1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07))', 
          padding: '28px', 
          borderRadius: '16px', 
          boxShadow: 'var(--tv-golge)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐄</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--tv-ikincil, #6e6e73)', marginBottom: '12px' }}>
              BÜYÜKBAŞ PAYI
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--tv-murekkep, #1d1d1f)', lineHeight: 1 }}>
              {yuzde(cattleShare, 1)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--tv-ikincil, #6e6e73)', marginTop: '12px' }}>
              Toplam üretimde
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'var(--tv-kart, #fff)',
          border: '1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07))', 
          padding: '28px', 
          borderRadius: '16px', 
          boxShadow: 'var(--tv-golge)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>📊</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--tv-ikincil, #6e6e73)', marginBottom: '12px' }}>
              10 YILLIK CAGR
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--tv-murekkep, #1d1d1f)', lineHeight: 1 }}>
              {yuzde(cagr, 1)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--tv-ikincil, #6e6e73)', marginTop: '12px' }}>
              Bileşik büyüme
            </div>
          </div>
        </div>

        {sufficiency && (
          <div style={{
            background: Number(sufficiency.sut_ton) >= 1 ? 'linear-gradient(135deg, #17693a 0%, #12522d 100%)' : 'linear-gradient(135deg, #9b3d51 0%, #7d3142 100%)',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: Number(sufficiency.sut_ton) >= 1 ? '0 4px 16px rgba(34, 197, 94, 0.2)' : '0 4px 16px rgba(239, 68, 68, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🥛</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                YETERLİLİK
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>
                {yuzde((Number(sufficiency.sut_ton) * 100), 0)}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '12px' }}>
                {Number(sufficiency.sut_ton) >= 1 ? 'Yeterli' : 'Yetersiz'}
              </div>
            </div>
          </div>
        )}

        {worldRankings && (
          <>
            <div style={{ 
              background: 'var(--tv-kart, #fff)',
          border: '1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07))', 
              padding: '28px', 
              borderRadius: '16px',
              boxShadow: 'var(--tv-golge)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐄</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--tv-ikincil, #6e6e73)', marginBottom: '12px' }}>
                  İNEK SÜT ÜRETİMİ
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--tv-murekkep, #1d1d1f)', lineHeight: 1, marginBottom: '8px' }}>
                  Dünya #{worldRankings.cattle.world}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--tv-ikincil, #6e6e73)', lineHeight: 1 }}>
                  AB #{worldRankings.cattle.eu}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'var(--tv-kart, #fff)',
          border: '1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07))', 
              padding: '28px', 
              borderRadius: '16px',
              boxShadow: 'var(--tv-golge)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐑</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--tv-ikincil, #6e6e73)', marginBottom: '12px' }}>
                  KOYUN SÜT ÜRETİMİ
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--tv-murekkep, #1d1d1f)', lineHeight: 1, marginBottom: '8px' }}>
                  Dünya #{worldRankings.sheep.world}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--tv-ikincil, #6e6e73)', lineHeight: 1 }}>
                  AB #{worldRankings.sheep.eu}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'var(--tv-kart, #fff)',
          border: '1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07))', 
              padding: '28px', 
              borderRadius: '16px',
              boxShadow: 'var(--tv-golge)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐐</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--tv-ikincil, #6e6e73)', marginBottom: '12px' }}>
                  KEÇİ SÜT ÜRETİMİ
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--tv-murekkep, #1d1d1f)', lineHeight: 1, marginBottom: '8px' }}>
                  Dünya #{worldRankings.goat.world}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--tv-ikincil, #6e6e73)', lineHeight: 1 }}>
                  AB #{worldRankings.goat.eu}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Intelligence Panel */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--tv-vurgu, #17693a) 0%, var(--tv-vurgu-koyu, #12522d) 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '48px',
        color: 'white'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Süt Üretimi İçgörü Özeti
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>10 YILLIK CAGR</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>YILLIK DEĞİŞİM</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son yıl</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BÜYÜKBAŞ PAYI</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yuzde(cattleShare, 1)}</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Toplam üretimde</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>YETERLİLİK</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{sufficiency ? `%${(Number(sufficiency.sut_ton) * 100).toFixed(0)}` : '-'}</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>{sufficiency && Number(sufficiency.sut_ton) >= 1 ? 'Yeterli' : 'Yetersiz'}</div>
          </div>
        </div>
      </div>
    </>
  );
}

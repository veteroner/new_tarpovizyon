import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ArrowUpRight, ArrowDownRight, ChevronRight, ShoppingCart, Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { usePlantExportSummary, useAnimalExportSummary } from '../../hooks/useApi';
import { formatMoney } from '../../services/api';

/**
 * Piyasa Tab Page
 * 
 * Borsa fiyatları, emtia piyasaları, dış ticaret verileri.
 */

const API_BASE = 'https://dersbende.com';
const API_KEY = 'dashboard_secret_key_2024';

interface LiveMarket {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  up: boolean;
}

interface CommodityResponse {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePct: number;
}

export default function MarketPage() {
  const navigate = useNavigate();
  const { data: plantSummary, isLoading: plantLoading } = usePlantExportSummary('2024');
  const { data: animalSummary, isLoading: animalLoading } = useAnimalExportSummary('2024');
  const [liveMarkets, setLiveMarkets] = useState<LiveMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api.php?action=commodity_prices&api_key=${API_KEY}`, { timeout: 15000 });
        if (res.data?.success && res.data.commodities) {
          // İlk 5 emtiayı göster (Buğday, Mısır, Soya, Pamuk, Şeker)
          const top5Symbols = ['ZW=F', 'ZC=F', 'ZS=F', 'CT=F', 'SB=F'];
          const filtered = top5Symbols
            .map(sym => res.data.commodities.find((c: CommodityResponse) => c.symbol === sym))
            .filter(Boolean)
            .map((c: CommodityResponse) => ({
              name: `${c.name} (${c.exchange})`,
              symbol: c.symbol,
              price: c.price,
              change: c.change,
              changePct: c.changePct,
              up: c.changePct >= 0,
            }));
          setLiveMarkets(filtered);
          setLastUpdate(res.data.updated || '');
        }
      } catch {
        // Hata durumunda boş kalır
      } finally {
        setMarketsLoading(false);
      }
    };
    fetchMarkets();
  }, []);

  const isLoading = plantLoading || animalLoading;
  
  // Gerçek verilerden ticaret istatistikleri hesapla
  const plantRow = plantSummary?.data?.[0] as Record<string, unknown> | undefined;
  const animalRow = animalSummary?.data?.[0] as Record<string, unknown> | undefined;
  
  const plantExport = plantRow?.toplam_ihracat ? Number(plantRow.toplam_ihracat) : 0;
  const plantImport = plantRow?.toplam_ithalat ? Number(plantRow.toplam_ithalat) : 0;
  const animalExport = animalRow?.toplam_ihracat ? Number(animalRow.toplam_ihracat) : 0;
  const animalImport = animalRow?.toplam_ithalat ? Number(animalRow.toplam_ithalat) : 0;
  
  const totalExport = plantExport + animalExport;
  const totalImport = plantImport + animalImport;
  const balance = totalExport - totalImport;

  const tradeStats = [
    { label: 'Tarım İhracatı', value: totalExport > 0 ? formatMoney(totalExport) : '--' },
    { label: 'Tarım İthalatı', value: totalImport > 0 ? formatMoney(totalImport) : '--' },
    { label: 'Ticaret Dengesi', value: balance !== 0 ? `${balance > 0 ? '+' : ''}${formatMoney(balance)}` : '--' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <BarChart3 size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Piyasa</h1>
            <p className="text-[10px] text-gray-500">Fiyatlar & Dış Ticaret</p>
          </div>
        </div>
      </header>

      {/* Canlı Fiyatlar */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Uluslararası Emtia</h2>
          <span className="text-[10px] text-gray-600">
            {lastUpdate ? `Güncelleme: ${lastUpdate}` : 'Yükleniyor...'}
          </span>
        </div>

        {marketsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-amber-400" />
          </div>
        ) : liveMarkets.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-6">Piyasa verisi alınamadı</p>
        ) : (
        <div className="space-y-2">
          {liveMarkets.map((market) => (
            <div
              key={market.symbol}
              className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  market.up ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  {market.up
                    ? <TrendingUp size={16} className="text-green-400" />
                    : <TrendingDown size={16} className="text-red-400" />
                  }
                </div>
                <span className="text-sm text-gray-200">{market.name}</span>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  ${market.price.toFixed(2)}
                </p>
                <p className={`text-[10px] font-medium flex items-center gap-0.5 justify-end ${
                  market.up ? 'text-green-400' : 'text-red-400'
                }`}>
                  {market.up
                    ? <ArrowUpRight size={10} />
                    : <ArrowDownRight size={10} />
                  }
                  {market.changePct >= 0 ? '+' : ''}{market.changePct.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
        )}

        <button
          onClick={() => navigate('/market/prices')}
          className="w-full mt-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tap-active"
        >
          Tüm Fiyatları Gör →
        </button>
      </section>

      {/* Dış Ticaret Özet */}
      <section className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Tarımsal Dış Ticaret <span className="text-[10px] text-gray-500 font-normal">2024</span>
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-gray-500" />
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-2">
          {tradeStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-dark-800/50 border border-white/5 p-3 text-center"
            >
              <p className="text-sm font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
        )}

        <button
          onClick={() => navigate('/market/trade')}
          className="w-full mt-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium tap-active"
        >
          Detaylı Ticaret Analizi →
        </button>
      </section>

      {/* Hızlı Linkler */}
      <section className="px-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Raporlar</h2>
        
        <div className="space-y-2">
          <button
            onClick={() => navigate('/report/commodity-prices')}
            className="w-full glass-card rounded-xl p-3 text-left tap-active flex items-center gap-3"
          >
            <DollarSign size={18} className="text-amber-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-200">Emtia Fiyat Analizi</p>
              <p className="text-[10px] text-gray-500">Looker Studio detaylı rapor</p>
            </div>
            <ChevronRight size={16} className="text-gray-600" />
          </button>

          <button
            onClick={() => navigate('/report/trade-analysis')}
            className="w-full glass-card rounded-xl p-3 text-left tap-active flex items-center gap-3"
          >
            <ShoppingCart size={18} className="text-purple-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-200">Dış Ticaret Raporu</p>
              <p className="text-[10px] text-gray-500">İthalat/İhracat detayları</p>
            </div>
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </section>
    </div>
  );
}

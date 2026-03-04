import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Package, ShoppingCart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTopPlantExports, usePlantExportSummary } from '../../hooks/useApi';
import { formatMoney, formatNumber, TRADE_YEARS } from '../../services/api';

/**
 * Dış Ticaret Sayfası
 * 
 * Gerçek TÜİK dış ticaret verileri — bitkisel ihracat/ithalat.
 */

type TradeType = 'export' | 'import';

export default function TradePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TradeType>('export');
  const [year, setYear] = useState('2024');

  const { data: exportsData, isLoading: exportsLoading } = useTopPlantExports(year);
  const { data: summaryData, isLoading: summaryLoading } = usePlantExportSummary(year);

  const isLoading = exportsLoading || summaryLoading;
  const summary = summaryData?.data?.[0];
  const toplamDeger = Number(summary?.toplam_deger) || 0;
  const urunSayisi = Number(summary?.urun_sayisi) || 0;

  const items = (exportsData?.data || []).slice(0, 20);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Dış Ticaret</h1>
            <p className="text-[10px] text-gray-500">TÜİK Bitkisel Dış Ticaret</p>
          </div>
        </div>

        {/* Yıl seçici */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
          {TRADE_YEARS.slice(0, 8).map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                year === y
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Toplam Özet */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-green-500/10 border border-green-500/15 p-3 text-center">
            <Package size={18} className="text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">
              {isLoading ? '...' : formatMoney(toplamDeger)}
            </p>
            <p className="text-[10px] text-gray-500">
              Toplam İhracat ({year})
            </p>
          </div>
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/15 p-3 text-center">
            <ShoppingCart size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-400">
              {isLoading ? '...' : urunSayisi}
            </p>
            <p className="text-[10px] text-gray-500">Ürün Çeşidi</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-dark-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'export'
                ? 'bg-green-500/20 text-green-400'
                : 'text-gray-500'
            }`}
          >
            İhracat
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-red-500/20 text-red-400'
                : 'text-gray-500'
            }`}
          >
            İthalat
          </button>
        </div>
      </header>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="text-primary-400 animate-spin" />
        </div>
      )}

      {/* Ürün Listesi */}
      {!isLoading && (
        <section className="px-5 mt-4 mb-8">
          <div className="space-y-2">
            {items.map((item, i) => {
              const urun = (item.ana_urun as string) || 'Bilinmiyor';
              const deger = Number(item.toplam_deger) || 0;
              const miktar = Number(item.toplam_miktar) || 0;
              const ulkeSayisi = Number(item.ulke_sayisi) || 0;
              return (
                <div
                  key={urun}
                  className="rounded-xl bg-dark-800/50 border border-white/5 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 bg-dark-700 w-5 h-5 rounded-md flex items-center justify-center font-mono">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-white truncate max-w-[180px]">{urun}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <ArrowUpRight size={10} className="text-green-400" />
                      {ulkeSayisi} ülke
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">{formatMoney(deger)}</p>
                      <p className="text-[9px] text-gray-500">Değer</p>
                    </div>
                    <div className="w-px h-6 bg-white/5" />
                    <div>
                      <p className="text-sm font-bold text-gray-300">{formatNumber(miktar)}</p>
                      <p className="text-[9px] text-gray-500">Miktar</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500">Bu yıl için veri bulunamadı</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

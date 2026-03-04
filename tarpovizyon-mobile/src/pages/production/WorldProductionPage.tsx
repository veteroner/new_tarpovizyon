import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTopWorldProducts, useWorldProductionStats } from '../../hooks/useApi';
import { formatNumber } from '../../services/api';

/**
 * Dünya Tarımsal Üretim Sayfası
 * 
 * Üretimindex tablosundan gerçek dünya üretim verileri.
 */

export default function WorldProductionPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: statsData, isLoading: statsLoading } = useWorldProductionStats();
  const { data: productsData, isLoading: productsLoading } = useTopWorldProducts();

  const isLoading = statsLoading || productsLoading;
  const stats = statsData?.data?.[0];
  const toplamUretim = Number(stats?.toplamUretim) || 0;
  const toplamUrun = Number(stats?.toplamUrun) || 0;

  const products = (productsData?.data || []).filter((p) => {
    const ad = (p.ad as string) || '';
    return ad.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Dünya Üretimi</h1>
            <p className="text-[10px] text-gray-500">FAO & USDA Verileri</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full pl-9 pr-4 py-2.5 bg-dark-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
          />
        </div>
      </header>

      {/* Dünya Toplamları */}
      <section className="px-5 mb-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/10 p-3 text-center">
            <p className="text-sm font-bold text-emerald-400">
              {isLoading ? '...' : formatNumber(toplamUretim)}
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">Toplam Üretim</p>
          </div>
          <div className="rounded-xl bg-sky-500/10 border border-sky-500/10 p-3 text-center">
            <p className="text-sm font-bold text-sky-400">
              {isLoading ? '...' : toplamUrun}
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">Ürün Çeşidi</p>
          </div>
        </div>
      </section>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="text-primary-400 animate-spin" />
        </div>
      )}

      {/* Ürün Listesi */}
      {!isLoading && (
        <section className="px-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Top Ürünler</h2>
            <span className="text-[10px] text-gray-600">{products.length} ürün</span>
          </div>

          <div className="space-y-2">
            {products.map((product, i) => {
              const ad = (product.ad as string) || 'Bilinmiyor';
              const miktar = Number(product.miktar) || 0;
              const birim = (product.birim as string) || '';
              return (
                <div
                  key={ad}
                  className="rounded-xl bg-dark-800/50 border border-white/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 bg-dark-700 w-6 h-6 rounded-md flex items-center justify-center font-mono">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-white">{ad}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">{formatNumber(miktar)}</p>
                      <p className="text-[9px] text-gray-500">{birim}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Rapor */}
      <div className="px-5 mb-8">
        <button
          onClick={() => navigate('/report/world-production')}
          className="w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tap-active flex items-center justify-center gap-2"
        >
          <Globe size={14} />
          Detaylı Dünya Raporu →
        </button>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, Filter, Wheat, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useProvinces, useProvinceRanking } from '../../hooks/useApi';
import { formatNumber } from '../../services/api';

/**
 * Türkiye Bitkisel Üretim Sayfası
 * 
 * İl bazlı TÜİK verilerini gerçek API'den çeker.
 */

const URUN_LISTESI = ['Buğday', 'Arpa', 'Mısır (dane)', 'Ayçiçeği (çerezlik)', 'Pamuk (kütlü)'];

export default function TurkeyProductionPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedUrun, setSelectedUrun] = useState('Buğday');

  const { data: provincesData, isLoading: provLoading } = useProvinces();
  const { data: rankingData, isLoading: rankLoading } = useProvinceRanking(selectedUrun);

  const isLoading = provLoading || rankLoading;

  // İl sıralaması (verim bazlı)
  const rankings = (rankingData?.data || [])
    .filter((r) => {
      const name = (r.ili as string) || '';
      return name.toLowerCase().includes(search.toLowerCase());
    })
    .slice(0, 50);

  const totalProvinces = provincesData?.data?.length || 0;

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Türkiye Üretimi</h1>
            <p className="text-[10px] text-gray-500">
              TÜİK Bitkisel Üretim • {totalProvinces} il
            </p>
          </div>
        </div>

        {/* Ürün seçici */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3">
          {URUN_LISTESI.map((urun) => (
            <button
              key={urun}
              onClick={() => setSelectedUrun(urun)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedUrun === urun
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {urun}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İl ara..."
            className="w-full pl-9 pr-10 py-2.5 bg-dark-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-dark-700 tap-active">
            <Filter size={14} className="text-gray-400" />
          </button>
        </div>
      </header>

      {/* Sonuç sayısı */}
      <div className="px-5 mb-3">
        <span className="text-[10px] text-gray-600">
          {isLoading ? 'Yükleniyor...' : `${rankings.length} il — ${selectedUrun} verim sıralaması (Kg/Dekar)`}
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="text-primary-400 animate-spin" />
        </div>
      )}

      {/* İl Listesi */}
      {!isLoading && (
        <section className="px-5 mb-8">
          <div className="space-y-2">
            {rankings.map((row, i) => {
              const il = row.ili as string;
              const verim = Number(row.y2024) || 0;
              return (
                <div
                  key={il}
                  className="rounded-xl bg-dark-800/50 border border-white/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 bg-dark-700 w-6 h-6 rounded-md flex items-center justify-center font-mono">
                        {i + 1}
                      </span>
                      <MapPin size={14} className="text-primary-400" />
                      <span className="text-sm font-semibold text-white">{il}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        {formatNumber(verim)}
                      </p>
                      <p className="text-[9px] text-gray-500">Kg/Dekar</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Looker Rapor Linki */}
      <div className="px-5 mb-8">
        <button
          onClick={() => navigate('/report/turkey-production')}
          className="w-full py-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium tap-active flex items-center justify-center gap-2"
        >
          <Wheat size={14} />
          Detaylı İnteraktif Harita →
        </button>
      </div>
    </div>
  );
}

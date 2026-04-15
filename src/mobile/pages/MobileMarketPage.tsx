import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, ChevronRight, ShoppingCart,
  RefreshCw, AlertCircle, Wifi,
} from 'lucide-react';

import { fetchCommodities, type CommodityQuote } from '../services/commodities';

/**
 * Piyasa Tab Page — Live commodity prices from Yahoo Finance + trade data
 */

const CATEGORY_META = {
  bitkisel:    { label: '🌾 Bitkisel Ürünler',  color: 'amber'  },
  hayvancilik: { label: '🐄 Hayvancılık',        color: 'orange' },
  sut:         { label: '🥛 Süt Ürünleri',       color: 'sky'    },
  et_gida:     { label: '🥩 Et & Gıda',          color: 'red'    },
  enerji:      { label: '⚡ Enerji',             color: 'purple' },
  gubre:       { label: '🧪 Gübre',              color: 'lime'   },
  orman:       { label: '🪵 Orman Ürünleri',     color: 'stone'  },
  metal:       { label: '🥇 Metaller',            color: 'yellow' },
  doviz:       { label: '💱 Döviz',              color: 'teal'   },
} as const;

function SkeletonCard() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200" />
        <div className="h-3.5 w-28 rounded bg-slate-200" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3.5 w-16 rounded bg-slate-200 ml-auto" />
        <div className="h-2.5 w-12 rounded bg-slate-200 ml-auto" />
      </div>
    </div>
  );
}

interface PriceCardProps {
  quote: CommodityQuote;
}

function PriceCard({ quote }: PriceCardProps) {
  const up = quote.changePercent >= 0;
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          up ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          {up
            ? <TrendingUp size={16} className="text-green-500" />
            : <TrendingDown size={16} className="text-red-500" />
          }
        </div>
        <div>
          <p className="text-sm text-slate-700 font-medium">{quote.name}</p>
          <p className="text-[10px] text-slate-400">{quote.currency}</p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold text-slate-800">
          {quote.price.toFixed(2)}
        </p>
        <p className={`text-[10px] font-medium flex items-center gap-0.5 justify-end ${
          up ? 'text-green-500' : 'text-red-500'
        }`}>
          {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {up ? '+' : ''}{quote.changePercent.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

export default function MobileMarketPage() {
  const navigate = useNavigate();

  const {
    data: quotes,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['commodities'],
    queryFn: fetchCommodities,
    staleTime: 5 * 60 * 1000,        // treat data fresh for 5 min
    refetchInterval: 5 * 60 * 1000,  // auto-refresh every 5 min
    retry: 2,
  });

  const groupedQuotes = quotes
    ? (Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat) => ({
        cat,
        items: quotes.filter((q) => q.category === cat),
      })).filter((g) => g.items.length > 0)
    : [];

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="page-container bg-emerald-50">
      {/* Header */}
      <header className="px-5 pt-safe pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <BarChart3 size={22} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Piyasa</h1>
              <p className="text-[10px] text-slate-400">Fiyatlar & Dış Ticaret</p>
            </div>
          </div>

          {/* Refresh button + last updated */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex flex-col items-end gap-0.5 tap-active"
          >
            <RefreshCw
              size={15}
              className={`text-emerald-500 ${isLoading ? 'animate-spin' : ''}`}
            />
            {updatedLabel && (
              <span className="text-[9px] text-slate-400">{updatedLabel}</span>
            )}
          </button>
        </div>
      </header>

      {/* Live Commodity Prices */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600">Uluslararası Emtia</h2>
          <div className="flex items-center gap-1">
            <Wifi size={10} className="text-emerald-400" />
            <span className="text-[10px] text-slate-400">Yahoo Finance · 15dk gecikmeli</span>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-6 rounded-xl bg-white border border-slate-200">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-xs text-slate-500">Fiyatlar alınamadı</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium tap-active"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {/* Grouped price cards */}
        {!isLoading && !isError && groupedQuotes.map(({ cat, items }) => (
          <div key={cat} className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              {CATEGORY_META[cat].label}
            </p>
            <div className="space-y-2">
              {items.map((q) => <PriceCard key={q.symbol} quote={q} />)}
            </div>
          </div>
        ))}
      </section>

      {/* Trade Section */}
      <section className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">
          Tarımsal Dış Ticaret
        </h2>

        <button
          onClick={() => navigate('/tarpovizyon/turkey/trade')}
          className="w-full mt-1 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-medium tap-active"
        >
          Detaylı Ticaret Analizi →
        </button>
      </section>

      {/* Quick Links */}
      <section className="px-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">Raporlar</h2>

        <div className="space-y-2">
          <button
            onClick={() => navigate('/tarpovizyon/turkey/price-index')}
            className="w-full glass-card rounded-xl p-3 text-left tap-active flex items-center gap-3"
          >
            <TrendingUp size={18} className="text-amber-500" />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-700">Fiyat Endeksleri</p>
              <p className="text-[10px] text-slate-400">ÜFE, TÜFE, Tarım fiyatları</p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => navigate('/tarpovizyon/turkey/product-balance')}
            className="w-full glass-card rounded-xl p-3 text-left tap-active flex items-center gap-3"
          >
            <ShoppingCart size={18} className="text-purple-500" />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-700">Ürün Dengesi</p>
              <p className="text-[10px] text-slate-400">Üretim-Tüketim analizi</p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </section>
    </div>
  );
}

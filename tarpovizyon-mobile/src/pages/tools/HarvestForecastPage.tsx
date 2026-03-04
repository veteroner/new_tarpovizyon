import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sprout, CloudRain, Sun, Thermometer, Droplets, Calendar } from 'lucide-react';
import { useState } from 'react';

/**
 * Hasat Tahmini Sayfası
 * 
 * Ürün ve bölge seçerek tahmini hasat zamanı ve miktarı.
 */

const products = ['Buğday', 'Arpa', 'Mısır', 'Ayçiçeği', 'Çeltik', 'Pamuk', 'Soya'];
const regions = ['Marmara', 'İç Anadolu', 'Ege', 'Akdeniz', 'Karadeniz', 'Güneydoğu', 'Doğu Anadolu'];

export default function HarvestForecastPage() {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState('Buğday');
  const [selectedRegion, setSelectedRegion] = useState('İç Anadolu');
  const [showResult, setShowResult] = useState(false);

  const handleCalculate = () => {
    setShowResult(true);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Hasat Tahmini</h1>
            <p className="text-[10px] text-gray-500">Ürün & bölge bazlı tahmin</p>
          </div>
        </div>
      </header>

      {/* Ürün Seçimi */}
      <section className="px-5 mb-5">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">Ürün Seçin</h2>
        <div className="flex flex-wrap gap-2">
          {products.map((p) => (
            <button
              key={p}
              onClick={() => { setSelectedProduct(p); setShowResult(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedProduct === p
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* Bölge Seçimi */}
      <section className="px-5 mb-5">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">Bölge Seçin</h2>
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => { setSelectedRegion(r); setShowResult(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedRegion === r
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Hesapla Butonu */}
      <div className="px-5 mb-6">
        <button
          onClick={handleCalculate}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold tap-active shadow-lg shadow-green-500/20"
        >
          <Sprout size={16} className="inline mr-2" />
          Tahmin Et
        </button>
      </div>

      {/* Sonuç */}
      {showResult && (
        <section className="px-5 mb-8 animate-fade-in">
          <div className="rounded-2xl bg-dark-800/50 border border-green-500/10 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              {selectedProduct} - {selectedRegion}
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-dark-900/50 p-3 text-center">
                <Calendar size={18} className="text-green-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">Haziran 15-30</p>
                <p className="text-[9px] text-gray-500">Tahmini Hasat</p>
              </div>
              <div className="rounded-xl bg-dark-900/50 p-3 text-center">
                <Sprout size={18} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">4.2 ton/ha</p>
                <p className="text-[9px] text-gray-500">Tahmini Verim</p>
              </div>
            </div>

            {/* Koşullar */}
            <h4 className="text-xs text-gray-400 mb-2">Mevcut Koşullar</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer size={14} className="text-red-400" />
                  <span className="text-xs text-gray-300">Sıcaklık</span>
                </div>
                <span className="text-xs font-medium text-white">18-24°C</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudRain size={14} className="text-sky-400" />
                  <span className="text-xs text-gray-300">Yağış</span>
                </div>
                <span className="text-xs font-medium text-white">Normal</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-blue-400" />
                  <span className="text-xs text-gray-300">Toprak Nemi</span>
                </div>
                <span className="text-xs font-medium text-white">%65</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun size={14} className="text-yellow-400" />
                  <span className="text-xs text-gray-300">Güneşlenme</span>
                </div>
                <span className="text-xs font-medium text-white">Yeterli</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

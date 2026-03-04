import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, Thermometer, Sun, Wind } from 'lucide-react';
import { useState } from 'react';

/**
 * Sulama Planlayıcı Sayfası
 * 
 * Ürün, toprak tipi ve hava durumuna göre sulama planı.
 */

const crops = ['Buğday', 'Mısır', 'Domates', 'Pamuk', 'Şeker Pancarı', 'Ayçiçeği'];
const soilTypes = ['Killi', 'Kumlu', 'Tınlı', 'Killi-Tınlı', 'Kumlu-Tınlı'];
const irrigationMethods = ['Damla', 'Yağmurlama', 'Karık', 'Salma'];

export default function IrrigationPage() {
  const navigate = useNavigate();
  const [crop, setCrop] = useState('Mısır');
  const [soil, setSoil] = useState('Tınlı');
  const [method, setMethod] = useState('Damla');
  const [showResult, setShowResult] = useState(false);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Sulama Planlayıcı</h1>
            <p className="text-[10px] text-gray-500">Akıllı sulama önerileri</p>
          </div>
        </div>
      </header>

      {/* Ürün */}
      <section className="px-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">Ürün</h2>
        <div className="flex flex-wrap gap-2">
          {crops.map((c) => (
            <button
              key={c}
              onClick={() => { setCrop(c); setShowResult(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                crop === c
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Toprak */}
      <section className="px-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">Toprak Tipi</h2>
        <div className="flex flex-wrap gap-2">
          {soilTypes.map((s) => (
            <button
              key={s}
              onClick={() => { setSoil(s); setShowResult(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                soil === s
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Sulama Yöntemi */}
      <section className="px-5 mb-5">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">Sulama Yöntemi</h2>
        <div className="flex flex-wrap gap-2">
          {irrigationMethods.map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setShowResult(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                method === m
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* Hesapla */}
      <div className="px-5 mb-6">
        <button
          onClick={() => setShowResult(true)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold tap-active shadow-lg shadow-cyan-500/20"
        >
          <Droplets size={16} className="inline mr-2" />
          Sulama Planı Oluştur
        </button>
      </div>

      {/* Sonuç */}
      {showResult && (
        <section className="px-5 mb-8 animate-fade-in">
          <div className="rounded-2xl bg-dark-800/50 border border-cyan-500/10 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              {crop} - {soil} Toprak - {method} Sulama
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-dark-900/50 p-3 text-center">
                <Droplets size={18} className="text-cyan-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">45 mm</p>
                <p className="text-[9px] text-gray-500">Sulama Miktarı</p>
              </div>
              <div className="rounded-xl bg-dark-900/50 p-3 text-center">
                <Sun size={18} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">4 gün</p>
                <p className="text-[9px] text-gray-500">Sulama Aralığı</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer size={14} className="text-red-400" />
                  <span className="text-xs text-gray-300">Verimlilik</span>
                </div>
                <span className="text-xs font-medium text-green-400">%92 (Damla)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-300">Öneri</span>
                </div>
                <span className="text-xs font-medium text-white">Sabah erken saatler</span>
              </div>
            </div>

            <div className="mt-3 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
              <p className="text-[10px] text-cyan-300/80">
                💡 {method} sulama ile {soil.toLowerCase()} toprakta {crop.toLowerCase()} için
                optimum sulama aralığı 3-5 gündür. Hava sıcaklığına göre ayarlayın.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

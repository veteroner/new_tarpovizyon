import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, FlaskConical, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

/**
 * Gübre Hesaplayıcı Sayfası
 * 
 * Toprak analizi ve ürüne göre gübre önerisi.
 */

const crops = ['Buğday', 'Mısır', 'Domates', 'Patates', 'Ayçiçeği', 'Pamuk', 'Arpa'];

export default function FertilizerPage() {
  const navigate = useNavigate();
  const [crop, setCrop] = useState('Buğday');
  const [area, setArea] = useState('');
  const [targetYield, setTargetYield] = useState('');
  const [showResult, setShowResult] = useState(false);

  const handleCalculate = () => {
    if (area && targetYield) {
      setShowResult(true);
    }
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
            <h1 className="text-lg font-bold text-white">Gübre Hesaplayıcı</h1>
            <p className="text-[10px] text-gray-500">Ürüne göre gübre ihtiyacı</p>
          </div>
        </div>
      </header>

      {/* Ürün Seçimi */}
      <section className="px-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">Ürün</h2>
        <div className="flex flex-wrap gap-2">
          {crops.map((c) => (
            <button
              key={c}
              onClick={() => { setCrop(c); setShowResult(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                crop === c
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Girdi Alanları */}
      <section className="px-5 mb-5 space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Alan (dekar)</label>
          <input
            type="number"
            value={area}
            onChange={(e) => { setArea(e.target.value); setShowResult(false); }}
            placeholder="Örn: 100"
            className="w-full px-4 py-2.5 bg-dark-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Hedef Verim (kg/da)</label>
          <input
            type="number"
            value={targetYield}
            onChange={(e) => { setTargetYield(e.target.value); setShowResult(false); }}
            placeholder="Örn: 500"
            className="w-full px-4 py-2.5 bg-dark-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
          />
        </div>
      </section>

      {/* Hesapla */}
      <div className="px-5 mb-6">
        <button
          onClick={handleCalculate}
          disabled={!area || !targetYield}
          className={`w-full py-3 rounded-xl text-sm font-semibold tap-active shadow-lg ${
            area && targetYield
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-orange-500/20'
              : 'bg-dark-800 text-gray-600'
          }`}
        >
          <Calculator size={16} className="inline mr-2" />
          Gübre Hesapla
        </button>
      </div>

      {/* Sonuç */}
      {showResult && (
        <section className="px-5 mb-8 animate-fade-in">
          <div className="rounded-2xl bg-dark-800/50 border border-orange-500/10 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              {crop} - {area} dekar - {targetYield} kg/da hedef
            </h3>

            {/* Gübre Önerileri */}
            <div className="space-y-3 mb-4">
              <FertilizerRow
                name="Azot (N)"
                amount={`${Math.round(Number(area) * 12)} kg`}
                type="Üre (%46 N)"
                color="text-green-400"
                bg="bg-green-500/10"
              />
              <FertilizerRow
                name="Fosfor (P₂O₅)"
                amount={`${Math.round(Number(area) * 6)} kg`}
                type="DAP (%18-46-0)"
                color="text-blue-400"
                bg="bg-blue-500/10"
              />
              <FertilizerRow
                name="Potasyum (K₂O)"
                amount={`${Math.round(Number(area) * 4)} kg`}
                type="Potasyum Sülfat"
                color="text-purple-400"
                bg="bg-purple-500/10"
              />
            </div>

            {/* Uyarı */}
            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 flex gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300/80">
                Bu değerler genel tavsiye niteliğindedir. Kesin dozaj için toprak
                analizi yaptırılması önerilir.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function FertilizerRow({
  name,
  amount,
  type,
  color,
  bg,
}: {
  name: string;
  amount: string;
  type: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900/50">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <FlaskConical size={14} className={color} />
        </div>
        <div>
          <p className="text-xs font-medium text-white">{name}</p>
          <p className="text-[9px] text-gray-500">{type}</p>
        </div>
      </div>
      <p className={`text-sm font-bold ${color}`}>{amount}</p>
    </div>
  );
}

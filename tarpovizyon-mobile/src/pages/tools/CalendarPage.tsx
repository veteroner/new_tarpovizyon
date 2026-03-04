import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Sprout, Droplets, Sun, Scissors, Bug, Leaf } from 'lucide-react';
import { useState } from 'react';

/**
 * Tarım Takvimi Sayfası
 * 
 * Aylık tarımsal aktivite takvimi.
 */

const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

interface CalendarEvent {
  title: string;
  icon: typeof Sprout;
  color: string;
  products: string[];
}

const calendarData: Record<number, CalendarEvent[]> = {
  0: [ // Ocak
    { title: 'Toprak hazırlığı', icon: Leaf, color: 'text-amber-400', products: ['Sebze (sera)'] },
    { title: 'Budama', icon: Scissors, color: 'text-green-400', products: ['Meyve ağaçları', 'Bağ'] },
  ],
  1: [ // Şubat
    { title: 'Fidye dikimi', icon: Sprout, color: 'text-green-400', products: ['Domates', 'Biber', 'Patlıcan'] },
    { title: 'Gübreleme', icon: Leaf, color: 'text-orange-400', products: ['Buğday', 'Arpa'] },
  ],
  2: [ // Mart
    { title: 'Yazlık ekim', icon: Sprout, color: 'text-emerald-400', products: ['Mısır', 'Ayçiçeği', 'Pamuk'] },
    { title: 'İlaçlama', icon: Bug, color: 'text-red-400', products: ['Meyve ağaçları'] },
    { title: 'Sulama başlangıcı', icon: Droplets, color: 'text-cyan-400', products: ['Tüm ürünler'] },
  ],
  3: [ // Nisan
    { title: 'Ekim devam', icon: Sprout, color: 'text-green-400', products: ['Çeltik', 'Soya'] },
    { title: 'İlaçlama', icon: Bug, color: 'text-red-400', products: ['Tahıllar'] },
  ],
  4: [ // Mayıs
    { title: 'Sulama yoğunlaştır', icon: Droplets, color: 'text-blue-400', products: ['Tüm ürünler'] },
    { title: 'Gübreleme (2. dönem)', icon: Leaf, color: 'text-orange-400', products: ['Mısır', 'Pamuk'] },
  ],
  5: [ // Haziran
    { title: 'Hasat başlangıcı', icon: Sun, color: 'text-yellow-400', products: ['Buğday', 'Arpa'] },
    { title: 'Yoğun sulama', icon: Droplets, color: 'text-cyan-400', products: ['Mısır', 'Pamuk', 'Sebze'] },
  ],
  6: [ // Temmuz
    { title: 'Hasat', icon: Sun, color: 'text-amber-400', products: ['Buğday', 'Arpa', 'Kiraz'] },
    { title: 'Sulama kritik', icon: Droplets, color: 'text-red-400', products: ['Mısır', 'Domates'] },
  ],
  7: [ // Ağustos
    { title: 'Hasat devam', icon: Sun, color: 'text-yellow-400', products: ['Ayçiçeği', 'Domates'] },
    { title: 'İkinci ürün ekim', icon: Sprout, color: 'text-green-400', products: ['Mısır (silaj)'] },
  ],
  8: [ // Eylül
    { title: 'Hasat', icon: Sun, color: 'text-orange-400', products: ['Pamuk', 'Mısır', 'Çeltik'] },
    { title: 'Toprak hazırlığı', icon: Leaf, color: 'text-amber-400', products: ['Kışlık tahıllar'] },
  ],
  9: [ // Ekim
    { title: 'Kışlık ekim', icon: Sprout, color: 'text-emerald-400', products: ['Buğday', 'Arpa', 'Çavdar'] },
    { title: 'Bağ bozumu', icon: Scissors, color: 'text-purple-400', products: ['Üzüm'] },
  ],
  10: [ // Kasım
    { title: 'Ekim devam', icon: Sprout, color: 'text-green-400', products: ['Buğday (geç ekim)'] },
    { title: 'Budama hazırlığı', icon: Scissors, color: 'text-gray-400', products: ['Meyve ağaçları'] },
  ],
  11: [ // Aralık
    { title: 'Dinlenme', icon: Leaf, color: 'text-blue-400', products: ['Genel bakım'] },
    { title: 'Planlama', icon: CalendarDays, color: 'text-primary-400', products: ['Yeni sezon'] },
  ],
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const events = calendarData[selectedMonth] || [];

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Tarım Takvimi</h1>
            <p className="text-[10px] text-gray-500">Aylık tarımsal aktiviteler</p>
          </div>
        </div>
      </header>

      {/* Ay Seçimi - Yatay Scroll */}
      <section className="px-5 mb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {months.map((month, i) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(i)}
              className={`
                flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all
                ${selectedMonth === i
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : i === currentMonth
                    ? 'bg-dark-800 text-white border border-white/10'
                    : 'bg-dark-800 text-gray-500 border border-white/5'
                }
              `}
            >
              {month}
              {i === currentMonth && (
                <span className="block text-[8px] mt-0.5 text-gray-500">Şimdi</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Seçili Ay Başlık */}
      <div className="px-5 mb-4">
        <h2 className="text-base font-bold text-white">{months[selectedMonth]}</h2>
        <p className="text-[10px] text-gray-500">{events.length} tarımsal aktivite</p>
      </div>

      {/* Aktiviteler */}
      <section className="px-5 mb-8">
        <div className="space-y-3">
          {events.map((event, i) => {
            const Icon = event.icon;
            return (
              <div
                key={i}
                className="rounded-xl bg-dark-800/50 border border-white/5 p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon size={20} className={event.color} />
                  <span className="text-sm font-semibold text-white">{event.title}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-8">
                  {event.products.map((product) => (
                    <span
                      key={product}
                      className="px-2 py-0.5 rounded-md bg-dark-900/50 text-[10px] text-gray-400"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

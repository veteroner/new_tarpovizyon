import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBolge } from '../utils/climate-data';
import { STORAGE_KEY, getCurrentWeekOfYear, generateActivities } from './takvim/takvimTypes';
import type { Activity } from './takvim/takvimTypes';
import { TakvimRegionCard } from './takvim/TakvimRegionCard';
import { TakvimCropSelector } from './takvim/TakvimCropSelector';
import { TakvimThisWeek } from './takvim/TakvimThisWeek';
import { TakvimViews } from './takvim/TakvimViews';
import './TarimTakvimPage.css';

export default function TarimTakvimPage() {
  const navigate = useNavigate();

  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as { il?: string; crops?: string[] } : null;
    } catch { return null; }
  }, []);

  const [selectedIl, setSelectedIl]   = useState(saved?.il ?? '');
  const [selectedCrops, setSelectedCrops] = useState<string[]>(saved?.crops ?? []);
  const [viewMode, setViewMode]   = useState<'takvim' | 'liste' | 'timeline'>('takvim');
  const [filterTip, setFilterTip] = useState<Activity['tip'] | 'hepsi'>('hepsi');

  const bolge = selectedIl ? getBolge(selectedIl) : 'ic_anadolu';
  const now   = useMemo(() => getCurrentWeekOfYear(), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ il: selectedIl, crops: selectedCrops }));
    } catch { /* ignore */ }
  }, [selectedIl, selectedCrops]);

  const activities = useMemo(
    () => generateActivities(selectedCrops, bolge),
    [selectedCrops, bolge],
  );

  const filteredActivities = useMemo(
    () => activities.filter((a) => filterTip === 'hepsi' || a.tip === filterTip),
    [activities, filterTip],
  );

  const buHaftaGorevler = useMemo(
    () => activities.filter((a) => a.ay === now.ay && a.hafta === now.hafta),
    [activities, now.ay, now.hafta],
  );

  const gecikmisGorevler = useMemo(
    () => activities
      .filter((a) => (a.ay < now.ay) || (a.ay === now.ay && a.hafta < now.hafta))
      .filter((a) => a.tip === 'ekim' || a.tip === 'hasat'),
    [activities, now.ay, now.hafta],
  );

  const toggleCrop = (key: string) => {
    setSelectedCrops((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div className="tt-page">
      <div className="tt-topbar">
        <button className="tt-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="tt-topbar__title">
          <span>📅</span>
          <span>Tarımsal Takvim</span>
        </div>
        <div style={{ width: '100px' }} />
      </div>

      <div className="tt-content">
        <TakvimRegionCard
          selectedIl={selectedIl}
          setSelectedIl={setSelectedIl}
          bolge={bolge}
        />

        <TakvimCropSelector
          selectedCrops={selectedCrops}
          toggleCrop={toggleCrop}
        />

        {selectedCrops.length === 0 ? (
          <div className="tt-empty">
            Takvim oluşturmak için yukarıdan en az bir ürün seçin.
          </div>
        ) : (
          <>
            <TakvimThisWeek
              now={now}
              bolge={bolge}
              selectedIl={selectedIl}
              buHaftaGorevler={buHaftaGorevler}
              gecikmisGorevler={gecikmisGorevler}
            />

            <TakvimViews
              viewMode={viewMode}
              setViewMode={setViewMode}
              filterTip={filterTip}
              setFilterTip={setFilterTip}
              filteredActivities={filteredActivities}
              selectedCrops={selectedCrops}
              activities={activities}
              buHaftaGorevler={buHaftaGorevler}
              gecikmisGorevler={gecikmisGorevler}
              selectedIl={selectedIl}
              now={now}
            />
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TradeOverviewTab from './trade/TradeOverviewTab';
import PlantTradeTab from './trade/PlantTradeTab';
import AnimalTradeTab from './trade/AnimalTradeTab';
import ProductIntelligenceTab from './trade/ProductIntelligenceTab';
import CountryIntelligenceTab from './trade/CountryIntelligenceTab';
import TradeIntelligenceTab from './trade/TradeIntelligenceTab';

type TabId = 'overview' | 'plant' | 'animal' | 'product' | 'country' | 'intelligence';

export function TradePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) ?? 'overview';

  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams({ tab: 'overview' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div>
      {activeTab === 'overview' && <TradeOverviewTab />}
      {activeTab === 'plant' && <PlantTradeTab />}
      {activeTab === 'animal' && <AnimalTradeTab />}
      {activeTab === 'product' && <ProductIntelligenceTab />}
      {activeTab === 'country' && <CountryIntelligenceTab />}
      {activeTab === 'intelligence' && <TradeIntelligenceTab />}
    </div>
  );
}

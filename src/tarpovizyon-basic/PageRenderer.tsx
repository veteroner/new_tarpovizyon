import type { PageDef } from './pages';
import { RankingPage } from './templates/RankingPage';
import { YearlyPage } from './templates/YearlyPage';
import { StatTilesPage } from './templates/StatTilesPage';
import { TradePage } from './templates/TradePage';
import { StackedComparisonPage } from './templates/StackedComparisonPage';
import { GaugeGridPage } from './templates/GaugeGridPage';
import { CropSectorPage } from './templates/CropSectorPage';
import { MakroOzetPage } from './templates/MakroOzetPage';
import { IndexTrendPage } from './templates/IndexTrendPage';
import { GfeBreakdownPage } from './templates/GfeBreakdownPage';
import { FaoIndexPage } from './templates/FaoIndexPage';
import { EndeksKarsilastirmaPage } from './templates/EndeksKarsilastirmaPage';
import { IlBitkiselUretimPage } from './templates/IlBitkiselUretimPage';
import { IlHayvansalUretimPage } from './templates/IlHayvansalUretimPage';
import { IlAricilikPage } from './templates/IlAricilikPage';
import { HavzaUrunDeseniPage } from './templates/HavzaUrunDeseniPage';
import { IlCografiIsaretPage } from './templates/IlCografiIsaretPage';

export function PageRenderer({ page }: { page: PageDef }) {
  switch (page.template) {
    case 'ranking':
      return <RankingPage config={page.config} />;
    case 'yearly':
      return <YearlyPage config={page.config} />;
    case 'stat-tiles':
      return <StatTilesPage config={page.config} />;
    case 'trade':
      return <TradePage title={page.label} endpoint={page.config.endpoint} modul={page.config.modul} />;
    case 'stacked-comparison':
      return <StackedComparisonPage config={page.config} />;
    case 'gauge-grid':
      return <GaugeGridPage config={page.config} />;
    case 'crop-sector':
      return <CropSectorPage config={page.config} />;
    case 'makro-ozet':
      return <MakroOzetPage config={page.config} />;
    case 'index-trend':
      return <IndexTrendPage config={page.config} />;
    case 'gfe-breakdown':
      return <GfeBreakdownPage config={page.config} />;
    case 'fao-index':
      return <FaoIndexPage config={page.config} />;
    case 'endeks-karsilastirma':
      return <EndeksKarsilastirmaPage config={page.config} />;
    case 'il-bitkisel-uretim':
      return <IlBitkiselUretimPage config={page.config} />;
    case 'il-hayvansal-uretim':
      return <IlHayvansalUretimPage config={page.config} />;
    case 'il-aricilik':
      return <IlAricilikPage config={page.config} />;
    case 'havza-urun-deseni':
      return <HavzaUrunDeseniPage config={page.config} />;
    case 'il-cografi-isaret':
      return <IlCografiIsaretPage config={page.config} />;
    default:
      return null;
  }
}

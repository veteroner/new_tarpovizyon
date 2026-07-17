import type { RankingPageConfig } from './templates/RankingPage';
import type { YearlyPageConfig } from './templates/YearlyPage';
import type { StatTilesPageConfig } from './templates/StatTilesPage';
import type { StackedComparisonPageConfig } from './templates/StackedComparisonPage';
import type { GaugeGridPageConfig } from './templates/GaugeGridPage';
import type { CropSectorPageConfig } from './templates/CropSectorPage';
import type { MakroOzetPageConfig } from './templates/MakroOzetPage';
import type { IndexTrendPageConfig } from './templates/IndexTrendPage';
import type { GfeBreakdownPageConfig } from './templates/GfeBreakdownPage';
import type { FaoIndexPageConfig } from './templates/FaoIndexPage';
import type { EndeksKarsilastirmaPageConfig } from './templates/EndeksKarsilastirmaPage';
import type { IlBitkiselUretimPageConfig } from './templates/IlBitkiselUretimPage';
import type { IlHayvansalUretimPageConfig } from './templates/IlHayvansalUretimPage';
import type { IlAricilikPageConfig } from './templates/IlAricilikPage';
import type { HavzaUrunDeseniPageConfig } from './templates/HavzaUrunDeseniPage';
import type { IlCografiIsaretPageConfig } from './templates/IlCografiIsaretPage';

export type PageDef =
  | { path: string; label: string; template: 'ranking'; config: RankingPageConfig }
  | { path: string; label: string; template: 'yearly'; config: YearlyPageConfig }
  | { path: string; label: string; template: 'stat-tiles'; config: StatTilesPageConfig }
  | { path: string; label: string; template: 'trade'; config: { endpoint: string; modul?: 'hayvansal' | 'bitkisel' } }
  | { path: string; label: string; template: 'crop-sector'; config: CropSectorPageConfig }
  | { path: string; label: string; template: 'stacked-comparison'; config: StackedComparisonPageConfig }
  | { path: string; label: string; template: 'gauge-grid'; config: GaugeGridPageConfig }
  | { path: string; label: string; template: 'makro-ozet'; config: MakroOzetPageConfig }
  | { path: string; label: string; template: 'index-trend'; config: IndexTrendPageConfig }
  | { path: string; label: string; template: 'gfe-breakdown'; config: GfeBreakdownPageConfig }
  | { path: string; label: string; template: 'fao-index'; config: FaoIndexPageConfig }
  | { path: string; label: string; template: 'endeks-karsilastirma'; config: EndeksKarsilastirmaPageConfig }
  | { path: string; label: string; template: 'il-bitkisel-uretim'; config: IlBitkiselUretimPageConfig }
  | { path: string; label: string; template: 'il-hayvansal-uretim'; config: IlHayvansalUretimPageConfig }
  | { path: string; label: string; template: 'il-aricilik'; config: IlAricilikPageConfig }
  | { path: string; label: string; template: 'havza-urun-deseni'; config: HavzaUrunDeseniPageConfig }
  | { path: string; label: string; template: 'il-cografi-isaret'; config: IlCografiIsaretPageConfig };

export type Section = { label: string; path: string; pages: PageDef[] };

/** Top-level nav category grouping several sections (e.g. "Hayvancılık" holds all
 *  the animal-sector sections). The 4 groups mirror the TARPOL landing page. */
export type NavGroup = { label: string; sections: Section[] };

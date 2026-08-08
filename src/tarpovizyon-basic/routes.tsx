import { Navigate, Route } from 'react-router-dom';
import { BasicShell } from './BasicShell';
import DataShell from '../components/DataShell';
import { PageRenderer } from './PageRenderer';
import { SECTIONS } from './pages';

const firstPage = SECTIONS[0].pages[0];

export function tarpovizyonBasicRoutes() {
  return (
    /*
     * Kabuk cihaza göre: geniş ekranda Basic'in kendi üst menüsü, dar ekranda
     * uygulamanın iOS kabuğu. Basic mobilde daha önce hiç görünmüyordu —
     * sekme çubuğu ve geri düğmesi olmadan açılıyor, açıldığında da
     * uygulamadan kopuk duruyordu.
     */
    <Route path="/tarpovizyon-basic" element={<DataShell desktop={<BasicShell />} />}>
      <Route index element={<Navigate to={`${SECTIONS[0].path}/${firstPage.path}`} replace />} />
      {SECTIONS.map((section) =>
        section.pages.map((page) => (
          <Route
            key={`${section.path}/${page.path}`}
            path={`${section.path}/${page.path}`}
            element={<PageRenderer page={page} />}
          />
        ))
      )}
    </Route>
  );
}

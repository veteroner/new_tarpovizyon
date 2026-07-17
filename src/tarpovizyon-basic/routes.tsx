import { Navigate, Route } from 'react-router-dom';
import { BasicShell } from './BasicShell';
import { PageRenderer } from './PageRenderer';
import { SECTIONS } from './pages';

const firstPage = SECTIONS[0].pages[0];

export function tarpovizyonBasicRoutes() {
  return (
    <Route path="/tarpovizyon-basic" element={<BasicShell />}>
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

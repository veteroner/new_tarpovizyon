import { Outlet } from 'react-router-dom';
import { AutoPageHeader } from './AutoPageHeader';

export function AppChrome() {
  return (
    <>
      <AutoPageHeader />
      <Outlet />
    </>
  );
}

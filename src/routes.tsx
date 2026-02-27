import { Routes, Route } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Connect from '@/pages/Connect';
import Workspace from '@/pages/Workspace';
import NotFound from '@/pages/NotFound';

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/connect" element={<Connect />} />
    <Route path="/workspace" element={<Workspace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;

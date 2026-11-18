import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

const CustomerPage = lazy(() => import('./pages/CustomerPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">화면을 불러오는 중...</div>}>
          <Routes>
            <Route path="/" element={<CustomerPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  );
}

export default App;
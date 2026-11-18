import { HashRouter, Routes, Route } from 'react-router-dom';
import CustomerPage from './pages/CustomerPage.tsx';
import AdminPage from './pages/AdminPage.tsx';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<CustomerPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
import { lazy, Suspense, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

const EDUCATION_FONT_STORAGE_KEY = 'bakery-stock-education-font';

function readEducationFontPreference() {
  try {
    return window.localStorage.getItem(EDUCATION_FONT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

const CustomerPage = lazy(() => import('./pages/CustomerPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function App() {
  const [isEducationFontEnabled, setIsEducationFontEnabled] = useState(readEducationFontPreference);

  const updateEducationFontPreference = (enabled: boolean) => {
    setIsEducationFontEnabled(enabled);
    try {
      window.localStorage.setItem(EDUCATION_FONT_STORAGE_KEY, String(enabled));
    } catch {
      return;
    }
  };

  return (
    <HashRouter>
      <div
        className="min-h-screen bg-surface-page font-sans text-brand-primary"
        style={isEducationFontEnabled ? { fontFamily: 'GangwonEduAll, ui-sans-serif, system-ui, sans-serif' } : undefined}
      >
        <Suspense fallback={<div className="p-4 text-center text-sm text-stone-500">화면을 불러오는 중...</div>}>
          <Routes>
            <Route
              path="/"
              element={(
                <CustomerPage
                  isEducationFontEnabled={isEducationFontEnabled}
                  onEducationFontChange={updateEducationFontPreference}
                />
              )}
            />
            <Route
              path="/admin"
              element={(
                <AdminPage
                  isEducationFontEnabled={isEducationFontEnabled}
                  onEducationFontChange={updateEducationFontPreference}
                />
              )}
            />
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  );
}

export default App;
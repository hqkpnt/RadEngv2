import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Layout, RouteKey } from './components/Layout';
import { AppProvider } from './context/AppContext';
import { HomePage } from './pages/HomePage';
import { LessonDetailPage } from './pages/LessonDetailPage';
import { LessonsPage } from './pages/LessonsPage';
import { LibraryPage } from './pages/LibraryPage';
import { MasteredBankPage } from './pages/MasteredBankPage';
import { ReviewPage } from './pages/ReviewPage';
import { isFramedByAnotherPage } from './utils/security';

function parseHash(rawHash: string): { route: RouteKey; param?: string } {
  const clean = rawHash.replace(/^#\/?/, '').trim();
  if (!clean || clean === 'home') return { route: 'home' };
  if (clean === 'lessons') return { route: 'lessons' };
  if (clean.startsWith('lesson/')) {
    return { route: 'lesson', param: decodeURIComponent(clean.slice('lesson/'.length)) };
  }
  if (clean === 'review') return { route: 'review' };
  if (clean === 'mastered') return { route: 'mastered' };
  if (clean === 'library') return { route: 'library' };
  return { route: 'home' };
}

const RouterView: React.FC = () => {
  const [hash, setHash] = useState<string>(() => window.location.hash || '#/home');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/home');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((nextHash: string) => {
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setHash(nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { route, param } = parseHash(hash);

  return (
    <Layout currentRoute={route} navigate={navigate}>
      {route === 'home' && <HomePage navigate={navigate} />}
      {route === 'lessons' && <LessonsPage navigate={navigate} />}
      {route === 'lesson' && param && <LessonDetailPage lessonId={param} navigate={navigate} />}
      {route === 'review' && <ReviewPage navigate={navigate} />}
      {route === 'mastered' && <MasteredBankPage />}
      {route === 'library' && <LibraryPage navigate={navigate} />}
    </Layout>
  );
};

export const App: React.FC = () => {
  // Active Anti-Clickjacking Guard: blocks rendering inside any external <iframe>
  if (isFramedByAnotherPage()) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          textAlign: 'center',
          background: '#0b1120',
          color: '#f8fafc',
        }}
      >
        <div className="card stack-sm" style={{ maxWidth: 460 }}>
          <ShieldAlert size={40} style={{ color: '#f87171', margin: '0 auto' }} />
          <h2 style={{ margin: 0 }}>Chặn nhúng khung (Anti-Clickjacking)</h2>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.92rem' }}>
            Vì lý do bảo mật, <strong>RadEng v4.0</strong> không cho phép trang web khác nhúng ứng dụng này vào trong <code className="mono">&lt;iframe&gt;</code>.
          </p>
          <a
            href={window.location.href}
            target="_top"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ marginTop: 8 }}
          >
            Mở trực tiếp trên cửa sổ chính
          </a>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <RouterView />
    </AppProvider>
  );
};

export default App;

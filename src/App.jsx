import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/ScorePilotAuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PosterGenerator from './pages/PosterGenerator';
import PosterChat from './pages/PosterChat';
import WidgetStandings from './pages/WidgetStandings';
import ScorePilotLogin from './pages/ScorePilotLogin';
import { StatsRefreshProvider } from '@/lib/StatsRefreshContext';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, authError, isAuthenticated, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && location.pathname !== '/login' && !isAuthenticated) {
      navigateToLogin(location.pathname + location.search);
    }
  }, [isLoadingAuth, isAuthenticated, location.pathname, location.search, navigateToLogin]);

  if (location.pathname === '/login') return <ScorePilotLogin />;
  if (isLoadingAuth) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;
  if (!isAuthenticated) return null;

  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        {Object.entries(Pages).map(([path, Page]) => <Route key={path} path={`/${path}`} element={<Page />} />)}
        <Route path="/PosterGenerator" element={<PosterGenerator />} />
        <Route path="/PosterChat" element={<PosterChat />} />
        <Route path="/widget/standings" element={<WidgetStandings />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <StatsRefreshProvider>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </StatsRefreshProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

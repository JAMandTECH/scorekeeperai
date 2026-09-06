import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './ScorePilotAuthContext';

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    window.parent?.postMessage({ type: 'app_changed_url', url: window.location.href }, '*');
  }, [location]);

  useEffect(() => {
    if (!isAuthenticated) return;
    window.dispatchEvent(new CustomEvent('scorepilot:navigation', { detail: { pathname: location.pathname } }));
  }, [location.pathname, isAuthenticated]);

  return null;
}

import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin" />
  </div>
);

/**
 * Restricts a route to league staff: built-in admins and users flagged
 * as scorekeepers. Everyone else is redirected to the app home page.
 */
export default function StaffRoute({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  const isStaff = isAuthenticated && (user?.role === "admin" || user?.is_scorekeeper === true);
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  return children;
}
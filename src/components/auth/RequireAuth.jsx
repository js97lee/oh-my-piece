import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MobilePageShell from "../layout/MobilePageShell";

export function AuthLoading() {
  return <MobilePageShell><p className="auth-status" role="status">로그인 상태를 확인하고 있어요.</p></MobilePageShell>;
}

export default function RequireAuth() {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (error) return <MobilePageShell><div className="auth-status" role="alert"><p>{error}</p><button className="signup-secondary-button" onClick={() => refresh().catch(() => {})}>다시 확인</button></div></MobilePageShell>;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace />;
  return <Outlet />;
}

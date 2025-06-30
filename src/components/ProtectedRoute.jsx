import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }) {
  const { token, isInitialized } = useSelector((s) => s.user);
  
  if (!isInitialized) {
    return <div className="loader">Loading...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
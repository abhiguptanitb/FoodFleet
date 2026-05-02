import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { getRoleHomePath } from "../utils/roleRoutes";
import LoadingState from "./LoadingState";

const ProtectedRoute = () => {
  const { isAuth, user, loading } = useAppData();

  const location = useLocation();

  if (loading) {
    return (
      <LoadingState
        title="Checking access"
        copy="We are confirming your session before opening this workspace."
      />
    );
  }

  if (!isAuth) {
    return <Navigate to={"/login"} replace />;
  }

  if (user?.role === null && location.pathname !== "/select-role") {
    return <Navigate to={"/select-role"} replace />;
  }

  if (user?.role !== null && location.pathname === "/select-role") {
    return <Navigate to={getRoleHomePath(user?.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

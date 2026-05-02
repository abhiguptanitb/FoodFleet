import { useAppData } from "../context/AppContext";
import { Navigate, Outlet } from "react-router-dom";
import { getRoleHomePath } from "../utils/roleRoutes";
import LoadingState from "./LoadingState";

const PublicRoute = () => {
  const { isAuth, loading, user } = useAppData();

  if (loading) {
    return (
      <LoadingState
        title="Restoring your session"
        copy="We are checking whether you already have a FoodFleet workspace."
      />
    );
  }

  return isAuth ? <Navigate to={getRoleHomePath(user?.role)} replace /> : <Outlet />;
};

export default PublicRoute;

import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protectedRote";
import PublicRoute from "./components/publicRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Admin from "./pages/Admin";
import { getRoleHomePath } from "./utils/roleRoutes";
import LoadingState from "./components/LoadingState";

const App = () => {
  const { user, loading } = useAppData();

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <LoadingState
          title="Preparing your workspace"
          copy="We are syncing your account, role access, and live FoodFleet data."
        />
      </div>
    );
  }

  const roleHomePath = getRoleHomePath(user?.role);

  return (
    <div className={`app-shell role-${user?.role || "customer"}`}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={<Navigate to={roleHomePath} replace />}
            />
            <Route
              path="/browse"
              element={
                !user?.role || user.role === "customer" ? (
                  <Home />
                ) : (
                  <Navigate to={roleHomePath} replace />
                )
              }
            />
            <Route
              path="/partner"
              element={
                user?.role === "seller" ? (
                  <Restaurant />
                ) : (
                  <Navigate to={roleHomePath} replace />
                )
              }
            />
            <Route
              path="/deliveries"
              element={
                user?.role === "rider" ? (
                  <RiderDashboard />
                ) : (
                  <Navigate to={roleHomePath} replace />
                )
              }
            />
            <Route
              path="/admin"
              element={
                user?.role === "admin" ? (
                  <Admin />
                ) : (
                  <Navigate to={roleHomePath} replace />
                )
              }
            />
            <Route
              path="/customer"
              element={<Navigate to={roleHomePath} replace />}
            />
            <Route
              path="/seller"
              element={<Navigate to={roleHomePath} replace />}
            />
            <Route
              path="/rider"
              element={<Navigate to={roleHomePath} replace />}
            />
            <Route
              path="/paymentsuccess/:paymentId"
              element={<PaymentSuccess />}
            />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order/:id" element={<OrderPage />} />
            <Route path="/ordersuccess" element={<OrderSuccess />} />
            <Route path="/address" element={<AddAddressPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/restaurant/:id" element={<RestaurantPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/select-role" element={<SelectRole />} />
            <Route path="/account" element={<Account />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;

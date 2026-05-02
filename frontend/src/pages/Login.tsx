import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";
import { getRoleHomePath } from "../utils/roleRoutes";
import {
  FiAlertCircle,
  FiBriefcase,
  FiShield,
  FiShoppingBag,
  FiTruck,
  FiX,
} from "react-icons/fi";

type LoginRole = "customer" | "seller" | "rider" | "admin";

const loginRoles: {
  key: LoginRole;
  title: string;
  copy: string;
  icon: typeof FiShoppingBag;
}[] = [
  {
    key: "customer",
    title: "Order Food",
    copy: "Browse kitchens, manage carts, and track deliveries.",
    icon: FiShoppingBag,
  },
  {
    key: "seller",
    title: "Run a Kitchen",
    copy: "Manage outlets, menus, orders, and sales.",
    icon: FiBriefcase,
  },
  {
    key: "rider",
    title: "Deliver Orders",
    copy: "Accept assignments and handle live deliveries.",
    icon: FiTruck,
  },
  {
    key: "admin",
    title: "Manage Platform",
    copy: "Review partners, riders, and platform operations.",
    icon: FiShield,
  },
];

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [authError, setAuthError] = useState("");
  const navigate = useNavigate();

  const { setUser, setIsAuth } = useAppData();

  const responseGoogle = async (authResult: any) => {
    setLoading(true);
    setAuthError("");
    try {
      const result = await axios.post(`${authService}/api/auth/login`, {
        code: authResult["code"],
        role: selectedRole,
      });

      localStorage.setItem("token", result.data.token);
      toast.success(result.data.message);
      setLoading(false);
      setUser(result.data.user);
      setIsAuth(true);
      navigate(getRoleHomePath(result.data.user?.role));
    } catch (error) {
      console.log(error);
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Problem while login";
      setAuthError(message);
      toast.error(message, { duration: 5000 });
      setLoading(false);
    }
  };

  const startGoogleLogin = () => {
    if (!selectedRole) {
      toast.error("Choose how you want to continue");
      return;
    }

    googleLogin();
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: responseGoogle,
    flow: "auth-code",
  });
  return (
    <div className="page-wrap flex min-h-screen items-center py-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hero-panel fade-up hidden px-8 py-10 lg:block">
          <p className="pill-label">Food Delivery</p>
          <h1 className="section-title mt-5">
            Street-food speed with live delivery control.
          </h1>
          <p className="section-copy mt-4 max-w-xl">
            Browse nearby kitchens, run stores, dispatch riders, and keep every
            order moving through one loud, clear FoodFleet command center.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="soft-card p-5">
              <p className="text-3xl font-semibold text-[var(--text)]">Fast</p>
              <p className="mt-2 text-sm text-[#6d5d52]">
                Quick access to menus, carts, and orders.
              </p>
            </div>
            <div className="soft-card p-5">
              <p className="text-3xl font-semibold text-[var(--text)]">Neon</p>
              <p className="mt-2 text-sm text-[#6d5d52]">
                Strong role colors make every workspace feel distinct.
              </p>
            </div>
            <div className="soft-card p-5">
              <p className="text-3xl font-semibold text-[var(--text)]">Live</p>
              <p className="mt-2 text-sm text-[#6d5d52]">
                Real-time order and delivery updates stay intact.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card fade-up w-full max-w-xl justify-self-center px-6 py-8 sm:px-8 sm:py-10">
          <p className="pill-label mx-auto w-fit">Welcome Back</p>
          <h1 className="mt-5 text-center text-4xl font-black tracking-[-0.04em] text-[#1f1a17]">
            FoodFleet
          </h1>
          <p className="section-copy mt-3 text-center text-sm">
            Sign in or create your account for the workspace you use on
            FoodFleet.
          </p>

          <div className="mt-7 grid gap-3">
            {loginRoles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.key;

              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.key);
                    setAuthError("");
                  }}
                  className={`flex items-center gap-4 rounded-[20px] border-2 bg-white p-4 text-left transition hover:-translate-y-0.5 ${
                    isSelected
                      ? "border-[var(--text)] shadow-[5px_5px_0_var(--accent-2)]"
                      : "border-[#11182726] hover:border-[var(--text)]"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--text)] ${
                      isSelected
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[#fff6ee] text-[var(--accent)]"
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black text-[var(--text)]">
                      {role.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[var(--text-soft)]">
                      {role.copy}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={startGoogleLogin}
            disabled={loading || !selectedRole}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-[18px] border-2 border-[var(--text)] bg-white px-4 py-4 text-sm font-semibold text-[var(--text)] shadow-[5px_5px_0_var(--text)] hover:-translate-y-0.5 disabled:opacity-60"
          >
            <FcGoogle size={20} />
            {loading ? "Signing you in..." : "Continue with Google"}
          </button>

          {authError && (
            <div className="mt-5 rounded-[20px] border-2 border-[#ffb199] bg-[#fff3eb] p-4 text-left shadow-[4px_4px_0_#ffb199]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-[#e4572e] bg-white text-[#e4572e]">
                  <FiAlertCircle size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#1f1a17]">
                    Sign-in blocked
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#7a4f3a]">
                    {authError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthError("")}
                  className="rounded-full p-1 text-[#7a4f3a] hover:bg-white"
                  aria-label="Dismiss sign-in error"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          )}

          <p className="mt-5 text-center text-xs leading-6 text-[#8b786c]">
            By continuing, you agree to our{" "}
            <span className="font-semibold text-[#e4572e]">Terms of Service</span>{" "}
            and{" "}
            <span className="font-semibold text-[#e4572e]">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

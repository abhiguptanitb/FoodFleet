import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiLogOut, BiMapPin, BiPackage } from "react-icons/bi";
import axios from "axios";
import { restaurantService } from "../main";
import type { IOrder } from "../types";
import { logoutSession } from "../utils/authSession";

const formatOrderDate = (date: Date | string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

const Account = () => {
  const { user, setUser, setIsAuth } = useAppData();
  const [imageError, setImageError] = useState(false);
  const [deliveredOrders, setDeliveredOrders] = useState<IOrder[]>([]);
  const firstLetter = user?.name?.charAt(0)?.toUpperCase() ?? "";
  const navigate = useNavigate();

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  useEffect(() => {
    const fetchDeliveredOrders = async () => {
      try {
        const { data } = await axios.get(
          `${restaurantService}/api/order/myorder`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setDeliveredOrders(
          (data.orders || [])
            .filter((order: IOrder) => order.status === "delivered")
            .slice(0, 3)
        );
      } catch (error) {
      }
    };

    fetchDeliveredOrders();
  }, []);

  const logoutHandler = async () => {
    await logoutSession();
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  return (
    <div className="page-wrap py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="hero-panel fade-up p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {user?.image && !imageError ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-[72px] w-[72px] rounded-[24px] object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[var(--accent)] text-2xl font-semibold text-white">
                  {firstLetter}
                </div>
              )}
              <div>
                <p className="pill-label">My Account</p>
                <h1 className="mt-3 text-3xl font-semibold text-[#1f1a17]">
                  {user?.name}
                </h1>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logoutHandler}
              className="ghost-button px-5 py-3 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <ActionCard
            icon={<BiPackage className="h-5 w-5 text-[var(--accent)]" />}
            title="Your Orders"
            copy="Track active deliveries and review past orders."
            onClick={() => navigate("/orders")}
          />
          <ActionCard
            icon={<BiMapPin className="h-5 w-5 text-[var(--accent)]" />}
            title="Saved Addresses"
            copy="Manage delivery locations for future orders."
            onClick={() => navigate("/address")}
          />
          <ActionCard
            icon={<BiLogOut className="h-5 w-5 text-[var(--accent)]" />}
            title="Sign Out"
            copy="Securely log out of your FoodFleet account."
            onClick={logoutHandler}
          />
        </div>

        <section className="soft-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="pill-label">History</p>
              <h2 className="mt-3 text-xl font-semibold text-[#1f1a17]">
                Delivered orders
              </h2>
            </div>
            <button
              onClick={() => navigate("/orders")}
              className="ghost-button w-fit px-4 py-2 text-sm font-semibold"
            >
              View All
            </button>
          </div>

          {deliveredOrders.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-[#eef6ff] p-4 text-sm leading-6 text-[var(--text-soft)]">
              Your delivered orders will show here with the order date and
              delivery date.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {deliveredOrders.map((order) => (
                <button
                  key={order._id}
                  onClick={() => navigate(`/order/${order._id}`)}
                  className="w-full rounded-2xl border border-[#d8e3ef] bg-[#f8fbff] p-4 text-left hover:-translate-y-0.5 hover:border-[#93c5fd]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1f1a17]">
                        {order.restaurantName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        Order #{order._id.slice(-6)} · Rs {order.totalAmount}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-[#eef8f1] px-3 py-1 text-xs font-semibold text-[#25553f]">
                      Delivered {formatOrderDate(order.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[#64748b]">
                    Ordered {formatOrderDate(order.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ActionCard = ({
  icon,
  title,
  copy,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  onClick: () => void;
}) => (
  <button
    className="soft-card flex flex-col items-start gap-3 p-5 text-left hover:-translate-y-1"
    onClick={onClick}
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
      {icon}
    </div>
    <h2 className="text-lg font-semibold text-[#1f1a17]">{title}</h2>
    <p className="text-sm leading-6 text-[var(--text-soft)]">{copy}</p>
  </button>
);

export default Account;

import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiGrid,
  FiShield,
  FiShoppingBag,
  FiTrash2,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { adminService } from "../main";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import RiderAdmin from "../components/RiderAdmin";
import { useAppData } from "../context/AppContext";
import { SkeletonState } from "../components/LoadingState";

type AdminRestaurant = {
  _id: string;
  name: string;
  image?: string;
  phone?: string;
  isVerified: boolean;
  autoLocation?: {
    formattedAddress?: string;
  };
};

type AdminRider = {
  _id: string;
  picture?: string;
  userId?: string;
  phone?: string;
  phoneNumber?: string;
  aadharNumber?: string;
  drivingLicenseNumber?: string;
  isVerified: boolean;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
};

type AdminCustomer = {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
  createdAt?: string;
};

const Admin = () => {
  const { user } = useAppData();
  const [restaurant, setRestaurant] = useState<AdminRestaurant[]>([]);
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"restaurant" | "rider" | "customer">(
    "restaurant"
  );
  const [adminImageError, setAdminImageError] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<
    "all" | "pending" | "verified" | "rejected"
  >("all");
  const [sortBy, setSortBy] = useState<"newest" | "name">("newest");
  const [customerToDelete, setCustomerToDelete] =
    useState<AdminCustomer | null>(null);

  useEffect(() => {
    setAdminImageError(false);
  }, [user?.image]);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(
        `${adminService}/api/v1/admin/restaurant/pending`,
        {
          params: { status: verificationFilter },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const response = await axios.get(
        `${adminService}/api/v1/admin/rider/pending`,
        {
          params: { status: verificationFilter },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const customerResponse = await axios.get(
        `${adminService}/api/v1/admin/customers`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurant(data.restaurants);
      setRiders(response.data.riders);
      setCustomers(customerResponse.data.customers);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [verificationFilter]);

  const handleRestaurantStatusChange = (
    restaurantId: string,
    isVerified: boolean
  ) => {
    setRestaurant((prev) =>
      prev.map((item) =>
        item._id === restaurantId ? { ...item, isVerified } : item
      )
    );
  };

  const handleRiderStatusChange = (riderId: string, isVerified: boolean) => {
    setRiders((prev) =>
      prev.map((item) =>
        item._id === riderId ? { ...item, isVerified } : item
      )
    );
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      setDeletingCustomerId(customerId);

      const { data } = await axios.delete(
        `${adminService}/api/v1/admin/customers/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setCustomers((prev) => prev.filter((item) => item._id !== customerId));
      setCustomerToDelete(null);
      toast.success(data.message || "Customer deleted successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete customer");
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const filterVerified = <T extends { isVerified?: boolean }>(items: T[]) =>
    items.filter((item) => {
      if (verificationFilter === "verified") return item.isVerified;
      if (verificationFilter === "pending") return !item.isVerified;
      return true;
    });

  const sortRecords = <T extends { name?: string; createdAt?: string; user?: { name?: string } }>(
    items: T[]
  ) =>
    [...items].sort((a, b) => {
      if (sortBy === "name") {
        const aName = (a.name || a.user?.name || "").toLowerCase();
        const bName = (b.name || b.user?.name || "").toLowerCase();
        return aName.localeCompare(bName);
      }
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

  const searchText = search.toLowerCase();
  const visibleRestaurants = sortRecords(
    filterVerified(restaurant).filter((item) =>
      `${item.name} ${item.phone || ""} ${item.autoLocation?.formattedAddress || ""}`
        .toLowerCase()
        .includes(searchText)
    )
  );
  const visibleRiders = sortRecords(
    filterVerified(riders).filter((item) =>
      `${item.user?.name || ""} ${item.user?.email || ""} ${item.phoneNumber || item.phone || ""}`
        .toLowerCase()
        .includes(searchText)
    )
  );
  const visibleCustomers = sortRecords(
    customers.filter((item) =>
      `${item.name || ""} ${item.email || ""}`.toLowerCase().includes(searchText)
    )
  );

  if (loading) {
    return <SkeletonState type="admin-list" title="Admin review lists" />;
  }

  return (
    <div className="role-page px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border-2 border-[var(--text)] bg-white shadow-[8px_8px_0_var(--text)]">
          <div className="bg-[radial-gradient(circle_at_top_left,_var(--role-glow),_transparent_34%),linear-gradient(135deg,#ffffff_0%,var(--accent-soft)_58%)] p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="rounded-[24px] border-2 border-[var(--text)] bg-white p-5 shadow-[5px_5px_0_var(--accent-3)]">
                <div className="flex items-center gap-4">
                  {user?.image && !adminImageError ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="h-16 w-16 rounded-2xl object-cover"
                      onError={() => setAdminImageError(true)}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--text)] bg-[var(--accent)] text-xl font-semibold text-[#08111c] shadow-[4px_4px_0_var(--text)]">
                      {user?.name?.[0] || "A"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                      Admin Profile
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-[#1f1a17]">
                      {user?.name || "Administrator"}
                    </h2>
                    <p className="truncate text-sm text-[var(--text-soft)]">
                      {user?.email || "No email available"}
                    </p>
                  </div>
                </div>

                <div className="stat-panel-collapsible mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#eef2ff] p-4">
                    <div className="flex items-center gap-2 text-[#2563eb]">
                      <FiShoppingBag size={16} />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                        Restaurants
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-[#1f1a17]">
                      {restaurant.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f5faf7] p-4">
                    <div className="flex items-center gap-2 text-[#1f9d64]">
                      <FiTruck size={16} />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                        Riders
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-[#1f1a17]">
                      {riders.length}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-2xl bg-[#f4f3ff] p-4">
                    <div className="flex items-center gap-2 text-[#4f46e5]">
                      <FiUsers size={16} />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                        Customers
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-[#1f1a17]">
                      {customers.length}
                    </p>
                  </div>
                </div>

              </aside>

              <div className="rounded-[24px] border-2 border-[var(--text)] bg-white p-5 shadow-[5px_5px_0_var(--accent-2)]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--text)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">
                      <FiShield size={14} />
                      Admin Dashboard
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold text-[#1f1a17]">
                      Verification Center
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                      Review restaurants and riders, keep every profile visible,
                      and switch verification status whenever needed.
                    </p>
                  </div>

                  <div className="mobile-tabs sm:w-auto">
                    <button
                      onClick={() => setTab("restaurant")}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:flex-none ${
                        tab === "restaurant"
                          ? "bg-[var(--accent)] text-[#08111c] shadow-[3px_3px_0_var(--text)]"
                          : "text-[var(--text-soft)] hover:text-[#1f1a17]"
                      }`}
                    >
                      Restaurants
                    </button>

                    <button
                      onClick={() => setTab("rider")}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:flex-none ${
                        tab === "rider"
                          ? "bg-[var(--accent)] text-[#08111c] shadow-[3px_3px_0_var(--text)]"
                          : "text-[var(--text-soft)] hover:text-[#1f1a17]"
                      }`}
                    >
                      Riders
                    </button>

                    <button
                      onClick={() => setTab("customer")}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:flex-none ${
                        tab === "customer"
                          ? "bg-[var(--accent)] text-[#08111c] shadow-[3px_3px_0_var(--text)]"
                          : "text-[var(--text-soft)] hover:text-[#1f1a17]"
                      }`}
                    >
                      Customers
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
                  <div className="flex items-center gap-2 text-[#334155]">
                    <FiGrid size={16} className="text-[var(--accent)]" />
                    <span className="text-sm font-medium">
                      {tab === "restaurant"
                        ? "All restaurant profiles"
                        : tab === "rider"
                          ? "All rider profiles"
                          : "All customer accounts"}
                    </span>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#64748b]">
                    {tab === "restaurant"
                      ? restaurant.length
                      : tab === "rider"
                        ? riders.length
                        : customers.length}{" "}
                    entries
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="field-input py-3 text-sm"
                    placeholder="Search restaurants, riders, or customers"
                  />
                  <select
                    value={verificationFilter}
                    onChange={(event) =>
                      setVerificationFilter(event.target.value as typeof verificationFilter)
                    }
                    className="field-input py-3 text-sm"
                    disabled={tab === "customer"}
                  >
                    <option value="all">All verification</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                    className="field-input py-3 text-sm"
                  >
                    <option value="newest">Newest first</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {tab === "restaurant" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleRestaurants.length === 0 ? (
              <div className="empty-state font-semibold">
                No restaurants found.
              </div>
            ) : (
              visibleRestaurants.map((r) => (
                <AdminRestaurantCard
                  key={r._id}
                  restaurant={r}
                  onStatusChange={handleRestaurantStatusChange}
                />
              ))
            )}
          </div>
        )}

        {tab === "rider" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleRiders.length === 0 ? (
              <div className="empty-state font-semibold">
                No riders found.
              </div>
            ) : (
              visibleRiders.map((r) => (
                <RiderAdmin
                  key={r._id}
                  rider={r}
                  onStatusChange={handleRiderStatusChange}
                />
              ))
            )}
          </div>
        )}

        {tab === "customer" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleCustomers.length === 0 ? (
              <div className="empty-state font-semibold">
                No customers found.
              </div>
            ) : (
              visibleCustomers.map((customer) => (
                <div
                  key={customer._id}
                  className="ui-card compact-mobile-row p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      {customer.image ? (
                        <img
                          src={customer.image}
                          alt={customer.name || "Customer"}
                          className="h-16 w-16 rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_12%,transparent)] object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--text)] bg-[var(--accent)] text-lg font-black text-[#08111c] shadow-[4px_4px_0_var(--text)]">
                          {customer.name?.[0] || "C"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-black text-[var(--text)]">
                          {customer.name || "Customer"}
                        </h2>
                        <p className="truncate text-sm text-[var(--text-soft)]">
                          {customer.email || "No email available"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setCustomerToDelete(customer)}
                      disabled={deletingCustomerId === customer._id}
                      className="action-button action-button-danger min-h-12 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-32"
                    >
                      <FiTrash2 size={16} />
                      {deletingCustomerId === customer._id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {customerToDelete && (
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ui-modal w-full max-w-lg p-5 sm:p-6">
            <p className="pill-label">Delete Customer</p>
            <h2 className="mt-4 text-2xl font-black text-[var(--text)]">
              Delete {customerToDelete.name || "this customer"}?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
              This will remove the customer and related orders, cart items, and
              addresses. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="action-button px-4 py-3 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteCustomer(customerToDelete._id)}
                disabled={deletingCustomerId === customerToDelete._id}
                className="action-button action-button-danger px-4 py-3 text-sm disabled:opacity-60"
              >
                <FiTrash2 size={16} />
                {deletingCustomerId === customerToDelete._id
                  ? "Deleting..."
                  : "Delete Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

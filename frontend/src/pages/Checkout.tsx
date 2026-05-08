import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import { useNavigate } from "react-router-dom";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";
import LoadingState from "../components/LoadingState";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const Checkout = () => {
  const { cart, subTotal, quauntity } = useAppData();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setselectedAddressId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }

      try {
        const { data } = await axios.get(
          `${restaurantService}/api/address/all`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setAddresses(data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddresses();
  }, [cart]);

  if (!cart || cart.length === 0) {
    return (
      <div className="page-wrap flex min-h-[60vh] items-center justify-center">
        <div className="glass-card px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-[#1f1a17]">
            Your cart is empty
          </h1>
          <p className="section-copy mt-3 text-sm">
            Add items before moving to checkout.
          </p>
        </div>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subTotal + deliveryFee + platformFee;

  const createOrder = async (paymentMethod: "razorpay" | "stripe") => {
    if (!selectedAddressId) return null;

    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        {
          paymentMethod,
          addressId: selectedAddressId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      toast.error("Failed to create order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);
      const order = await createOrder("razorpay");
      if (!order) return;

      const { orderId, amount } = order;
      const { data } = await axios.post(`${utilsService}/api/payment/create`, {
        orderId,
      });

      const { razorpayOrderId, key } = data;

      const options = {
        key,
        amount: amount * 100,
        currency: "INR",
        name: "FoodFleet",
        description: "Food order payment",
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });

            toast.success("Payment successful");
            navigate("/paymentsuccess/" + response.razorpay_payment_id);
          } catch (error) {
            toast.error("Payment verification failed");
          }
        },
        theme: {
          color: "#2563EB",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.log(error);
      toast.error("Payment failed. Please refresh the page.");
    } finally {
      setLoadingRazorpay(false);
    }
  };

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);
      const order = await createOrder("stripe");
      if (!order) return;

      const { orderId } = order;

      await stripePromise;

      const { data } = await axios.post(
        `${utilsService}/api/payment/stripe/create`,
        {
          orderId,
        }
      );

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create payment session");
      }
    } catch (error) {
      console.log(error);
      toast.error("Payment failed");
    } finally {
      setLoadingStripe(false);
    }
  };

  return (
    <div className="page-wrap space-y-6 py-6">
      <section className="hero-panel fade-up p-5 sm:p-6">
        <p className="pill-label">Checkout</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#1f1a17]">
          Confirm delivery and payment
        </h1>
        <p className="mt-2 text-lg font-medium text-[#1f1a17]">{restaurant.name}</p>
        <p className="mt-1 text-sm text-[var(--text-soft)]">
          {restaurant.autoLocation.formattedAddress}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="soft-card p-5">
            <h2 className="text-xl font-semibold text-[#1f1a17]">
              Delivery Address
            </h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Pick the address where you want this order delivered.
            </p>

            <div className="mt-4 space-y-3">
              {loadingAddress ? (
                <LoadingState
                  compact
                  title="Loading delivery addresses"
                  copy="We are checking the saved locations for this order."
                />
              ) : addresses.length === 0 ? (
                <p className="rounded-2xl bg-[#eef6ff] px-4 py-4 text-sm text-[#64748b]">
                  No saved address found. Please add one before placing the order.
                </p>
              ) : (
                addresses.map((add) => (
                  <label
                    key={add._id}
                    className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                      selectedAddressId === add._id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[#d8e3ef] bg-white hover:bg-[#eef6ff]"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={selectedAddressId === add._id}
                      onChange={() => setselectedAddressId(add._id)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#1f1a17]">
                        {add.formattedAddress}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        Contact: {add.mobile}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>

          <section className="soft-card p-5">
            <h2 className="text-xl font-semibold text-[#1f1a17]">Payment Method</h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Choose the payment option you want to use for this order.
            </p>

            <div className="mt-4 space-y-3">
              <button
                disabled={!selectedAddressId || loadingRazorpay || creatingOrder}
                onClick={payWithRazorpay}
                className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#2d7ff9] py-3.5 text-sm font-semibold text-white hover:bg-[#246fe0] disabled:opacity-50"
              >
                {loadingRazorpay ? (
                  <BiLoader size={18} className="animate-spin" />
                ) : (
                  <BiCreditCard size={18} />
                )}
                Pay with Razorpay
              </button>

              <button
                disabled={!selectedAddressId || loadingStripe || creatingOrder}
                onClick={payWithStripe}
                className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#1f1a17] py-3.5 text-sm font-semibold text-white hover:bg-[#312721] disabled:opacity-50"
              >
                {loadingStripe ? (
                  <BiLoader size={18} className="animate-spin" />
                ) : (
                  <BiCreditCard size={18} />
                )}
                Pay with Stripe
              </button>
            </div>
          </section>
        </div>

        <section className="soft-card h-fit p-5">
          <h2 className="text-xl font-semibold text-[#1f1a17]">Order Summary</h2>
          <div className="mt-4 space-y-3">
            {cart.map((cartItem: ICart) => {
              const item = cartItem.itemId as IMenuItem;

              return (
                <div
                  className="flex items-start justify-between gap-4 text-sm"
                  key={cartItem._id}
                >
                  <span className="text-[var(--text-soft)]">
                    {item.name} x {cartItem.quauntity}
                  </span>
                  <span className="font-semibold text-[#1f1a17]">
                    Rs {item.price * cartItem.quauntity}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-3 border-t border-[#d8e3ef] pt-4">
            <div className="flex justify-between text-sm text-[var(--text-soft)]">
              <span>Items ({quauntity})</span>
              <span className="font-semibold text-[#1f1a17]">Rs {subTotal}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--text-soft)]">
              <span>Delivery Fee</span>
              <span className="font-semibold text-[#1f1a17]">
                {deliveryFee === 0 ? "Free" : `Rs ${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-sm text-[var(--text-soft)]">
              <span>Platform Fee</span>
              <span className="font-semibold text-[#1f1a17]">Rs {platformFee}</span>
            </div>

            {subTotal < 250 && (
              <p className="rounded-2xl bg-[#eef6ff] px-4 py-3 text-xs text-[#64748b]">
                Add items worth Rs {250 - subTotal} more to unlock free delivery.
              </p>
            )}

            <div className="flex justify-between border-t border-[#d8e3ef] pt-3 text-base font-semibold text-[#1f1a17]">
              <span>Grand Total</span>
              <span>Rs {grandTotal}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Checkout;

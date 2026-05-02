import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";

const Cart = () => {
  const { cart, subTotal, quauntity, fetchCart } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  if (!cart || cart.length === 0) {
    return (
      <div className="page-wrap flex min-h-[60vh] items-center justify-center">
        <div className="glass-card px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-[#1f1a17]">
            Your cart is empty
          </h1>
          <p className="section-copy mt-3 text-sm">
            Add a few dishes to get started with your next order.
          </p>
        </div>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platfromFee = 7;
  const grandTotal = subTotal + deliveryFee + platfromFee;

  const increaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/inc`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await fetchCart();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const decreaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await fetchCart();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    const confirm = window.confirm("Are you sure you want to clear your cart?");
    if (!confirm) return;

    try {
      setClearingCart(true);
      await axios.delete(`${restaurantService}/api/cart/clear`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      await fetchCart();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <div className="page-wrap space-y-6 py-6">
      <div className="hero-panel fade-up p-5 sm:p-6">
        <p className="pill-label">Cart Summary</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#1f1a17]">
          Review your order
        </h1>
        <p className="mt-2 text-lg font-medium text-[#1f1a17]">{restaurant.name}</p>
        <p className="mt-1 text-sm text-[#6d5d52]">
          {restaurant.autoLocation.formattedAddress}
        </p>
      </div>

      <div className="space-y-4">
        {cart.map((cartItem: ICart) => {
          const item = cartItem.itemId as IMenuItem;
          const isLoading = loadingItemId === item._id;

          return (
            <div
              key={item._id}
              className="soft-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-24 w-full rounded-2xl object-cover sm:w-24"
              />

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#1f1a17]">{item.name}</h3>
                <p className="mt-1 text-sm text-[#6d5d52]">Rs {item.price}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="rounded-full border border-[#ead8cb] p-2 hover:bg-[#fff5ef] disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => decreaseQty(item._id)}
                >
                  {isLoading ? (
                    <VscLoading size={16} className="animate-spin" />
                  ) : (
                    <BiMinus size={16} />
                  )}
                </button>
                <span className="min-w-8 text-center font-semibold text-[#1f1a17]">
                  {cartItem.quauntity}
                </span>
                <button
                  className="rounded-full border border-[#ead8cb] p-2 hover:bg-[#fff5ef] disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => increaseQty(item._id)}
                >
                  {isLoading ? (
                    <VscLoading size={16} className="animate-spin" />
                  ) : (
                    <BiPlus size={16} />
                  )}
                </button>
              </div>

              <p className="w-24 text-right text-base font-semibold text-[#1f1a17]">
                Rs {item.price * cartItem.quauntity}
              </p>
            </div>
          );
        })}
      </div>

      <div className="soft-card space-y-4 p-5">
        <div className="flex justify-between text-sm text-[#6d5d52]">
          <span>Total Items</span>
          <span className="font-semibold text-[#1f1a17]">{quauntity}</span>
        </div>
        <div className="flex justify-between text-sm text-[#6d5d52]">
          <span>Subtotal</span>
          <span className="font-semibold text-[#1f1a17]">Rs {subTotal}</span>
        </div>
        <div className="flex justify-between text-sm text-[#6d5d52]">
          <span>Delivery Fee</span>
          <span className="font-semibold text-[#1f1a17]">
            {deliveryFee === 0 ? "Free" : `Rs ${deliveryFee}`}
          </span>
        </div>
        <div className="flex justify-between text-sm text-[#6d5d52]">
          <span>Platform Fee</span>
          <span className="font-semibold text-[#1f1a17]">Rs {platfromFee}</span>
        </div>

        {subTotal < 250 && (
          <p className="rounded-2xl bg-[#fff7f1] px-4 py-3 text-xs text-[#8a6d59]">
            Add items worth Rs {250 - subTotal} more to unlock free delivery.
          </p>
        )}

        <div className="flex justify-between border-t border-[#f1e6dd] pt-3 text-base font-semibold text-[#1f1a17]">
          <span>Grand Total</span>
          <span>Rs {grandTotal}</span>
        </div>

        <button
          onClick={() => navigate("/checkout")}
          className={`brand-button mt-2 w-full py-3.5 text-sm font-semibold ${
            !restaurant.isOpen ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!restaurant.isOpen}
        >
          {!restaurant.isOpen ? "Restaurant Is Closed" : "Proceed to Checkout"}
        </button>

        <button
          onClick={clearCart}
          className="ghost-button mt-2 flex w-full items-center justify-center gap-3 py-3.5 text-sm font-semibold"
          disabled={clearingCart}
        >
          Clear Cart <TbTrash size={16} />
        </button>
      </div>
    </div>
  );
};

export default Cart;

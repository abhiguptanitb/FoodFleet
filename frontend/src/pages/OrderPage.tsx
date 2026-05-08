import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import UserOrderMap from "../components/UserOrderMap";
import LoadingState from "../components/LoadingState";

const statusLabel = (status: string) => status.replaceAll("_", " ");

const OrderPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(
    null
  );

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setOrder(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrder();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join", `user:${id}`);

    return () => {
      socket.emit("leave", `user:${id}`);
    };
  }, [socket, id]);

  useEffect(() => {
    if (!socket) return;

    const onRiderLocation = ({ latitude, longitude }: any) => {
      setRiderLocation([latitude, longitude]);
    };

    socket.on("rider:location", onRiderLocation);

    return () => {
      socket.off("rider:location", onRiderLocation);
    };
  }, [socket]);

  if (loading) {
    return (
      <LoadingState
        eyebrow="Tracking"
        title="Tuning into your order"
        copy="We are getting the newest status, payment details, and delivery movement."
      />
    );
  }

  if (!order) {
    return (
      <div className="page-wrap flex min-h-[60vh] items-center justify-center">
        <div className="glass-card px-6 py-10 text-center">
          <h1 className="text-2xl font-semibold text-[#1f1a17]">Order not found</h1>
          <p className="section-copy mt-3 text-sm">
            This order may no longer be available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap space-y-6 py-6">
      <section className="hero-panel fade-up p-5 sm:p-6">
        <p className="pill-label">Order Tracking</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#1f1a17]">
          Order #{order._id.slice(-6)}
        </h1>
        <div className="mt-4 inline-flex rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold capitalize text-[var(--accent)]">
          {statusLabel(order.status)}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="soft-card p-5">
            <h2 className="text-xl font-semibold text-[#1f1a17]">Items</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item, i) => (
                <div className="flex justify-between text-sm" key={i}>
                  <span className="text-[var(--text-soft)]">
                    {item.name} x {item.quauntity}
                  </span>
                  <span className="font-semibold text-[#1f1a17]">
                    Rs {item.price * item.quauntity}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="soft-card p-5">
            <h2 className="text-xl font-semibold text-[#1f1a17]">Delivery Address</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--text-soft)]">
              {order.deliveryAddress.fromattedAddress}
            </p>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Contact: {order.deliveryAddress.mobile}
            </p>
          </section>

          <section className="soft-card p-5">
            <h2 className="text-xl font-semibold text-[#1f1a17]">Payment Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-soft)]">Subtotal</span>
                <span className="font-semibold text-[#1f1a17]">Rs {order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-soft)]">Delivery Fee</span>
                <span className="font-semibold text-[#1f1a17]">
                  Rs {order.deliveryFee}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-soft)]">Platform Fee</span>
                <span className="font-semibold text-[#1f1a17]">
                  Rs {order.platfromFee}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#d8e3ef] pt-3">
                <span className="text-[var(--text-soft)]">Total</span>
                <span className="font-semibold text-[#1f1a17]">
                  Rs {order.totalAmount}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold capitalize text-[var(--text-soft)]">
                Payment method: {order.paymentMethod}
              </span>
              <span className="rounded-full bg-[#eef8f1] px-3 py-1 text-xs font-semibold capitalize text-[#25553f]">
                Payment status: {order.paymentStatus}
              </span>
            </div>
          </section>
        </div>

        {(order.status === "rider_assigned" || order.status === "picked_up") && (
          <section className="soft-card p-4">
            {riderLocation ? (
              <UserOrderMap
                riderLocation={riderLocation}
                deliveryLocation={[
                  order.deliveryAddress.latitude!,
                  order.deliveryAddress.longitude!,
                ]}
              />
            ) : (
              <div className="flex min-h-[300px] items-center justify-center text-sm text-[var(--text-soft)]">
                Waiting for live rider location.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default OrderPage;

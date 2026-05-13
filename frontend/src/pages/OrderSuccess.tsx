import axios from "axios";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { utilsService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";

const OrderSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { fetchCart } = useAppData();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) return;

      try {
        await axios.post(`${utilsService}/api/payment/stripe/verify`, {
          sessionId,
        });

        toast.success("Payment successful");
        window.setTimeout(() => {
          fetchCart();
        }, 700);
      } catch (error) {
        toast.error("Stripe verification failed");
        console.log(error);
      }
    };

    verifyPayment();
  }, [sessionId]);

  return (
    <div className="page-wrap flex min-h-[60vh] items-center justify-center py-8">
      <div className="glass-card px-6 py-12 text-center">
        <p className="pill-label mx-auto w-fit">Stripe</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#198754]">
          Payment successful
        </h1>
        <p className="section-copy mt-3 text-sm">
          Your Stripe payment has been verified and your order is confirmed.
        </p>
      </div>
    </div>
  );
};

export default OrderSuccess;

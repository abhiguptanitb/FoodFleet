import { useNavigate, useParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect } from "react";
import { BiCheckCircle } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";
import { getRoleHomePath } from "../utils/roleRoutes";

const PaymentSuccess = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { fetchCart, user } = useAppData();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCart();
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="page-wrap flex min-h-[70vh] items-center justify-center py-8">
      <div className="hero-panel fade-up w-full max-w-xl px-6 py-10 text-center">
        <BiCheckCircle size={72} className="mx-auto text-[#198754]" />
        <p className="pill-label mx-auto mt-5 w-fit">Payment Complete</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#1f1a17]">
          Your payment was successful
        </h1>
        <p className="section-copy mt-3 text-sm">
          Your order has been placed and the restaurant can start preparing it now.
        </p>

        {paymentId && (
          <div className="mx-auto mt-5 max-w-md rounded-2xl bg-white px-4 py-4 text-left shadow-[0_12px_24px_rgba(84,56,35,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
              Payment Reference
            </p>
            <p className="mt-2 break-all font-mono text-sm text-[#1f1a17]">
              {paymentId}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            className="brand-button flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold"
            onClick={() => navigate(getRoleHomePath(user?.role))}
          >
            Order More <BsArrowRight size={16} />
          </button>
          <button
            className="ghost-button flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold"
            onClick={() => navigate("/orders")}
          >
            View My Orders <BsArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

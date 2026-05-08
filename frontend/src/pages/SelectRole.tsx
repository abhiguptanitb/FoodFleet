import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../main";
import { getRoleHomePath } from "../utils/roleRoutes";

type Role = "customer" | "rider" | "seller" | null;

const SelectRole = () => {
  const [role, setRole] = useState<Role>(null);
  const { setUser } = useAppData();
  const navigate = useNavigate();
  const roles: {
    key: Exclude<Role, null>;
    accent: string;
    shadow: string;
    copy: string;
  }[] = [
    {
      key: "customer",
      accent: "bg-[#2563eb]",
      shadow: "shadow-[5px_5px_0_#22d3ee]",
      copy: "Order from nearby kitchens and track every delivery.",
    },
    {
      key: "rider",
      accent: "bg-[#00a6ff]",
      shadow: "shadow-[5px_5px_0_#00ff9d]",
      copy: "Go online, accept orders, and manage delivery earnings.",
    },
    {
      key: "seller",
      accent: "bg-[#7c3cff]",
      shadow: "shadow-[5px_5px_0_#22d3ee]",
      copy: "Run restaurants, menus, orders, and sales from one place.",
    },
  ];

  const addRole = async () => {
    try {
      const { data } = await axios.put(
        `${authService}/api/auth/add/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      localStorage.setItem("token", data.token);
      setUser(data.user);
      navigate(getRoleHomePath(data.user?.role), { replace: true });
    } catch (error) {
      alert("Something went wrong");
      console.log(error);
    }
  };

  return (
    <div className="page-wrap flex min-h-screen items-center py-8">
      <div className="hero-panel fade-up mx-auto w-full max-w-2xl px-6 py-10 text-center">
        <p className="pill-label mx-auto w-fit">Get Started</p>
        <h1 className="mt-4 text-4xl font-black text-[var(--text)]">
          Choose how you want to use FoodFleet
        </h1>
        <p className="section-copy mx-auto mt-3 max-w-xl text-sm">
          Pick your lane. Each role gets its own color system and dashboard
          energy while keeping the same FoodFleet flow underneath.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setRole(r.key)}
              className={`rounded-[22px] border-2 px-4 py-5 text-left transition hover:-translate-y-1 ${
                role === r.key
                  ? `border-[var(--text)] bg-white ${r.shadow}`
                  : "border-[#11182733] bg-white hover:border-[var(--text)]"
              }`}
            >
              <span
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-[var(--text)] text-sm font-black uppercase text-white ${r.accent}`}
              >
                {r.key[0]}
              </span>
              <p className="text-lg font-black capitalize text-[var(--text)]">
                {r.key}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                {r.copy}
              </p>
            </button>
          ))}
        </div>

        <button
          disabled={!role}
          onClick={addRole}
          className={`mt-8 w-full rounded-[20px] py-3.5 text-sm font-semibold transition ${
            role
              ? "brand-button"
              : "cursor-not-allowed rounded-[20px] bg-[#e7dfd7] text-[#9d8e82]"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SelectRole;

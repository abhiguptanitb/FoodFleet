import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiLogOut, BiMapPin, BiPackage } from "react-icons/bi";

const Account = () => {
  const { user, setUser, setIsAuth } = useAppData();
  const [imageError, setImageError] = useState(false);

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() ?? "";

  const navigate = useNavigate();

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  const logoutHandler = () => {
    localStorage.setItem("token", "");
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("logout Success");
  };
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-md rounded-lg bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b p-5">
          {user?.image && !imageError ? (
            <img
              src={user.image}
              alt={user.name}
              className="h-14 w-14 rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-xl font-semibold text-white">
              {firstLetter}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="divide-y">
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
            onClick={() => navigate("/orders")}
          >
            <BiPackage className="h-5 w-5 text-red-500" />
            <span className="font-medium">Your Orders</span>
          </div>
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
            onClick={() => navigate("/address")}
          >
            <BiMapPin className="h-5 w-5 text-red-500" />
            <span className="font-medium">Addresses</span>
          </div>
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
            onClick={logoutHandler}
          >
            <BiLogOut className="h-5 w-5 text-red-500" />
            <span className="font-medium">Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;

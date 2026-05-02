export const getRoleHomePath = (role?: string | null) => {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/partner";
  if (role === "rider") return "/deliveries";

  return "/browse";
};

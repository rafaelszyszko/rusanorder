export function useBasePath() {
  const role = localStorage.getItem("role");
  return role === "admin" ? "/admin" : "/user";
}

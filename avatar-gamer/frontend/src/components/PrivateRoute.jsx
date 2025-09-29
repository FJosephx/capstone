import { Navigate, Outlet } from "react-router-dom";

function isAuthed() {
  return Boolean(localStorage.getItem("token"));
}

export default function PrivateRoute() {
  return isAuthed() ? <Outlet /> : <Navigate to="/login" replace />;
}

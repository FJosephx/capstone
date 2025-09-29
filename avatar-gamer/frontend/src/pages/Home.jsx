import { logout } from "../auth";

export default function Home() {
  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h1>Home (protegida)</h1>
      <p>Si ves esto, tu token JWT está presente.</p>
      <button
        onClick={() => {
          logout();
          location.href = "/login";
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

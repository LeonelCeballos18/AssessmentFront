import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

// ---- Config
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ---- Socket client (single instance)
let socket;
function getSocket() {
  if (!socket) {
    socket = io(API_URL, { transports: ["websocket"], reconnection: true });
  }
  return socket;
}

// ---- Helpers: auth + API
function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}
function setAuth({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}
const API = {
  login: (email, password) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  listVehicles: () => apiFetch("/api/car"),
  getVehicle: (id) => apiFetch(`/api/car/${id}`),
  createVehicle: (payload) => apiFetch("/api/car", { method: "POST", body: JSON.stringify(payload) }),
  updatePosition: (id, payload) =>
    apiFetch(`/api/car/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteOwn: (id) => apiFetch(`/api/car/${id}`, { method: "DELETE" }),
  adminDelete: (id) => apiFetch(`/api/car/admin/${id}`, { method: "DELETE" }),
};

// ---- Map (Leaflet) via dynamic import to avoid SSR
const Map = dynamic(() => import("react-leaflet").then(m => {
  const { MapContainer, TileLayer, Marker, Popup } = m;
  return function MapLeaflet({ items = [], center = [19.4326, -99.1332], height = 520, zoom = 12 }) {
    return (
      <MapContainer center={center} zoom={zoom} style={{ width: "100%", height }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {items.map(v => (
          <Marker key={v.id} position={v.position ? [v.position.lat || 0, v.position.lng || 0] : center}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div><b>License:</b> {v.license}</div>
                <div><b>Brand:</b> {v.brand}</div>
                <div><b>Model:</b> {v.model}</div>
                <div><b>Color:</b> {v.color}</div>
                {v.position && <div><b>Pos:</b> {v.position.lat}, {v.position.lng}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    );
  };
}), { ssr: false });

// ---- UI components (inline to keep single file)
function LoginView({ onLogged }) {
  const [email, setEmail] = useState("admin@example.com");  // change if needed
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await API.login(email, password);
      setAuth(data);
      onLogged(data.user);
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1>Sign in</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Log in</button>
        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>
    </div>
  );
}

function VehicleModal({ id, onClose }) {
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    if (!id) return;
    API.getVehicle(id).then(setVehicle).catch(console.error);

    // Subscribe to targeted updates
    const s = getSocket();
    s.emit("subscribe", { vehicleId: id });
    const handler = ({ vehicleId, lat, lng }) => {
      if (vehicleId === id) setVehicle(prev => prev ? { ...prev, position: { lat, lng } } : prev);
    };
    s.on("position:update", handler);

    return () => {
      s.emit("unsubscribe", { vehicleId: id });
      s.off("position:update", handler);
    };
  }, [id]);

  if (!id) return null;
  if (!vehicle) return (<div className="modal"><div className="card">Loading...</div></div>);

  return (
    <div className="modal">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Vehicle {vehicle.license}</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div><b>Brand:</b> {vehicle.brand}</div>
          <div><b>Model:</b> {vehicle.model}</div>
          <div><b>Color:</b> {vehicle.color}</div>
        </div>
        <Map items={[vehicle]} height={360} />
      </div>
      <style jsx>{`
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; }
        .card { background: white; padding: 16px; width: min(900px, 96vw); border-radius: 8px; }
      `}</style>
    </div>
  );
}

function DashboardView({ user, onLogout }) {
  const [vehicles, setVehicles] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    API.listVehicles().then(setVehicles).catch(console.error);

    // Global realtime updates
    const s = getSocket();
    const handler = ({ vehicleId, lat, lng }) => {
      setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, position: { lat, lng } } : v)));
    };
    s.on("position:update", handler);
    return () => s.off("position:update", handler);
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Dashboard</h1>
          <div style={{ fontSize: 14, opacity: 0.8 }}>{user.email} — role: {user.role}</div>
        </div>
        <button onClick={onLogout}>Logout</button>
      </header>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <div>
          <h2>Vehicles</h2>
          <div style={{ overflowX: "auto" }}>
            <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                  <th>License</th><th>Brand</th><th>Model</th><th>Color</th><th>Lat</th><th>Lng</th><th></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td>{v.license}</td><td>{v.brand}</td><td>{v.model}</td><td>{v.color}</td>
                    <td>{v.position?.lat ?? "-"}</td><td>{v.position?.lng ?? "-"}</td>
                    <td><button onClick={() => setOpenId(v.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2>Live Map</h2>
          <Map items={vehicles} height={520} />
        </div>
      </section>

      {openId && <VehicleModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default function SPA() {
  const [user, setUser] = useState(null);
  const currentUser = useMemo(() => getUser(), []);

  useEffect(() => {
    // On first load, restore user if exists
    if (currentUser) setUser(currentUser);
  }, [currentUser]);

  function handleLogout() {
    clearAuth();
    setUser(null);
  }

  // Single page: show login or dashboard in the same route
  if (!user) return <LoginView onLogged={setUser} />;
  return <DashboardView user={user} onLogout={handleLogout} />;
}

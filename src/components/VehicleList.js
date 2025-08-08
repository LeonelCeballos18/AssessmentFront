import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function VehicleList({ vehicles, setVehicles }) {
  const { user, token } = useAuth();

  const handleDelete = async (id) => {
    const isAdmin = user.role === 'ADMIN';
    const url = `${process.env.NEXT_PUBLIC_API_URL}/vehicles/${id}`;
    const method = isAdmin ? 'deleteAnyVehicle' : 'deleteOwnVehicle';

    try {
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(vehicles.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Your Vehicles</h2>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Plates</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Color</th>
            <th>Lat</th>
            <th>Lng</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.license}</td>
              <td>{v.brand}</td>
              <td>{v.model}</td>
              <td>{v.color}</td>
              <td>{v.position?.lat}</td>
              <td>{v.position?.lng}</td>
              <td>
                {/* Por ahora solo delete */}
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import VehicleList from '../components/VehicleList';
import VehicleMap from '../components/VehicleMap';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar vehículos al montar
  useEffect(() => {
    if (!token) return;

    const fetchVehicles = async () => {
        console.log('URL request:', `${process.env.NEXT_PUBLIC_API_URL}/car`);

      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/car`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setVehicles(res.data);
      } catch (err) {
        console.error('Error loading vehicles:', err);
      } finally {
        setLoading(false);
      }
    };

   fetchVehicles();
  }, [token]);

  return (
    <ProtectedRoute>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Welcome, {user?.email}</h1>

        {loading ? (
          <p>Loading vehicles...</p>
        ) : (
          <>
            <VehicleMap vehicles={vehicles} />
            <VehicleList vehicles={vehicles} setVehicles={setVehicles} />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

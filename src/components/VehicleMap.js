import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Importa el mapa solo en cliente, sin SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

import 'leaflet/dist/leaflet.css';
import '../lib/fixLeafletIcons'; // corregir iconos

export default function VehicleMap({ vehicles }) {
  // Aquí puedes usar socket.io y lógica normal del cliente

  return (
    <div className="h-[400px] w-full">
      <MapContainer center={[19.4326, -99.1332]} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {vehicles.map((v) => (
          <Marker key={v.id} position={[v.position?.lat, v.position?.lng]}>
            <Popup>
              {v.brand} {v.model}
              <br />
              {v.license}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

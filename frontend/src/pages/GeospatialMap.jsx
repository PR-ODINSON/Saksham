import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Globe, RefreshCw, AlertTriangle, Crosshair, Navigation, ExternalLink, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Global Leaflet fix for markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Marker Logic
function getMarkerColor(score) {
  if (score == null) return '#64748b';
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
}

const createCustomIcon = (score) => {
  const color = getMarkerColor(score);
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color}; 
        width: 20px; 
        height: 20px; 
        border-radius: 50%; 
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// --- Sub-Components ---
const MapController = ({ userLocation, activeFilter, setFilter }) => {
  const map = useMap();
  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>
       <div className="bg-white p-2 rounded-xl border-2 border-[#0f172a] shadow-[4px_4px_0_#0f172a] flex flex-col gap-2">
        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg border-2 ${activeFilter === 'ALL' ? 'bg-[#0f172a] text-white' : 'bg-slate-50'}`}>All</button>
        <button onClick={() => setFilter('CRITICAL')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg border-2 ${activeFilter === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>Critical</button>
      </div>
      {userLocation && (
        <button onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 14)} className="w-10 h-10 bg-white rounded-lg border-2 border-[#0f172a] flex items-center justify-center">
          <Crosshair size={18} />
        </button>
      )}
    </div>
  );
};

// --- Main Component ---
export default function GeospatialMap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const [schoolsRes, riskRes] = await Promise.all([get('/api/schools'), get('/api/risk/queue')]);
      if (schoolsRes.success) {
        let merged = schoolsRes.schools.map(s => ({
          ...s,
          priorityScore: riskRes.queue?.find(r => r.schoolId === s.schoolId)?.priorityScore ?? null
        }));
        setSchools(merged);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { 
    fetchMapData(); 
    navigator.geolocation.getCurrentPosition(pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
  }, []);

  const filteredSchools = useMemo(() => {
    return schools.filter(s => activeFilter === 'CRITICAL' ? s.priorityScore >= 80 : true);
  }, [schools, activeFilter]);

  if (!user) return null;

  return (
    <div className="w-full h-[600px] relative rounded-2xl overflow-hidden border-2 border-[#0f172a]">
      <style>{`
        .leaflet-cluster-anim .leaflet-marker-icon, .leaflet-cluster-anim .leaflet-marker-shadow { transition: transform 0.3s ease-out, opacity 0.3s ease-in; }
        .marker-cluster-small { background-color: rgba(255, 255, 255, 0.6); border: 2px solid #0f172a; border-radius: 50%; }
        .marker-cluster-small div { background-color: #0f172a; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; }
      `}</style>

      <MapContainer center={[23.8, 69.5]} zoom={6} className="h-full w-full">
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <MapController userLocation={userLocation} activeFilter={activeFilter} setFilter={setActiveFilter} />
        
        {/* CLUSTER WRAPPER */}
        <MarkerClusterGroup chunkedLoading>
          {filteredSchools.map((school) => (
             <Marker 
               key={school.schoolId} 
               position={[school.location.lat, school.location.lng]}
               icon={createCustomIcon(school.priorityScore)}
             >
               <Popup>
                 <div className="p-2 w-48 font-body">
                   <h3 className="font-black text-xs uppercase">{school.name}</h3>
                   <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase">Score: {Math.round(school.priorityScore || 0)}</div>
                   <button 
                     onClick={() => navigate(`/dashboard/school/${school.schoolId}`)}
                     className="mt-3 w-full bg-[#0f172a] text-white text-[10px] font-black uppercase py-1.5 rounded-lg"
                   >
                     View Profile
                   </button>
                 </div>
               </Popup>
             </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
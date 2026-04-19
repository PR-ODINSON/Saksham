import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Globe, RefreshCw, AlertTriangle, Crosshair, Navigation, ExternalLink, Filter, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ... (Keep existing L.Icon fix)

// Helper: Improved Marker Color Logic
const getMarkerColor = (score) => {
  if (score == null) return '#64748b';
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
};

// Component: Legend for better UX
const MapLegend = () => (
  <div className="absolute bottom-6 left-6 z-[1000] bg-white p-3 rounded-xl border-2 border-[#0f172a] shadow-[4px_4px_0_#0f172a] w-48">
    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Risk Legend</div>
    {[
      { label: 'Critical', color: '#ef4444' },
      { label: 'High', color: '#f97316' },
      { label: 'Moderate', color: '#f59e0b' },
      { label: 'Low', color: '#10b981' },
    ].map((item) => (
      <div key={item.label} className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="text-[10px] font-bold text-[#0f172a]">{item.label}</span>
      </div>
    ))}
  </div>
);

// Component: Map Controller & Filters
const MapController = ({ userLocation, activeFilter, setFilter }) => {
  const map = useMap();
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
       {/* Filters */}
       <div className="bg-white p-2 rounded-xl border-2 border-[#0f172a] shadow-[4px_4px_0_#0f172a] flex flex-col gap-2">
        <div className="px-2 pt-1 flex items-center gap-2"><Filter size={12} /> <span className="text-[9px] font-bold uppercase">Filters</span></div>
        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 text-[10px] font-bold rounded-lg border-2 ${activeFilter === 'ALL' ? 'bg-[#0f172a] text-white' : 'bg-slate-50'}`}>All</button>
        <button onClick={() => setFilter('CRITICAL')} className={`px-4 py-2 text-[10px] font-bold rounded-lg border-2 ${activeFilter === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'}`}>Critical Only</button>
      </div>

      {userLocation && (
        <button onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 14)} className="w-10 h-10 bg-white rounded-xl border-2 border-[#0f172a] shadow-[4px_4px_0_#0f172a] flex items-center justify-center hover:scale-105 transition-transform">
          <Crosshair size={18} />
        </button>
      )}
    </div>
  );
};

export default function GeospatialMap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Memoize filtered data
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      if (activeFilter === 'CRITICAL') return s.priorityScore >= 80 || s.willFailWithin30Days;
      return true;
    });
  }, [schools, activeFilter]);

  useEffect(() => {
    // ... (Your fetch logic remains the same)
    // Add logic here to fetch location...
  }, []);

  if (!user || (user.role !== 'deo' && user.role !== 'admin')) return null;

  return (
    <div className="w-full h-[600px] relative font-body bg-slate-100 rounded-2xl overflow-hidden border-2 border-[#0f172a]">
      <style>{`
        .marker-cluster-small { background-color: rgba(255, 255, 255, 0.6) !important; border: 2px solid #0f172a !important; border-radius: 50% !important; }
        .marker-cluster-small div { background-color: #0f172a !important; color: white !important; border-radius: 50% !important; }
      `}</style>

      {/* Header Info */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur border-2 border-[#0f172a] p-3 rounded-xl shadow-[4px_4px_0_#0f172a]">
        <h1 className="text-sm font-bold uppercase tracking-tighter">School Infrastructure Map</h1>
        <p className="text-[9px] font-bold text-slate-500 uppercase">{filteredSchools.length} nodes active</p>
      </div>

      <MapContainer center={[23.8, 69.5]} zoom={6} className="h-full w-full">
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        
        <MapController userLocation={userLocation} activeFilter={activeFilter} setFilter={setActiveFilter} />
        <MapLegend />

        <MarkerClusterGroup chunkedLoading>
          {filteredSchools.map((school) => (
             <Marker 
               key={school.schoolId} 
               position={[school.location.lat, school.location.lng]}
               icon={createCustomIcon(school.priorityScore)}
             >
               <Popup>
                 <div className="p-2 w-48">
                   <h3 className="font-bold text-xs uppercase mb-1">{school.name}</h3>
                   <div className="flex gap-2 items-center mb-2">
                     <span className="text-[9px] bg-slate-100 px-1 rounded font-bold">Score: {Math.round(school.priorityScore || 0)}</span>
                   </div>
                   <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${school.location.lat},${school.location.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="block w-full text-center bg-[#0f172a] text-white text-[10px] font-bold uppercase py-1.5 rounded"
                   >
                     Directions
                   </a>
                 </div>
               </Popup>
             </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
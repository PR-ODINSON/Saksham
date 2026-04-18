import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Globe, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

// Global Leaflet fix for base markers, though we use custom ones
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function getMarkerColor(score) {
  if (score == null) return '#64748b'; // No risk data (slate)
  if (score >= 80) return '#ef4444';   // Critical (red)
  if (score >= 60) return '#f97316';   // High (orange)
  if (score >= 40) return '#f59e0b';   // Moderate (amber)
  return '#10b981';                    // Low (emerald)
}

function getRiskLevel(score) {
  if (score == null) return 'UNKNOWN';
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

const createCustomIcon = (score) => {
  const color = getMarkerColor(score);
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color}; 
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 0 10px ${color}, 2px 2px 0 #0f172a;
        transform: translate(-50%, -50%);
        ${score >= 60 ? 'animation: pulse 2s infinite;' : ''}
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function GeospatialMap() {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      // Fetch both coordinates and risk data simultaneously
      const [schoolsRes, riskRes] = await Promise.all([
        get('/api/schools'),
        get('/api/risk/queue')
      ]);

      if (schoolsRes.success) {
        let mergedSchools = schoolsRes.schools;
        
        // Merge priority scores into the school data
        if (riskRes.success && riskRes.queue) {
          const riskMap = {};
          riskRes.queue.forEach(r => {
            riskMap[r.schoolId] = r.priorityScore;
          });
          
          mergedSchools = mergedSchools.map(s => ({
            ...s,
            priorityScore: riskMap[s.schoolId] ?? null
          }));
        }

        setSchools(mergedSchools);
      }
    } catch (err) {
      console.error("Map fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMapData();
    
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  }, []);

  if (!user || (user.role !== 'deo' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-body">
        <p className="text-xl font-black text-[#0f172a]">Access Denied.</p>
      </div>
    );
  }

  // Calculate stats for the header
  const total = schools.length;
  const critical = schools.filter(s => s.priorityScore >= 80).length;
  const safe = schools.filter(s => s.priorityScore != null && s.priorityScore < 40).length;

  return (
    <div className="min-h-screen bg-slate-50 font-body flex flex-col">
      {/* CSS overrides for Leaflet Popups to match Bento Box theme */}
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          border: 2px solid #0f172a;
          box-shadow: 4px 4px 0 #0f172a !important;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content { margin: 0; }
        .leaflet-popup-tip-container { display: none; }
        .custom-map-marker { background: transparent; border: none; }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>

      {/* HEADER */}
      <div className="bg-white border-b-2 border-[#0f172a] px-8 py-6 shadow-sm z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 border-2 border-[#0f172a] rounded-xl flex items-center justify-center shadow-[2px_2px_0_#2563eb]">
            <Globe size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">Geospatial Command</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Live Structural Risk Matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4 items-center bg-slate-50 px-6 py-2 rounded-xl border-2 border-slate-200">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nodes</span>
              <span className="text-lg font-black text-[#0f172a]">{total}</span>
            </div>
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Critical</span>
              <span className="text-lg font-black text-red-600">{critical}</span>
            </div>
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Stable</span>
              <span className="text-lg font-black text-emerald-600">{safe}</span>
            </div>
          </div>

          <button 
            onClick={fetchMapData}
            disabled={loading}
            className="w-12 h-12 flex items-center justify-center bg-[#0f172a] text-white rounded-xl border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#2563eb] transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className="flex-1 relative z-0">
        {loading && schools.length === 0 ? (
          <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
             <p className="mt-4 text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Syncing GPS Nodes...</p>
          </div>
        ) : null}

        {schools.length > 0 && (
          <MapContainer 
            center={[schools[0].location?.lat || 23.8, schools[0].location?.lng || 69.5]} 
            zoom={6} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
          >
            {/* White-themed CartoDB Positron tiles */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            {schools.map((school, idx) => {
               if (!school.location || !school.location.lat) return null;
               
               const color = getMarkerColor(school.priorityScore);
               const level = getRiskLevel(school.priorityScore);

               return (
                 <Marker 
                   key={idx} 
                   position={[school.location.lat, school.location.lng]}
                   icon={createCustomIcon(school.priorityScore)}
                 >
                   <Popup>
                     <div className="p-4 bg-white min-w-[200px]">
                       <div className="flex items-start justify-between gap-4 mb-3">
                         <div>
                           <h3 className="font-black text-[#0f172a] text-sm leading-tight uppercase">{school.name}</h3>
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{school.district}</p>
                         </div>
                         {school.priorityScore >= 60 && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                       </div>
                       
                       <div className="mt-3 bg-slate-50 border-2 border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Level</span>
                         <span 
                           className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border-2"
                           style={{ borderColor: color, color: color, backgroundColor: `${color}15` }}
                         >
                           {level} {school.priorityScore ? `(${Math.round(school.priorityScore)})` : ''}
                         </span>
                       </div>
                     </div>
                   </Popup>
                 </Marker>
               );
            })}
                
                {/* User Location Marker */}
                {userLocation && (
                  <Marker 
                    position={[userLocation.lat, userLocation.lng]}
                    icon={L.divIcon({
                      className: 'custom-user-marker',
                      html: `
                        <div style="
                          background-color: #3b82f6; 
                          width: 18px; 
                          height: 18px; 
                          border-radius: 50%; 
                          border: 3px solid white;
                          box-shadow: 0 0 15px #3b82f6, 2px 2px 0 #0f172a;
                          transform: translate(-50%, -50%);
                        "></div>
                      `,
                      iconSize: [18, 18],
                      iconAnchor: [9, 9]
                    })}
                  >
                    <Popup>
                      <div className="p-3 bg-white min-w-[120px]">
                        <h3 className="font-black text-[#0f172a] text-sm leading-tight uppercase">Your Location</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Live GPS Tracking</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
        )}
      </div>
    </div>
  );
}

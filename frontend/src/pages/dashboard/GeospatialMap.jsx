import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Globe, RefreshCw, AlertTriangle, Building, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import MetricCard from '../../components/common/MetricCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

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
        width: 18px; 
        height: 18px; 
        border-radius: 50%; 
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transform: translate(-50%, -50%);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
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
    <div className="p-6 h-screen flex flex-col space-y-8 overflow-hidden">
      {/* CSS overrides for Leaflet Popups to match Bento Box theme */}
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content { margin: 0; }
        .leaflet-popup-tip-container { display: none; }
        .custom-map-marker { background: transparent; border: none; }
      `}</style>

      <PageHeader 
        title="Geospatial Tactical Map"
        subtitle="Live structural risk matrix across regional infrastructure nodes"
        icon={Globe}
        actions={
          <Button 
            variant="primary" 
            isLoading={loading} 
            onClick={fetchMapData}
          >
            Refresh Node Registry
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Identification Nodes" value={total} icon={Building} variant="info" />
        <MetricCard label="Critical Designation" value={critical} icon={AlertTriangle} variant="critical" />
        <MetricCard label="Stable Baseline" value={safe} icon={ShieldCheck} variant="success" />
      </div>

      {/* MAP CONTAINER */}
      <div className="flex-1 relative z-0 border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-100">
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
                      <div className="p-4 bg-white min-w-[220px]">
                        <div className="mb-4">
                          <h3 className="font-bold text-slate-900 text-sm leading-tight uppercase tracking-tight">{school.name}</h3>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{school.district}</p>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4 p-3 rounded bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Designation</span>
                          <Badge variant={level.toLowerCase()} size="sm">
                            {level} {school.priorityScore ? `(${Math.round(school.priorityScore)})` : ''}
                          </Badge>
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
                      <div className="p-4 bg-white min-w-[140px]">
                        <h3 className="font-bold text-slate-900 text-sm leading-tight uppercase">User Node</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-1">Operational GPS Active</p>
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

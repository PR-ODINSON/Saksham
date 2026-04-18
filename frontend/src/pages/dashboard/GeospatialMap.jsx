import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Globe, RefreshCw, AlertTriangle, Building, ShieldCheck, ChevronDown, Navigation, ExternalLink, Crosshair, Filter, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import MetricCard from '../../components/common/MetricCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useLanguage } from '../../context/LanguageContext';

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
        box-shadow: 0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.2);
        transform: translate(-50%, -50%);
        ${score >= 60 ? 'animation: marker-pulse 2s infinite;' : ''}
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Component to handle map controls (Recenter, Filters)
const MapController = ({ userLocation, activeFilter, setFilter, t }) => {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
      
      {/* Filters */}
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xl flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-1 pb-2 border-b border-slate-100 mb-1">
          <Filter size={14} className="text-slate-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{t('gs.map_filters')}</span>
        </div>
        <button 
          onClick={() => setFilter('ALL')}
          className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border-2 transition-all text-left ${activeFilter === 'ALL' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}
        >
          {t('gs.show_all_sites')}
        </button>
        <button 
          onClick={() => setFilter('CRITICAL')}
          className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border-2 transition-all text-left ${activeFilter === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-600' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}
        >
          {t('gs.critical_only')}
        </button>
      </div>

      {/* Recenter Button */}
      {userLocation && (
        <button
          onClick={() => {
            map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.5 });
          }}
          className="w-12 h-12 bg-white text-blue-600 rounded-xl border border-slate-200 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all flex items-center justify-center pointer-events-auto self-end"
          title={t('gs.recenter')}
        >
          <Crosshair size={22} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export default function GeospatialMap() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  // Navigation State
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  const fetchRoute = async (destination, schoolName) => {
    if (!userLocation) {
      alert(t('gs.alert_location'));
      return;
    }
    setRoutingLoading(true);
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        const latLngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setActiveRoute({ path: latLngs, destinationName: schoolName });
        setRouteDetails({
          distance: (route.distance / 1000).toFixed(1), // km
          duration: Math.round(route.duration / 60) // mins
        });
        
        // Close the popup card automatically
        const closeBtn = document.querySelector('.leaflet-popup-close-button');
        if (closeBtn) closeBtn.click();
      } else {
        alert(t('gs.alert_route_fail'));
      }
    } catch (err) {
      console.error("Routing error:", err);
      alert(t('gs.alert_fetch_fail'));
    }
    setRoutingLoading(false);
  };

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
        
        // Extract unique districts
        const uniqueDistricts = [...new Set(mergedSchools.map(s => s.district))].sort();
        setDistricts(uniqueDistricts);
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
        <p className="text-xl font-black text-[#0f172a]">{t('gs.access_denied')}</p>
      </div>
    );
  }

  // Calculate stats for the header
  // Calculate stats for the header based on filter
  const filteredSchools = selectedDistrict 
    ? schools.filter(s => s.district === selectedDistrict)
    : schools;

  const total = filteredSchools.length;
  const critical = filteredSchools.filter(s => s.priorityScore >= 80).length;
  const safe = filteredSchools.filter(s => s.priorityScore != null && s.priorityScore < 40).length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto pt-10 sm:pt-16 pb-12 px-4 sm:px-8 flex flex-col space-y-8">
        {/* CSS overrides for Leaflet Popups to match Bento Box theme */}
        <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content { margin: 0; }
        .leaflet-popup-tip-container { display: none; }
        .custom-map-marker { background: transparent; border: none; }
        @keyframes marker-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes route-flow {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-route-path {
          animation: route-flow 2s linear infinite;
          filter: drop-shadow(0px 4px 6px rgba(59, 130, 246, 0.4));
        }
        .marker-cluster-small { background-color: rgba(241, 245, 249, 0.9) !important; border: 2px solid #94a3b8 !important; border-radius: 50% !important; font-family: 'Inter', sans-serif; font-weight: 900; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .marker-cluster-small div { background-color: #475569 !important; color: white !important; border-radius: 50% !important; }
        
        .marker-cluster-medium { background-color: rgba(255, 237, 213, 0.9) !important; border: 2px solid #f97316 !important; border-radius: 50% !important; font-family: 'Inter', sans-serif; font-weight: 900; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .marker-cluster-medium div { background-color: #ea580c !important; color: white !important; border-radius: 50% !important; }

        .marker-cluster-large { background-color: rgba(254, 226, 226, 0.9) !important; border: 2px solid #ef4444 !important; border-radius: 50% !important; font-family: 'Inter', sans-serif; font-weight: 900; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .marker-cluster-large div { background-color: #dc2626 !important; color: white !important; border-radius: 50% !important; }
      `}</style>

        <PageHeader
          title={t('gs.title')}
          subtitle={t('gs.subtitle')}
          icon={Globe}
          className="mb-6"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative">
                <select 
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-[#003366] text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 pr-10 rounded-lg outline-none focus:border-blue-500 transition-all shadow-sm cursor-pointer"
                >
                  <option value="">{t('gs.all_districts')}</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
              
              <Button
                variant="outline"
                isLoading={loading}
                onClick={fetchMapData}
                className="text-[10px] font-bold uppercase tracking-widest border-[#003366] text-[#003366] hover:bg-blue-50"
              >
                {t('gs.update')}
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard label={t('gs.id_nodes')} value={total} icon={Building} variant="info" />
          <MetricCard label={t('gs.critical_desig')} value={critical} icon={AlertTriangle} variant="critical" />
          <MetricCard label={t('gs.stable_baseline')} value={safe} icon={ShieldCheck} variant="success" />
        </div>

        {/* MAP CONTAINER */}
        <div className="relative w-full h-[800px] border-2 border-slate-200 rounded-2xl overflow-hidden shadow-2xl bg-slate-100 mb-8 z-0">
          
          {/* Active Navigation HUD */}
          {activeRoute && routeDetails && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-[#003366]/95 backdrop-blur-xl border border-white/20 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl flex items-center gap-8 pointer-events-auto transition-all animate-in slide-in-from-top-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-0.5">{t('gs.nav_target')}</span>
                <span className="text-base font-black text-white uppercase tracking-tight">{activeRoute.destinationName}</span>
              </div>
              <div className="w-px h-10 bg-white/20"></div>
              <div className="flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">{t('gs.distance')}</span>
                <span className="text-xl font-black text-white">{routeDetails.distance} <span className="text-xs text-emerald-400">{t('gs.km')}</span></span>
              </div>
              <div className="w-px h-10 bg-white/20"></div>
              <div className="flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-0.5">{t('gs.est_eta')}</span>
                <span className="text-xl font-black text-white">{routeDetails.duration} <span className="text-xs text-amber-400">{t('gs.min')}</span></span>
              </div>
              <button 
                onClick={() => { setActiveRoute(null); setRouteDetails(null); }}
                className="ml-2 w-12 h-12 flex items-center justify-center bg-red-500 hover:bg-red-600 border border-red-400 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-500/30"
                title={t('gs.cancel_nav')}
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {loading && schools.length === 0 ? (
            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-[#003366] rounded-full animate-spin" />
              <p className="mt-4 text-[12px] font-black tracking-[0.2em] uppercase text-slate-400">{t('gs.syncing_gps')}</p>
            </div>
          ) : null}

          {filteredSchools.length > 0 && (
            <MapContainer
              center={[filteredSchools[0].location?.lat || 23.8, filteredSchools[0].location?.lng || 69.5]}
              zoom={selectedDistrict ? 9 : 7}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
            >
              {/* White-themed CartoDB Positron tiles */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />

              <MapController userLocation={userLocation} activeFilter={activeFilter} setFilter={setActiveFilter} t={t} />

              {/* Active Route Polyline */}
              {activeRoute && (
                <Polyline 
                  positions={activeRoute.path} 
                  color="#2563eb" 
                  weight={6} 
                  opacity={0.9}
                  dashArray="15, 15"
                  className="animated-route-path"
                />
              )}

              <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                {filteredSchools.filter(s => {
                  if (activeFilter === 'CRITICAL') return s.priorityScore >= 80 || s.willFailWithin30Days;
                  return true; // ALL
                }).map((school, idx) => {
                  if (!school.location || !school.location.lat) return null;

                  const color = getMarkerColor(school.priorityScore);
                  const level = getRiskLevel(school.priorityScore);

                  // Generate Google Maps routing URL
                  const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
                  const destination = `${school.location.lat},${school.location.lng}`;
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

                  // Determine image
                  const imgIndex = (String(school.schoolId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10;
                  const images = [
                    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80',
                    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80',
                    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=600&q=80',
                    'https://images.unsplash.com/photo-1510531704581-5b2870972060?w=600&q=80',
                    'https://images.unsplash.com/photo-1498075702571-ecb018f3752d?w=600&q=80',
                    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&q=80',
                    'https://images.unsplash.com/photo-1584697964149-14a9386d3b4d?w=600&q=80',
                    'https://images.unsplash.com/photo-1536337005238-94b997371b40?w=600&q=80',
                    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&q=80',
                    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80'
                  ];
                  const imageUrl = images[imgIndex];

                  return (
                    <Marker
                      key={idx}
                      position={[school.location.lat, school.location.lng]}
                      icon={createCustomIcon(school.priorityScore)}
                    >
                      <Popup>
                        <div className="bg-white min-w-[240px] overflow-hidden flex flex-col">
                          {/* Banner Image */}
                          <div className="h-32 w-full relative bg-slate-200">
                            <img src={imageUrl} alt={school.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                            <div className="absolute bottom-3 left-4 right-4">
                              <h3 className="text-white font-black text-sm leading-tight drop-shadow-md truncate">{school.name}</h3>
                              <p className="text-slate-200 text-[10px] font-black uppercase tracking-widest mt-0.5">{school.district} District</p>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex items-center justify-between gap-4 p-2.5 mb-4 rounded bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('gs.designation')}</span>
                            <Badge variant={level.toLowerCase()} size="sm">
                              {level} {school.priorityScore ? `(${Math.round(school.priorityScore)})` : ''}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => fetchRoute(school.location, school.name)}
                              disabled={routingLoading}
                              className="w-full bg-[#003366] text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-900 transition-colors disabled:opacity-50"
                            >
                              <Navigation size={12} /> {routingLoading ? t('gs.routing') : t('gs.get_directions')}
                            </button>
                            <button 
                              onClick={() => navigate(`/dashboard/school/${school.schoolId}`)}
                              className="w-full bg-slate-100 text-[#003366] border border-slate-200 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                            >
                              <ExternalLink size={12} /> {t('gs.view_profile')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>

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
                      <h3 className="font-bold text-slate-900 text-sm leading-tight uppercase">{t('gs.user_node')}</h3>
                      <p className="text-[12px] font-bold uppercase tracking-widest text-blue-600 mt-1">{t('gs.gps_active')}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}

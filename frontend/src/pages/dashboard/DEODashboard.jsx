import React, { useState, useEffect, useRef, useCallback } from 'react';
import { animate } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import { get } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { roleSubPath } from "../../utils/roleRoutes.js";
import EvidenceDrawer from "../../components/common/EvidenceDrawer";
import ForwardedReportsPanel from "../../components/deo/ForwardedReportsPanel";
import {
  RefreshCw, ShieldAlert, MapPin, Search
} from 'lucide-react';

const Counter = ({ to, prefix = '', suffix = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctrl = animate(0, to, {
      duration: 1, ease: 'easeOut',
      onUpdate: (v) => { if (ref.current) ref.current.textContent = prefix + Math.round(v).toLocaleString() + suffix; }
    });
    return () => ctrl.stop();
  }, [to]);
  return <span ref={ref}>0</span>;
};

function StatTile({ label, value, tone = 'muted' }) {
  const toneMap = {
    red:   'text-red-600',
    amber: 'text-amber-600',
    green: 'text-emerald-600',
    blue:  'text-blue-700',
    muted: 'text-slate-900',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl mt-1 ${toneMap[tone]}`}>{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN DASHBOARD COMPONENT
   ───────────────────────────────────────────────────────── */
export default function DEODashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState(60);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());

  const [activeTab, setActiveTab] = useState("queue");
  const [flaggedOrders, setFlaggedOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [schoolsList, setSchoolsList] = useState([]);
  const [forwardedBundles, setForwardedBundles] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ district, block, category, urgency });
    const bundleParams = new URLSearchParams({ forwardedOnly: "true" });
    if (user?.district) bundleParams.set("district", user.district);

    const [riskRes, flaggedRes, alertsRes, schoolsRes, bundlesRes, workOrdersRes] = await Promise.all([
      get(`/api/risk/queue?${params}`),
      get(`/api/tasks?locationMismatch=true`),
      get(`/api/alerts?type=GPS_MISMATCH`),
      get(`/api/schools`),
      get(`/api/reports/weekly/bundles?${bundleParams.toString()}`),
      get(`/api/tasks`),
    ]);

    if (riskRes.success) {
      setData(riskRes.queue);
      setLastSync(new Date());
    }
    if (flaggedRes.success) setFlaggedOrders(flaggedRes.workOrders);
    if (alertsRes.success) setAlerts(alertsRes.data);
    if (schoolsRes.success) setSchoolsList(schoolsRes.schools);
    if (bundlesRes.success) setForwardedBundles(bundlesRes.bundles || []);
    if (workOrdersRes.success) setWorkOrders(workOrdersRes.workOrders || []);
    setLoading(false);
  }, [district, block, category, urgency, user?.district]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // District-scoped filters for accurate counts on the DEO dashboard.
  const districtSchools = user?.district
    ? schoolsList.filter(s => (s.district || "").toLowerCase() === user.district.toLowerCase())
    : schoolsList;

  const stats = {
    totalSchools:    districtSchools.length,
    forwardedCount:  forwardedBundles.length,
    criticalCount:   forwardedBundles.filter(b => b.urgencyLabel === "critical" || b.willFailWithin30Days).length,
    activeWorkOrders: workOrders.filter(w => ["assigned", "accepted", "in_progress"].includes(w.status)).length,
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 px-4 sm:px-8 space-y-6 pb-12">
        {/* Minimalist header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl text-slate-900">{t('deo.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user?.district
                ? `District infrastructure overview for ${user.district}.`
                : 'District infrastructure health and predictive maintenance overview.'}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="h-9 px-3 inline-flex items-center gap-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Live DB-driven counts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Schools in district"
            value={<Counter to={stats.totalSchools} />}
            tone="muted"
          />
          <StatTile
            label="Forwarded reports"
            value={<Counter to={stats.forwardedCount} />}
            tone={stats.forwardedCount > 0 ? 'blue' : 'muted'}
          />
          <StatTile
            label="Critical / 30-day risk"
            value={<Counter to={stats.criticalCount} />}
            tone={stats.criticalCount > 0 ? 'red' : 'green'}
          />
          <StatTile
            label="Active work orders"
            value={<Counter to={stats.activeWorkOrders} />}
            tone={stats.activeWorkOrders > 0 ? 'amber' : 'green'}
          />
        </div>

        {/* FORWARDED-BY-PRINCIPAL bundles — sorted by LR urgency */}
        <ForwardedReportsPanel district={user?.district || district} />

        {/* RISK MANAGEMENT QUEUE — minimalist */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg text-slate-900">{t('deo.risk_queue_title')}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeTab === 'queue'
                  ? `${data.length} ${data.length === 1 ? 'school' : 'schools'} flagged by predictive model`
                  : `${flaggedOrders.length} completion${flaggedOrders.length === 1 ? '' : 's'} with location variance`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder={t('deo.filter_placeholder')}
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="text-sm pl-8 pr-3 h-9 w-44 sm:w-56 border border-slate-200 rounded-md outline-none focus:border-slate-400 transition-colors"
                />
              </div>
              <button
                onClick={fetchData}
                className="w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-slate-100 flex items-center gap-6">
            {[
              { id: 'queue',   label: t('deo.risk_queue_tab'),     count: data.length },
              { id: 'flagged', label: t('deo.gps_mismatches_tab'), count: flaggedOrders.length },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-3 text-sm transition-colors flex items-center gap-2 ${
                    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                  {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-slate-900" />}
                </button>
              );
            })}
          </div>

          {/* Body */}
          {activeTab === 'queue' ? (
            loading ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('deo.loading_scans')}</div>
            ) : data.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('deo.no_critical_nodes')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.map((s, idx) => {
                  const horizonColor =
                    s.daysToFailure < 30 ? 'text-red-600' :
                    s.daysToFailure < 60 ? 'text-amber-600' : 'text-slate-600';
                  return (
                    <li
                      key={idx}
                      onClick={() => setSelectedSchool(s)}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      {/* Score pill */}
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0">
                        <span className="text-base font-semibold text-slate-900 leading-none">{s.priorityScore}</span>
                        <span className="text-[10px] text-slate-400 leading-none mt-1">score</span>
                      </div>

                      {/* School + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="text-base text-slate-900 truncate">{s.schoolName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
                          <MapPin size={11} className="text-slate-400" />
                          {s.block}, {s.district}
                          {s.categories?.length > 0 && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="capitalize">{s.categories.slice(0, 2).join(', ')}</span>
                              {s.categories.length > 2 && (
                                <span className="text-slate-400">+{s.categories.length - 2}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Failure horizon */}
                      <div className="hidden sm:flex flex-col items-end pr-2">
                        <span className={`text-sm font-medium ${horizonColor}`}>
                          {s.daysToFailure} {t('deo.days')}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">to failure</span>
                      </div>

                      {/* Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${roleSubPath(user?.role, "work-orders/new")}?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.highestPriorityCategory}&score=${s.priorityScore}`);
                        }}
                        className="h-9 px-4 rounded-md bg-[#003366] text-white hover:bg-[#002244] transition-colors text-sm"
                      >
                        {t('deo.resolve')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            // GPS MISMATCH TAB — minimalist
            flaggedOrders.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">{t('deo.no_mismatches')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {flaggedOrders.map((o, idx) => {
                  const sub = o.completionProof?.gpsLocation;
                  const reg = o.school?.location;
                  return (
                    <li key={idx} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <ShieldAlert size={16} className="text-red-600" />
                      </div>

                      {/* School + contractor */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base text-slate-900 truncate">{o.school?.name || t('deo.unknown_school')}</span>
                          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            {t('deo.location_variance')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {t('deo.verified_by')}: {o.contractor?.name || t('deo.staff')}
                        </div>
                      </div>

                      {/* Coordinates */}
                      <div className="hidden md:flex flex-col items-end text-xs pr-2 leading-tight">
                        <span className="text-slate-700">
                          {sub?.lat?.toFixed(4)}, {sub?.lng?.toFixed(4)}
                        </span>
                        <span className="text-slate-400 mt-0.5">
                          reg: {reg?.lat?.toFixed(4)}, {reg?.lng?.toFixed(4)}
                        </span>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => window.open(o.completionProof?.photoUrl, '_blank')}
                        disabled={!o.completionProof?.photoUrl}
                        className="h-9 px-4 rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors text-sm disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        {t('deo.verify_proof')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-400">
              {t('deo.last_sync')}: {lastSync.toLocaleTimeString()}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">{t('deo.security_registry_operational')}</span>
            </div>
          </div>
        </div>
      </div>

      <EvidenceDrawer
        isOpen={!!selectedSchool}
        onClose={() => setSelectedSchool(null)}
        schoolName={selectedSchool?.schoolName}
        categories={selectedSchool?.categories}
        evidence={selectedSchool?.topEvidence}
        coverImage={selectedSchool?.coverImage}
      />
    </div>
  );
}

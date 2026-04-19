import { useState, useEffect } from "react";
import { get } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { roleSubPath } from "../../utils/roleRoutes.js";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import { FileText, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Building, MapPin, Users, Calendar, CheckCircle2, Clock, Shield, LayoutDashboard, History } from "lucide-react";
import HealthTimeline from "../../components/principal/HealthTimeline";
import ApprovalQueue from "../../components/principal/ApprovalQueue";
import ActiveWorkOrders from "../../components/principal/ActiveWorkOrders";
import AuditCompliance from "../../components/principal/AuditCompliance";
import WeeklyBundleQuickSend from "../../components/principal/WeeklyBundleQuickSend";

const RISK_CONFIG = {
  critical: { color: "text-red-700", bg: "bg-red-50 border border-red-200 shadow-sm", label: "CRITICAL", fill: "#b91c1c" },
  high: { color: "text-orange-700", bg: "bg-orange-50 border border-orange-200 shadow-sm", label: "HIGH", fill: "#c2410c" },
  moderate: { color: "text-amber-700", bg: "bg-amber-50 border border-amber-200 shadow-sm", label: "MODERATE", fill: "#b45309" },
  low: { color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200 shadow-sm", label: "LOW", fill: "#047857" },
};

function priorityToLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
}

function getISOWeek() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

function buildAnalysis(predictions) {
  if (!predictions || predictions.length === 0) return null;

  const scoreOf = (p) => p.riskScore ?? p.storedPriorityScore ?? 0;
  const dtfOf = (p) => p.estimated_days_to_failure ?? p.storedDaysToFailure ?? null;
  const fail30Of = (p) => p.within_30_days ?? p.storedWithin30Days ?? false;
  const fail60Of = (p) => p.within_60_days ?? p.storedWithin60Days ?? false;

  const overallScore = Math.round(Math.max(...predictions.map(scoreOf)));
  const level = priorityToLevel(overallScore);
  const worst = predictions.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a));

  const dtfValues = predictions
    .map(dtfOf)
    .filter(d => d != null && !isNaN(d) && d > 0);
  const timeToFailureDays = dtfValues.length ? Math.round(Math.min(...dtfValues)) : null;

  const hasFail30 = predictions.some(fail30Of);
  const hasFail60 = predictions.some(fail60Of);
  const trend = hasFail30 ? "deteriorating" : overallScore >= 60 ? "deteriorating" : "stable";

  const breakdown = {};
  for (const p of predictions) {
    const ps = Math.round(scoreOf(p));
    breakdown[p.category] = {
      score: ps,
      level: priorityToLevel(ps),
      conditionScore: p.storedConditionScore ?? p.conditionScore,
      willFailWithin30Days: fail30Of(p),
      deteriorationRate: p.deterioration_rate,
      evidence: p.evidence,
    };
  }

  let explanation = `Overall risk score: ${overallScore}/100. `;
  if (hasFail30) explanation += "⚠ Failure predicted within 30 days. ";
  else if (hasFail60) explanation += "Failure predicted within 60 days. ";
  explanation += `Worst category: ${worst.category}.`;

  return {
    score: overallScore,
    level,
    trend,
    worstCategory: worst.category,
    timeToFailureDays,
    reportCount: predictions.length,
    explanation,
    breakdown,
  };
}

export default function SchoolView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [reports, setReports] = useState([]);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;

  useEffect(() => {
    const loadData = async () => {
      if (!schoolId) { setLoading(false); return; }

      const [riskRes, reportsRes, schoolRes] = await Promise.all([
        get(`/api/risk/${schoolId}`),
        get(`/api/condition-report?schoolId=${schoolId}&limit=50`),
        get(`/api/schools/${schoolId}`),
      ]);

      if (riskRes.success) setAnalysis(buildAnalysis(riskRes.predictions));
      if (reportsRes.success) setReports(reportsRes.records || []);
      if (schoolRes.success) setSchool(schoolRes.school);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 font-body">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
        <p className="text-slate-400 font-bold tracking-[0.2em] text-[12px] uppercase animate-pulse">{t('sv.analyzing')}</p>
      </div>
    );
  }

  const isPrincipal = user?.role === 'principal' || user?.role === 'school';

  if (!user?.schoolId || !isPrincipal) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl text-slate-900 font-bold">{t('sv.access_restricted')}</p>
        <p className="text-sm mt-2">{t('sv.admin_credentials_req')}</p>
      </div>
    );
  }

  // Calculate Report Metrics
  const currentWeek = getISOWeek();
  const currentMonth = new Date().getMonth();

  // Calculate completed
  const uniqueCompletedWeeks = new Set(reports.map(r => r.weekNumber)).size;
  const completedThisMonth = new Set(reports.filter(r => new Date(r.createdAt).getMonth() === currentMonth).map(r => r.weekNumber)).size;

  // Assuming 1 report per week expected
  const expectedWeeksSoFar = currentWeek;
  const totalPending = Math.max(0, expectedWeeksSoFar - uniqueCompletedWeeks);
  const pendingThisMonth = Math.max(0, 4 - completedThisMonth); // roughly 4 weeks in a month

  const latestReport = reports.length > 0 ? reports[0] : null;

  // Determine image based on schoolId
  const imgIndex = (String(schoolId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10;
  const images = [
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1200&q=80',
    'https://images.unsplash.com/photo-1510531704581-5b2870972060?w=1200&q=80',
    'https://images.unsplash.com/photo-1498075702571-ecb018f3752d?w=1200&q=80',
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&q=80',
    'https://images.unsplash.com/photo-1584697964149-14a9386d3b4d?w=1200&q=80',
    'https://images.unsplash.com/photo-1536337005238-94b997371b40?w=1200&q=80',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&q=80',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1200&q=80'
  ];
  const imageUrl = images[imgIndex];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Massive Hero Banner */}
      <div className="relative w-full h-[400px] bg-slate-900">
        <img src={imageUrl} alt="School Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute bottom-24 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex gap-2 mb-3">
                <Badge variant="info" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                  <MapPin size={12} className="mr-1.5" /> {school?.district || t('sv.unspecified_region')}
                </Badge>
                <Badge variant="default" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                  <Calendar size={12} className="mr-1.5" /> {t('sv.age')}: {school?.buildingAge ?? "?"}Y
                </Badge>
                <Badge variant="default" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                  <Users size={12} className="mr-1.5" /> {t('sv.registry')}: {school?.numStudents ?? "?"}
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-md">
                {school?.name || t('sv.generic_node')}
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Building size={14} /> {t('sv.admin_oversight')}
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate("/peon/dashboard")} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-md shadow-xl">
                {t('sv.submit_audit')}
              </Button>
              <Button onClick={() => navigate(roleSubPath(user?.role, "reports"))} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-md shadow-xl">
                {t('sv.resource_registry')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-8 space-y-8">
        {/* REPORT METRICS - Floating Over Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mt-16 relative z-10">
          <MetricCard
            label={t('sv.infra_health')}
            value={analysis ? `${100 - analysis.score}%` : "0%"}
            icon={Shield}
            variant={analysis?.score > 60 ? "critical" : analysis?.score > 30 ? "high" : "success"}
            trendValue={t('sv.global_condition')}
          />
          <MetricCard
            label={t('sv.pending_audits')}
            value={totalPending}
            icon={Clock}
            variant={totalPending > 0 ? "high" : "success"}
            trendValue={`${pendingThisMonth} ${t('sv.due_this_month')}`}
          />
          <MetricCard
            label={t('sv.critical_risks')}
            value={analysis?.breakdown ? Object.values(analysis.breakdown).filter(v => v.level === 'critical' || v.level === 'high').length : 0}
            icon={AlertTriangle}
            variant="critical"
            trendValue={t('sv.high_risk_vectors')}
          />
          <MetricCard
            label={t('sv.audit_history')}
            value={uniqueCompletedWeeks}
            icon={FileText}
            variant="info"
            trendValue={`${t('sv.registry_volume')}: ${reports.length}`}
          />
        </div>

        {/* WEEKLY BUNDLE — LR scoring + Send to DEO */}
        <WeeklyBundleQuickSend schoolId={schoolId} />

        {/* ACTIONABLE ITEMS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <ApprovalQueue schoolId={schoolId} className="h-full" />
          <ActiveWorkOrders schoolId={schoolId} className="h-full" />
        </div>

        {/* ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          <div className="lg:col-span-2">
            <HealthTimeline schoolId={schoolId} className="h-full" />
          </div>
          <div className="lg:col-span-1">
            {analysis?.breakdown && Object.keys(analysis.breakdown).length > 0 && (
              <Card variant="gov" className="h-full" title={t('sv.risk_spectrum')} subtitle={t('sv.domain_specific')} icon={LayoutDashboard}>
                <div className="space-y-6">
                  {Object.entries(analysis.breakdown).map(([cat, data]) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{cat}</span>
                        <Badge variant={data.level} size="xs">{data.level}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${data.level === "critical" ? "bg-red-600" : data.level === "high" ? "bg-orange-500" : data.level === "moderate" ? "bg-amber-500" : "bg-emerald-600"}`}
                            style={{ width: `${data.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-900 w-6 text-right">{data.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* SURVIVAL & PROOF SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <Card variant="gov" className="h-full border-none shadow-xl shadow-slate-200/50 relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-slate-800 text-white" title="" icon={ActivityIcon}>
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <ActivityIcon size={120} />
            </div>
            {analysis ? (
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <ActivityIcon size={20} className="text-blue-400" />
                    {t('sv.infra_survival')}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('sv.predictive_engine')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('sv.failure_horizon')}</p>
                    <div className={`text-3xl font-bold ${analysis.timeToFailureDays <= 15 ? "text-red-400" : "text-white"}`}>
                      {analysis.timeToFailureDays || "N/A"} <span className="text-xs font-bold opacity-60 uppercase">{t('deo.days')}</span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('sv.trend_vector')}</p>
                    <div className={`text-xs font-bold flex items-center gap-1.5 uppercase ${analysis.trend === "deteriorating" ? "text-red-400" : "text-emerald-400"}`}>
                      {analysis.trend === "deteriorating" ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                      {analysis.trend}
                    </div>
                    <div className="text-[10px] font-bold text-white uppercase mt-1 opacity-80">{t('sv.critical_worst')}: {analysis.worstCategory || t('sv.none')}</div>
                  </div>
                </div>

                <div className="mt-auto flex items-start gap-3 bg-blue-500/20 border border-blue-400/30 p-3 rounded-lg text-xs font-bold text-blue-100 backdrop-blur-sm shadow-inner">
                  <AlertTriangle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{analysis.explanation.replace("⚠", "")}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-medium text-sm italic relative z-10">
                {t('sv.insufficient_data')}
              </div>
            )}
          </Card>
          <AuditCompliance schoolId={schoolId} className="h-full" />
        </div>
      </div>
    </div>
  );
}

function ActivityIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

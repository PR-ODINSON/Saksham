import { useState, useEffect } from "react";
import { get } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import { FileText, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Building, MapPin, Users, Calendar, CheckCircle2, Clock, Shield } from "lucide-react";

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
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

function buildAnalysis(predictions) {
  if (!predictions || predictions.length === 0) return null;

  const scoreOf  = (p) => p.riskScore ?? p.storedPriorityScore ?? 0;
  const dtfOf    = (p) => p.estimated_days_to_failure ?? p.storedDaysToFailure ?? null;
  const fail30Of = (p) => p.within_30_days ?? p.storedWithin30Days ?? false;
  const fail60Of = (p) => p.within_60_days ?? p.storedWithin60Days ?? false;

  const overallScore = Math.round(Math.max(...predictions.map(scoreOf)));
  const level        = priorityToLevel(overallScore);
  const worst        = predictions.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a));

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
      score:               ps,
      level:               priorityToLevel(ps),
      conditionScore:      p.storedConditionScore ?? p.conditionScore,
      willFailWithin30Days: fail30Of(p),
      deteriorationRate:   p.deterioration_rate,
      evidence:            p.evidence,
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
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [reports, setReports] = useState([]);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;
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
         <p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Analysing Profile...</p>
      </div>
    );
  }

  const isPrincipal = user?.role === 'principal' || user?.role === 'school';

  if (!user?.schoolId || !isPrincipal) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl text-slate-900 font-bold">Access Restricted</p>
        <p className="text-sm mt-2">Administrative credentials required to view this profile.</p>
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

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Node Operations Center"
        subtitle={`Administrative Oversight · ${school?.name || "Generic Node"}`}
        icon={Building}
        actions={
          <Button 
            onClick={() => navigate("/dashboard/reports")}
            variant="primary"
          >
            Resource Registry
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 -mt-4">
        <Badge variant="info" size="lg"><MapPin size={12} className="mr-1.5" /> {school?.district || "Unspecified Region"}</Badge>
        <Badge variant="default" size="lg"><Calendar size={12} className="mr-1.5" /> Structure Age: {school?.buildingAge ?? "?"}Y</Badge>
        <Badge variant="default" size="lg"><Users size={12} className="mr-1.5" /> Registry Size: {school?.numStudents ?? "?"}</Badge>
      </div>

      {/* REPORT METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          label="Validation Required" 
          value={totalPending} 
          icon={Clock} 
          variant={totalPending > 0 ? "high" : "success"}
          trendValue={`${pendingThisMonth} reports pending this month`}
        />
        <MetricCard 
          label="Audits Completed" 
          value={uniqueCompletedWeeks} 
          icon={CheckCircle2} 
          variant="success"
          trendValue={`${completedThisMonth} validated this month`}
        />
        <MetricCard 
          label="Latest Submission" 
          value={latestReport ? latestReport.category : "None"} 
          icon={FileText} 
          variant="info"
          trendValue={latestReport ? `Week ${latestReport.weekNumber} Assessment` : "Registry empty"}
        />
      </div>

      <Card title="Structural Survival Analysis" icon={Shield}>
        {analysis ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Failure Horizon</p>
                <div className={`text-2xl font-bold ${analysis.timeToFailureDays <= 15 ? "text-red-700" : "text-slate-900"}`}>
                  {analysis.timeToFailureDays || "N/A"} <span className="text-xs font-medium opacity-50 uppercase">Days</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Condition Trend</p>
                <div className={`text-xs font-bold flex items-center gap-1.5 uppercase ${analysis.trend === "deteriorating" ? "text-red-700" : "text-emerald-700"}`}>
                  {analysis.trend === "deteriorating" ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  {analysis.trend}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Critical Vector</p>
                <div className="text-xs font-bold text-slate-900 uppercase">{analysis.worstCategory || "None"}</div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Registry Volume</p>
                <div className="text-2xl font-bold text-slate-900">{analysis.reportCount || 0}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 p-4 rounded text-xs font-medium text-blue-900">
               <AlertTriangle size={16} className="text-blue-700 shrink-0" />
               <p>{analysis.explanation.replace("⚠", "")}</p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 font-medium text-sm italic">
            Insufficient audit data for predictive survival analysis.
          </div>
        )}
      </Card>

      {/* Category breakdown */}
      {analysis?.breakdown && Object.keys(analysis.breakdown).length > 0 && (
        <Card title="Structural Risk Vectors" subtitle="Machine-learned risk assessment per domain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {Object.entries(analysis.breakdown).map(([cat, data]) => (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">{cat}</span>
                  <Badge variant={data.level} size="sm">{data.level}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${data.level === "critical" ? "bg-red-600" : data.level === "high" ? "bg-orange-500" : data.level === "moderate" ? "bg-amber-500" : "bg-emerald-600"}`}
                      style={{ width: `${data.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-900 w-8 text-right">{data.score}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
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

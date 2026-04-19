import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { get, post } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { dashboardPathFor } from "../../utils/roleRoutes.js";
import { useLanguage } from "../../context/LanguageContext";
import { motion } from "framer-motion";
import {
  Building2, Lock, Mail, ArrowRight,
  ShieldCheck, User, Activity, AlertTriangle, Sparkles,
  School as SchoolIcon, HardHat, Loader2
} from "lucide-react";

/**
 * Demo accounts seeded by GET /api/seed-demo.
 * Roles must match the enum in backend/models/user.model.js:
 *   'peon' | 'principal' | 'deo' | 'contractor' | 'admin'
 */
const ROLE_HINTS = [
  {
    role: "admin",
    label: "System Admin",
    email: "admin@demo.com",
    icon: <ShieldCheck size={14} />,
    accent: "bg-red-50 border-red-500 text-red-700",
  },
  {
    role: "deo",
    label: "District Officer",
    email: "deo@demo.com",
    icon: <Building2 size={14} />,
    accent: "bg-blue-50 border-blue-500 text-blue-700",
  },
  {
    role: "principal",
    label: "School Principal",
    email: "principal@demo.com",
    icon: <SchoolIcon size={14} />,
    accent: "bg-indigo-50 border-indigo-500 text-indigo-700",
  },
  {
    role: "contractor",
    label: "Contractor",
    email: "contractor1@demo.com",
    icon: <HardHat size={14} />,
    accent: "bg-orange-50 border-orange-500 text-orange-700",
  },
  {
    role: "peon",
    label: "School Peon",
    email: "peon@demo.com",
    icon: <User size={14} />,
    accent: "bg-slate-50 border-slate-500 text-slate-700",
  },
];

const GLOBAL_STYLES = `
  .faint-grid-blue {
    background-color: #f8fafc;
    background-image: 
      linear-gradient(rgba(0, 51, 102, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 51, 102, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .gov-font-formal {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
`;

export default function Login() {
  const { t, language, setLanguage } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);

  const ROLE_HINTS = [
    {
      role: "admin",
      label: t('login.role_admin'),
      email: "admin@demo.com",
      icon: <ShieldCheck size={14} />,
      accent: "bg-red-50 border-red-500 text-red-700",
    },
    {
      role: "deo",
      label: t('login.role_deo'),
      email: "deo@demo.com",
      icon: <Building2 size={14} />,
      accent: "bg-blue-50 border-blue-500 text-blue-700",
    },
    {
      role: "principal",
      label: t('login.role_principal'),
      email: "principal@demo.com",
      icon: <SchoolIcon size={14} />,
      accent: "bg-indigo-50 border-indigo-500 text-indigo-700",
    },
    {
      role: "contractor",
      label: t('login.role_contractor'),
      email: "contractor1@demo.com",
      icon: <HardHat size={14} />,
      accent: "bg-orange-50 border-orange-500 text-orange-700",
    },
    {
      role: "peon",
      label: t('login.role_peon'),
      email: "peon@demo.com",
      icon: <User size={14} />,
      accent: "bg-slate-50 border-slate-500 text-slate-700",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      navigate(dashboardPathFor(result.user?.role));
    } else {
      setError(result.message || t('login.invalid_creds'));
    }
  };

  const fillDemo = (hint) => {
    setActive(hint.role);
    setForm({ email: hint.email, password: "password123" });
  };

  return (
    <div className="min-h-screen faint-grid-blue flex items-center justify-center p-6 font-sans font-body selection:bg-blue-200 relative overflow-hidden">
      <style>{GLOBAL_STYLES}</style>

      {/* 1. Language switcher - Subtle Top Right corner */}
      <div className="absolute top-6 right-8 z-[100] hidden sm:block">
        <div className="flex items-center gap-6 text-[11px] font-bold tracking-widest uppercase">
          <button
            onClick={() => setLanguage('en')}
            className={`transition-all py-1 ${language === 'en' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-400 hover:text-blue-600'}`}
          >
            English
          </button>
          <span className="text-slate-200">|</span>
          <button
            onClick={() => setLanguage('hi')}
            className={`transition-all py-1 ${language === 'hi' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-400 hover:text-blue-600'}`}
          >
            हिन्दी
          </button>
          <span className="text-slate-200">|</span>
          <button
            onClick={() => setLanguage('gu')}
            className={`transition-all py-1 ${language === 'gu' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-400 hover:text-blue-600'}`}
          >
            ગુજરાતી
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 p-8 sm:p-10 relative z-10"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md border border-slate-50">
            <Building2 size={24} className="text-[#003366]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Government of India</span>
            <span className="text-lg font-bold text-[#003366] tracking-tight">Saksham Portal Login</span>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">Administrative Monitoring Gateway</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[11px] font-bold flex items-center gap-3"
          >
            <AlertTriangle size={16} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <InputGroup
            icon={<Mail size={18} />}
            label={t('login.email_label')}
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Enter email address"
          />

          <InputGroup
            icon={<Lock size={18} />}
            label={t('login.password_label')}
            name="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-[11px] uppercase tracking-widest shadow-lg shadow-blue-900/10 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <>{t('login.authenticate_btn')} <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Official Identities</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ROLE_HINTS.map((hint) => (
              <button
                key={hint.role}
                type="button"
                onClick={() => fillDemo(hint)}
                className={`px-3 py-2.5 rounded-lg border text-[10px] font-bold uppercase tracking-tight transition-all flex items-center gap-2
                  ${active === hint.role
                    ? "bg-[#003366] border-[#003366] text-white shadow-md scale-[1.02]"
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                  }`}
              >
                {hint.icon}
                {hint.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] font-bold text-slate-400">
          {t('login.need_access')}
          <Link to="/signup" className="text-[#003366] ml-1 hover:underline underline-offset-4">{t('login.request_profile')}</Link>
        </p>

        <div className="mt-8 text-center">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-loose">
            © 2026 SAKSHAM · Secure Administrative Channel
          </span>
        </div>
      </motion.div>
    </div>
  );
}

const InputGroup = ({ icon, label, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-0.5">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-[#003366] transition-colors">
        {icon}
      </div>
      <input
        {...props}
        required
        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-11 pr-4 py-3 rounded-xl outline-none focus:bg-white focus:border-[#003366] transition-all font-semibold placeholder:text-slate-300 text-sm"
      />
    </div>
  </div>
);

// Internal missing component shim
function CheckCircle2(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

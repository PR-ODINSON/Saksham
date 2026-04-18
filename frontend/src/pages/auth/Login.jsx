import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { get, post } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
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
    role:    "admin",
    label:   "System Admin",
    email:   "admin@demo.com",
    icon:    <ShieldCheck size={14} />,
    accent:  "bg-red-50 border-red-500 text-red-700",
  },
  {
    role:    "deo",
    label:   "District Officer",
    email:   "deo@demo.com",
    icon:    <Building2 size={14} />,
    accent:  "bg-blue-50 border-blue-500 text-blue-700",
  },
  {
    role:    "principal",
    label:   "School Principal",
    email:   "principal@demo.com",
    icon:    <SchoolIcon size={14} />,
    accent:  "bg-indigo-50 border-indigo-500 text-indigo-700",
  },
  {
    role:    "contractor",
    label:   "Contractor",
    email:   "contractor1@demo.com",
    icon:    <HardHat size={14} />,
    accent:  "bg-orange-50 border-orange-500 text-orange-700",
  },
  {
    role:    "peon",
    label:   "School Peon",
    email:   "peon@demo.com",
    icon:    <User size={14} />,
    accent:  "bg-slate-50 border-slate-500 text-slate-700",
  },
];

const GLOBAL_STYLES = `
  .glass-card-terminal {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(24px);
    border: 2px solid #0f172a;
    box-shadow: 8px 8px 0 rgba(15, 23, 42, 0.1);
  }
  .grid-lines-dark {
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }
`;

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [active,  setActive]  = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message || "Invalid credentials. Please try again.");
    }
  };

  const fillDemo = (hint) => {
    setActive(hint.role);
    setForm({ email: hint.email, password: "password123" });
  };

  return (
    <div className="min-h-screen bg-white flex font-sans font-body selection:bg-blue-200">
      <style>{GLOBAL_STYLES}</style>
      
      {/* LEFT PANEL - BRANDING & VISUALS (Hidden on mobile) */}
      <div className="hidden lg:flex w-[45%] bg-[#0f172a] grid-lines-dark relative flex-col justify-between p-12 overflow-hidden border-r-4 border-slate-900">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        
        {/* Top Logo Area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-[4px_4px_0_#2563eb]">
            <Sparkles size={24} className="text-[#0f172a]" />
          </div>
          <span className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Saksham</span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border-2 border-blue-500/30 mb-6 backdrop-blur-sm">
             <Activity size={14} className="text-blue-400" />
             <span className="text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase">Predictive Engine v3</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome To <br />
            <span className="text-blue-500">The Core.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md font-medium leading-relaxed">
            Secure Access Gateway. Authenticate your identity to access the predictive infrastructure dashboard.
          </p>

          {/* Floating Widget Mockup */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="mt-12 bg-white/5 border-2 border-white/10 backdrop-blur-md p-5 rounded-2xl max-w-xs shadow-2xl"
          >
             <div className="flex items-center gap-3 mb-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                 <ShieldCheck size={16} className="text-emerald-400" />
               </div>
               <div>
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">System Secure</p>
                 <p className="text-sm font-bold text-white">Encrypted Connection</p>
               </div>
             </div>
             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: "0%" }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 1.5, delay: 0.5 }}
                 className="h-full bg-emerald-500" 
               />
             </div>
          </motion.div>
        </div>

        {/* Bottom Area */}
        <div className="relative z-10 flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-widest">
          <span>© 2026 SAKSHAM</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Operational
          </span>
        </div>
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="w-full lg:w-[55%] bg-slate-50 relative flex flex-col justify-center py-12 px-6 sm:px-12 md:px-20 lg:px-24 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-lg mx-auto"
        >
          <div className="mb-10">
            {/* Mobile Logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#0f172a] rounded-lg flex items-center justify-center shadow-[4px_4px_0_#2563eb]">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="text-2xl font-black text-[#0f172a] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Saksham</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-[#0f172a] tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>Authenticate.</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.15em]">Enter credentials to access portal</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-50 border-2 border-red-500 rounded-xl text-red-700 text-xs font-bold flex items-center gap-3 shadow-[4px_4px_0_#ef4444]"
            >
              <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <InputGroup 
              icon={<Mail size={18} />} 
              label="Identity / Email Address" 
              name="email" 
              type="email"
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              placeholder="name@org.gov" 
            />
            
            <InputGroup 
              icon={<Lock size={18} />} 
              label="Secure Password" 
              name="password" 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              placeholder="••••••••" 
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f172a] hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[6px_6px_0_#2563eb] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mt-8 text-sm uppercase tracking-widest border-2 border-[#0f172a]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>Authenticate <ArrowRight size={18} /></>}
            </button>
          </form>

          {/* Sandbox identities */}
          <div className="mt-12 pt-8 border-t-2 border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Sandbox Identities · password: password123
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_HINTS.map((hint) => (
                <button
                  key={hint.role}
                  type="button"
                  onClick={() => fillDemo(hint)}
                  className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-start gap-2 group
                    ${active === hint.role
                      ? hint.accent + " shadow-[4px_4px_0_currentColor]"
                      : "bg-white border-slate-200 text-slate-500 hover:border-[#0f172a] hover:text-[#0f172a]"
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      {hint.icon}
                      {hint.label}
                    </span>
                    {active === hint.role && <CheckCircle2 size={12} className="shrink-0" />}
                  </div>
                  <span className="text-[9px] font-bold opacity-60 normal-case tracking-normal">
                    {hint.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
            Need infrastructure access? {" "}
            <Link to="/signup" className="text-blue-600 hover:text-[#0f172a] transition-colors border-b-2 border-blue-600 hover:border-[#0f172a] pb-0.5">Request Profile</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const InputGroup = ({ icon, label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
        {icon}
      </div>
      <input
        {...props}
        required
        className="w-full bg-white border-2 border-slate-300 text-[#0f172a] pl-11 pr-4 py-3.5 rounded-xl outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] hover:border-slate-400 transition-all font-bold placeholder:text-slate-300 text-sm"
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

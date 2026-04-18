import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, User, Wrench, Activity } from "lucide-react";

const ROLE_HINTS = {
  admin: { email: "admin@demo.com", label: "System Admin" },
  deo: { email: "deo@demo.com", label: "District Officer" },
  bmo: { email: "bmo@demo.com", label: "Block Officer" },
  school: { email: "school1@demo.com", label: "School Admin" },
  contractor: { email: "contractor1@demo.com", label: "Contractor" },
};

const GLOBAL_STYLES = `
  .glass-card-terminal {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(24px);
    border: 2px solid #0f172a;
    box-shadow: 8px 8px 0 rgba(15, 23, 42, 0.1);
  }
  .grid-lines {
    background-image: 
      linear-gradient(rgba(30, 58, 138, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30, 58, 138, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }
`;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const fillDemo = (role) => {
    setForm({ email: ROLE_HINTS[role].email, password: "password123" });
  };

  return (
    <div className="min-h-screen bg-white grid-lines flex items-center justify-center p-6 font-sans">
      <style>{GLOBAL_STYLES}</style>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Floating Accent */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="glass-card-terminal p-8 md:p-10 rounded-[2rem] relative z-10">
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-[#0f172a] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Saksham <span className="text-blue-600 italic">V3</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Access Gateway</p>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-[#0f172a] mb-2 tracking-tight">Welcome Back.</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Enter your credentials to access the infrastructure portal.</p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-xs font-bold flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity/Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-[#0f172a] text-[#0f172a] pl-11 pr-4 py-4 rounded-xl outline-none focus:bg-white focus:shadow-[4px_4px_0_#2563eb] transition-all font-bold placeholder:text-slate-300"
                  placeholder="name@organization.gov"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secret/Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-[#0f172a] text-[#0f172a] pl-11 pr-4 py-4 rounded-xl outline-none focus:bg-white focus:shadow-[4px_4px_0_#2563eb] transition-all font-bold placeholder:text-slate-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f172a] hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[6px_6px_0_#2563eb] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          {/* Role Quick Links */}
          <div className="mt-12 pt-8 border-t-2 border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sandbox Identities</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_HINTS).map(([role, { label }]) => (
                <button
                  key={role}
                  onClick={() => fillDemo(role)}
                  className="px-3 py-2.5 rounded-lg text-[10px] font-black bg-slate-50 border border-slate-200 hover:border-[#0f172a] hover:bg-white text-[#0f172a] transition-all flex items-center justify-between group"
                >
                  {label}
                  <Activity size={12} className="opacity-0 group-hover:opacity-100 text-blue-600" />
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-xs font-bold text-slate-400">
            Internal Portal. Need access? {" "}
            <Link to="/signup" className="text-blue-600 hover:underline">Request Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

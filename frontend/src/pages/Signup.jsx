import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, User, Mail, Lock, Phone, MapPin, 
  ShieldCheck, ArrowRight, Loader2, Sparkles,
  School as SchoolIcon, Briefcase
} from 'lucide-react';

const ROLES = [
  { id: 'peon', label: 'School Peon/Watchman', icon: <User size={18} />, bg: 'bg-slate-50', border: 'border-slate-500', text: 'text-slate-600' },
  { id: 'principal', label: 'School Principal', icon: <SchoolIcon size={18} />, bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600' },
  { id: 'deo', label: 'DEO', icon: <Building2 size={18} />, bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-600' },
  { id: 'contractor', label: 'Contractor', icon: <Briefcase size={18} />, bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-600' },
  { id: 'admin', label: 'Admin', icon: <ShieldCheck size={18} />, bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-600' },
];

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

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'peon',
    district: '',
    phone: '',
    schoolId: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const result = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      district: formData.district,
      phone: formData.phone,
      schoolId: (formData.role === 'peon' || formData.role === 'principal') ? formData.schoolId : undefined
    });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setFormError(result.message || 'Registration failed. Try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white grid-lines flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <style>{GLOBAL_STYLES}</style>
      
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-100/30 rounded-full blur-[100px] -ml-48 -mb-48" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl relative z-10"
      >
        <div className="glass-card-terminal p-8 md:p-12 rounded-[2.5rem]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#0f172a] rounded-lg flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Saksham <span className="text-blue-600">V3</span></h1>
              </div>
              <h2 className="text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">Create Account.</h2>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Access the predictive maintenance engine</p>
            </div>
            
            <div className="hidden md:block text-right">
              <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Status</p>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Protocol Active</span>
              </div>
            </div>
          </div>

          {formError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-50 border-2 border-red-500 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {formError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Role Grid */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Select Access Protocol (RBAC)</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ROLES.map((role) => (
                  <button 
                    type="button"
                    key={role.id}
                    onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.role === role.id 
                        ? `${role.bg} ${role.border} ${role.text} shadow-[4px_4px_0_#0f172a]` 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {role.icon}
                    <span className="text-[10px] font-black uppercase tracking-widest">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <InputGroup icon={<User size={18} />} label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="Enter Full Name" />
              <InputGroup icon={<Mail size={18} />} label="Email Address" name="email" value={formData.email} onChange={handleChange} placeholder="name@org.gov" />
              <InputGroup icon={<Phone size={18} />} label="Contact Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 XXXX XXXX" />
              <InputGroup icon={<MapPin size={18} />} label="District Jurisdiction" name="district" value={formData.district} onChange={handleChange} placeholder="e.g. Ahmedabad" />
              
              <AnimatePresence>
                {(formData.role === 'peon' || formData.role === 'principal') && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:col-span-2 overflow-hidden">
                    <InputGroup icon={<Building2 size={18} />} label="Canonical School ID" name="schoolId" value={formData.schoolId} onChange={handleChange} placeholder="Enter numeric school code" />
                  </motion.div>
                )}
              </AnimatePresence>

              <InputGroup icon={<Lock size={18} />} label="Secure Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
              <InputGroup icon={<ShieldCheck size={18} />} label="Confirm Secret" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0f172a] hover:bg-blue-600 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[8px_8px_0_#2563eb] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 mt-10"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Initialize Access Protocol</>}
            </button>
          </form>

          <p className="mt-10 text-center text-xs font-bold text-slate-400">
            Already have clearance? {" "}
            <Link to="/login" className="text-blue-600 hover:underline">Return to Hub</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const InputGroup = ({ icon, label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600">
        {icon}
      </div>
      <input
        {...props}
        className="w-full bg-slate-50 border-2 border-[#0f172a] text-[#0f172a] pl-11 pr-4 py-4 rounded-xl outline-none focus:bg-white focus:shadow-[4px_4px_0_#2563eb] transition-all font-bold placeholder:text-slate-300"
      />
    </div>
  </div>
);

export default Signup;
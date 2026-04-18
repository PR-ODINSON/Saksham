import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { post } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { dashboardPathFor } from "../../utils/roleRoutes.js";
import { useLanguage } from "../../context/LanguageContext";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, User, Mail, Lock, Phone, MapPin, 
  ShieldCheck, ArrowRight, Loader2, Sparkles,
  School as SchoolIcon, Briefcase, Activity, AlertTriangle
} from 'lucide-react';

const Signup = () => {
  const { t, language, setLanguage } = useLanguage();
  
  const ROLES = [
    { id: 'peon', label: t('signup.role_peon'), icon: <User size={18} />, bg: 'bg-slate-50', border: 'border-slate-500', text: 'text-slate-600' },
    { id: 'principal', label: t('signup.role_principal'), icon: <SchoolIcon size={18} />, bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600' },
    { id: 'deo', label: t('signup.role_deo'), icon: <Building2 size={18} />, bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-600' },
    { id: 'contractor', label: t('signup.role_contractor'), icon: <Briefcase size={18} />, bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-600' },
    { id: 'admin', label: t('signup.role_admin'), icon: <ShieldCheck size={18} />, bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-600' },
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
      setFormError(t('signup.password_mismatch'));
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
      navigate(dashboardPathFor(result.user?.role || formData.role));
    } else {
      setFormError(result.message || t('signup.reg_failed'));
    }
    setIsSubmitting(false);
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
             <span className="text-[12px] font-black text-blue-400 tracking-[0.2em] uppercase">{t('signup.predictive_engine')}</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            {t('signup.build_the')} <br />
            <span className="text-blue-500">{t('signup.infrastructure')}</span> <br />
            {t('signup.of_tomorrow')}
          </h1>
          <p className="text-slate-400 text-lg max-w-md font-medium leading-relaxed">
            {t('signup.desc')}
          </p>

          {/* Floating Widget Mockup */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="mt-12 bg-white/5 border-2 border-white/10 backdrop-blur-md p-5 rounded-2xl max-w-xs shadow-2xl"
          >
             <div className="flex items-center gap-3 mb-3">
               <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                 <AlertTriangle size={16} className="text-red-400" />
               </div>
               <div>
                 <p className="text-[12px] font-black text-red-400 uppercase tracking-widest">{t('signup.high_risk')}</p>
                 <p className="text-sm font-bold text-white">{t('signup.structural_block')}</p>
               </div>
             </div>
             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: "0%" }}
                 animate={{ width: "85%" }}
                 transition={{ duration: 1.5, delay: 0.5 }}
                 className="h-full bg-red-500" 
               />
             </div>
          </motion.div>
        </div>

        {/* Bottom Area */}
        <div className="relative z-10 flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-widest">
          <span>© 2026 SAKSHAM</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('signup.system_operational')}
          </span>
        </div>
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="w-full lg:w-[55%] bg-slate-50 relative flex flex-col justify-center py-12 px-6 sm:px-12 md:px-20 lg:px-24 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-xl mx-auto"
        >
          <div className="mb-10">
            {/* Top row with Logo and Language switcher for mobile & desktop */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex lg:hidden items-center gap-3">
                <div className="w-10 h-10 bg-[#0f172a] rounded-lg flex items-center justify-center shadow-[4px_4px_0_#2563eb]">
                  <Sparkles size={20} className="text-white" />
                </div>
                <span className="text-2xl font-black text-[#0f172a] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Saksham</span>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg ml-auto bg-white shadow-sm">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`text-[10px] font-black px-2 py-1 rounded transition-colors ${language === 'en' ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >EN</button>
                <button 
                  onClick={() => setLanguage('hi')}
                  className={`text-[10px] font-black px-2 py-1 rounded transition-colors ${language === 'hi' ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >HI</button>
                <button 
                  onClick={() => setLanguage('gu')}
                  className={`text-[10px] font-black px-2 py-1 rounded transition-colors ${language === 'gu' ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >GU</button>
              </div>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-[#0f172a] tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>{t('signup.init_title')}</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.15em]">{t('signup.init_subtitle')}</p>
          </div>

          {formError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-50 border-2 border-red-500 rounded-xl text-red-700 text-xs font-bold flex items-center gap-3 shadow-[4px_4px_0_#ef4444]"
            >
              <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              {formError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Role Grid */}
            <div className="space-y-3">
              <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">{t('signup.select_access')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {ROLES.map((role) => (
                  <button 
                    type="button"
                    key={role.id}
                    onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      formData.role === role.id 
                        ? `${role.bg} border-slate-900 ${role.text} shadow-[4px_4px_0_#0f172a] scale-[1.02]` 
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {role.icon}
                    <span className="text-[12px] font-black uppercase tracking-widest">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              <InputGroup icon={<User size={18} />} label={t('signup.full_name')} name="name" value={formData.name} onChange={handleChange} placeholder="Enter Full Name" />
              <InputGroup icon={<Mail size={18} />} label={t('signup.email')} name="email" value={formData.email} onChange={handleChange} placeholder="name@org.gov" />
              <InputGroup icon={<Phone size={18} />} label={t('signup.contact_number')} name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 XXXX XXXX" />
              <InputGroup icon={<MapPin size={18} />} label={t('signup.district')} name="district" value={formData.district} onChange={handleChange} placeholder="e.g. Ahmedabad" />
              
              <AnimatePresence>
                {(formData.role === 'peon' || formData.role === 'principal') && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:col-span-2 overflow-hidden">
                    <div className="pt-2">
                      <InputGroup icon={<Building2 size={18} />} label={t('signup.school_id')} name="schoolId" value={formData.schoolId} onChange={handleChange} placeholder="Enter numeric school code" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <InputGroup icon={<Lock size={18} />} label={t('signup.password')} name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
              <InputGroup icon={<ShieldCheck size={18} />} label={t('signup.confirm_password')} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0f172a] hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[6px_6px_0_#2563eb] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mt-12 text-sm uppercase tracking-widest border-2 border-[#0f172a]"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> {t('signup.authorize')}</>}
            </button>
          </form>

          <p className="mt-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
            {t('signup.already_have')}
            <Link to="/login" className="text-blue-600 hover:text-[#0f172a] transition-colors border-b-2 border-blue-600 hover:border-[#0f172a] pb-0.5">{t('signup.return_hub')}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const InputGroup = ({ icon, label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
        {icon}
      </div>
      <input
        {...props}
        className="w-full bg-white border-2 border-slate-300 text-[#0f172a] pl-11 pr-4 py-3.5 rounded-xl outline-none focus:border-slate-900 focus:shadow-[4px_4px_0_#0f172a] hover:border-slate-400 transition-all font-bold placeholder:text-slate-300 text-sm"
      />
    </div>
  </div>
);

export default Signup;

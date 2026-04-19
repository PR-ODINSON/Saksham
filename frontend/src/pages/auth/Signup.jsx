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
    <div className="min-h-screen faint-grid-blue flex items-center justify-center p-4 sm:p-6 font-sans font-body selection:bg-blue-200 relative overflow-hidden">
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
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 p-6 sm:p-8 relative z-10"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md border border-slate-50">
             <Building2 size={24} className="text-[#003366]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Government of India</span>
            <span className="text-xl font-bold text-[#003366] tracking-tight">Saksham Account Registration</span>
          </div>
        </div>

        {formError && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-[10px] font-bold flex items-center gap-2"
          >
            <AlertTriangle size={14} />
            {formError}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-0.5">Select Access Level (RBAC)</label>
            <div className="grid grid-cols-5 gap-2">
              {ROLES.map((role) => (
                <button 
                  type="button"
                  key={role.id}
                  onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                  className={`px-2 py-3 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${
                    formData.role === role.id 
                      ? 'bg-[#003366] border-[#003366] text-white shadow-md' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div className={formData.role === role.id ? 'text-white' : 'text-[#003366]'}>{React.cloneElement(role.icon, { size: 18 })}</div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-center">{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InputGroup icon={<User size={16} />} label={t('signup.full_name')} name="name" value={formData.name} onChange={handleChange} placeholder="Enter full name" />
            <InputGroup icon={<Mail size={16} />} label={t('signup.email')} name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" />
            <InputGroup icon={<Phone size={16} />} label={t('signup.contact_number')} name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter mobile number" />
            <InputGroup icon={<MapPin size={16} />} label={t('signup.district')} name="district" value={formData.district} onChange={handleChange} placeholder="Enter district" />
            
            <AnimatePresence mode="wait">
              {(formData.role === 'peon' || formData.role === 'principal') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:col-span-2 overflow-hidden">
                  <InputGroup icon={<Building2 size={16} />} label={t('signup.school_id')} name="schoolId" value={formData.schoolId} onChange={handleChange} placeholder="Enter school ID" />
                </motion.div>
              )}
            </AnimatePresence>

            <InputGroup icon={<Lock size={16} />} label={t('signup.password')} name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Enter password" />
            <InputGroup icon={<ShieldCheck size={16} />} label={t('signup.confirm_password')} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Enter confirm password" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-50">
            <p className="text-xs font-bold text-slate-400 order-2 sm:order-1">
              {t('signup.already_have')}
              <Link to="/login" className="text-[#003366] ml-1 hover:underline underline-offset-4">{t('signup.return_hub')}</Link>
            </p>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[200px] bg-[#003366] hover:bg-[#002244] text-white font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 text-[11px] uppercase tracking-widest shadow-lg shadow-blue-900/10 active:scale-[0.98]"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <span>{t('signup.authorize')}</span>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const InputGroup = ({ icon, label, ...props }) => (
  <div className="space-y-1">
    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-0.5">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-[#003366] transition-colors">
        {icon}
      </div>
      <input
        {...props}
        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:bg-white focus:border-[#003366] transition-all font-semibold placeholder:text-slate-300 text-xs sm:text-sm"
      />
    </div>
  </div>
);

export default Signup;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, User, Loader2, UserPlus, ArrowRight, ShieldCheck, Phone, MapPin, Building2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'school', // Defaulting to 'school' based on backend
    district: '',
    phone: '',
    schoolId: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    // Payload now strictly matches the backend registerUser structure
    const result = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      district: formData.district,
      phone: formData.phone,
      schoolId: formData.role === 'school' ? formData.schoolId : undefined
    });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setFormError(result.message || 'Signup failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#040705] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-900/20 blur-[130px] rounded-full" />
        <img 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070" 
          alt="Farmland"
          className="w-full h-full object-cover opacity-[0.12] grayscale mix-blend-overlay"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">
            Initialize <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-lime-300 italic">Access.</span>
          </h1>
          <p className="text-emerald-100/40 font-medium">Create your credentials for the ecosystem.</p>
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup icon={<User size={18} />} label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" />
            <InputGroup icon={<Mail size={18} />} label="Email Address" name="email" value={formData.email} onChange={handleChange} placeholder="name@domain.com" />
            <InputGroup icon={<Phone size={18} />} label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
            <InputGroup icon={<MapPin size={18} />} label="District" name="district" value={formData.district} onChange={handleChange} placeholder="Enter District" />
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-emerald-100/30 ml-1">Account Role</label>
            <div className="grid grid-cols-2 gap-4">
              {['school', 'user'].map((roleType) => (
                <button 
                  type="button"
                  key={roleType}
                  onClick={() => setFormData(prev => ({ ...prev, role: roleType }))}
                  className={`p-4 rounded-2xl border transition-all capitalize ${
                    formData.role === roleType 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                      : 'bg-white/5 border-white/5 text-emerald-100/30'
                  }`}
                >
                  {roleType}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional School ID */}
          {formData.role === 'school' && (
             <InputGroup icon={<BookOpen size={18} />} label="School ID" name="schoolId" value={formData.schoolId} onChange={handleChange} placeholder="Enter School Unique ID" />
          )}

          {/* Passwords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup icon={<Lock size={18} />} label="Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
            <InputGroup icon={<ShieldCheck size={18} />} label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#040705] font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><UserPlus size={20} /> Initialize Registration</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// Helper component to keep code clean
const InputGroup = ({ icon, label, ...props }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-emerald-100/30 ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-100/20 group-focus-within:text-emerald-400">
        {icon}
      </div>
      <input
        {...props}
        className="w-full bg-white/5 border border-white/5 text-white pl-11 pr-4 py-4 rounded-2xl outline-none focus:border-emerald-500/30 focus:bg-white/10 transition-all placeholder:text-emerald-100/10"
      />
    </div>
  </div>
);

export default Signup;
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, ShieldAlert } from 'lucide-react';

function Hero() {
  return (
    <section id="hero" className="relative min-h-screen pt-32 pb-20 px-6 bg-slate-950 overflow-hidden flex items-center">
      {/* Background with Farm Texture - Blended for Tech Theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-slate-950/40 z-10" /> {/* Dark Overlay to force tech look */}
        <img 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070" 
          alt="Background"
          className="w-full h-full object-cover opacity-[0.15] mix-blend-luminosity"
        />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-20 grid lg:grid-cols-2 gap-16 items-center w-full">
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}>
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full mb-8">
            <BrainCircuit className="text-cyan-400" size={18} />
            <span className="text-cyan-400 font-bold tracking-[0.2em] text-[10px] uppercase">
              Saksham • AI Predictive Engine
            </span>
          </div>

          <h1 className="text-6xl md:text-[5.5rem] lg:text-[6.5rem] font-black text-white leading-[0.85] tracking-tighter mb-8">
            Predict Before <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 italic">It Breaks.</span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-md leading-relaxed font-medium">
            Stop reactive repairs. Saksham uses advanced data models to forecast infrastructure failures in government schools.
          </p>

          <Link to="/dashboard" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-10 py-5 rounded-full font-black text-xl transition-all hover:scale-105 flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 w-fit">
            View Maintenance Queue
            <ArrowRight />
          </Link>
        </motion.div>

        {/* Dashboard Mockup */}
        <motion.div className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[450px]">
            <motion.div className="absolute -top-8 -left-6 z-20 bg-slate-900 text-white border border-slate-700 px-6 py-4 rounded-[2rem] shadow-2xl font-bold text-sm flex items-center gap-3">
              <ShieldAlert className="text-rose-400" />
              Structural Risk: High
            </motion.div>

            <motion.div className="absolute -bottom-8 -right-6 z-20 bg-cyan-500 text-slate-950 px-6 py-4 rounded-[2rem] shadow-2xl font-bold text-sm">
              AI Forecast: 12 days to failure ⚡
            </motion.div>
            
               {/* Main Mockup Container - Cinematic Green (cite: Video 0:01) */}
               <div className="rounded-[3.5rem] overflow-hidden border-[12px] border-white/5 shadow-[0_0_80px_rgba(16,185,129,0.15)] bg-slate-900/20 backdrop-blur-sm">
              <img 
                src="/avatars/School.jpg" 
                alt="Farmer Dashboard" 
                className="w-full grayscale-[30%] hover:grayscale-0 transition-all duration-700 object-cover min-h-[500px]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
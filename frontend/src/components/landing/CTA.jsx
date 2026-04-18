import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, ArrowUpRight } from 'lucide-react';

function CTA() {
  return (
    <section className="relative  pb-24 px-6 bg-white overflow-hidden text-center flex flex-col items-center justify-center">
      
      {/* THE BACKGROUND: Clean Soft Glows (cite: copy.mp4, 0:01) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft Emerald Aura on White */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-slate-100 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-7xl mx-auto relative z-10 w-full"
      >
        {/* Modern Badge (cite: copy.mp4, 0:14) */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-6 py-2 rounded-full mb-12">
          <Zap size={14} className="text-emerald-600 fill-emerald-600 animate-pulse" />
          <span className="text-emerald-600 font-[900] tracking-[0.3em] text-[10px] uppercase italic">Ready to Lead?</span>
        </div>

        {/* MASSIVE BLACK TYPOGRAPHY: Tight & Bold (cite: screen.png) */}
        <div className="relative mb-20">
          <h2 className="text-7xl md:text-[8rem] lg:text-[10rem] font-[900] text-[#020503] leading-[0.8] tracking-[-0.07em] mb-16 uppercase">
            READY TO <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700 italic px-4">FARM?</span>
          </h2>
        </div>
        
        {/* Action Row */}
        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
          {/* Main Action - Dark Button on White Bg */}
          <Link 
            to="/login"
            className="group relative bg-[#020503] hover:bg-emerald-600 text-white px-10 py-5 rounded-full font-[900] text-xl transition-all hover:scale-110 flex items-center gap-4 shadow-xl shadow-black/10"
          >
            Login
            <div className="bg-white/10 p-1.5 rounded-full group-hover:rotate-45 transition-transform duration-500">
              <ArrowUpRight size={22} strokeWidth={3} />
            </div>
          </Link>

          {/* Secondary Action - Ghost Button */}
          <button className="px-10 py-5 rounded-full font-[900] text-xl text-[#020503] border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all tracking-tight uppercase">
            See More
          </button>
        </div>

      </motion.div>
    </section>
  );
}

export default CTA;
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// Pehle wale import mein MapPin add kar diya hai
import { Building2, ShieldAlert, Activity, LayoutList, Wrench, BarChart3, Clock, CheckCircle2, Search, MapPin } from 'lucide-react';

const capabilities = [
  {
    title: "Structural Forecaster",
    description: "AI-driven detection of concrete degradation and slab stress.",
    icon: Building2,
    url: "#"
  },
  {
    title: "Impact Priority",
    description: "Automatic ranking based on student usage and facility type.",
    icon: LayoutList,
    url: "#"
  },
  {
    title: "60-Day Horizon",
    description: "Failure window predictions for plumbing and electrical grids.",
    icon: Clock,
    url: "#"
  },
  {
    title: "2-Min Staff Audit",
    description: "Structured weekly health reports with zero free-text friction.",
    icon: CheckCircle2,
    url: "#"
  },
  {
    title: "GPS Verification",
    description: "Contractor resolution audits with geo-tagged documentation.",
    icon: MapPin,
    url: "#"
  },
  {
    title: "SLA Tracking",
    description: "Real-time monitoring of complaint resolution timelines.",
    icon: Activity,
    url: "#"
  },
  {
    title: "DEO Dashboard",
    description: "Centralized district-wide asset health visualization.",
    icon: BarChart3,
    url: "#"
  },
  {
    title: "Predictive Risk",
    description: "Identify high-risk zones using building age and weather data.",
    icon: ShieldAlert,
    url: "#"
  }
];

// Duplicate for seamless scroll
const extendedCapabilities = [...capabilities, ...capabilities];

function GovSchemes() {
  return (
    <section className="bg-[#040705] grid-lines-dark py-24 border-y border-blue-500/10 overflow-hidden relative">
      {/* Background Decor - Subtle Blue Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 mb-12 relative z-20">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-400 text-[12px] font-black uppercase tracking-[0.2em]">Live Intelligence</span>
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-[900] text-white tracking-tighter uppercase leading-[1]">
          Engine <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 italic">Capabilities.</span>
        </h2>
      </div>

      <div className="relative z-10 flex overflow-hidden">
        {/* Gradient Overlays for smooth edges */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#040705] to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#040705] to-transparent z-20 pointer-events-none" />

        <div className="flex animate-infinite-scroll pause-on-hover whitespace-nowrap py-4">
          {extendedCapabilities.map((item, index) => (
            <div 
              key={index}
              className="flex-none inline-flex items-center gap-6 px-10 py-8 mx-4 bg-[#0f172a]/40 border border-blue-500/10 rounded-[2.5rem] backdrop-blur-xl hover:border-blue-500/40 hover:bg-[#0f172a]/60 transition-all duration-500 group cursor-pointer min-w-[400px]"
            >
              <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500 border border-blue-500/10 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                <item.icon size={32} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-white font-[900] text-xl leading-tight uppercase tracking-tight mb-2">
                  {item.title}
                </h4>
                <p className="text-slate-400 text-sm font-bold whitespace-normal max-w-[250px] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes infinite-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 40s linear infinite;
        }
        .pause-on-hover:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}

export default GovSchemes;

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
// Pehle wale import mein MapPin add kar diya hai
import { Building2, ShieldAlert, Activity, LayoutList, Wrench, BarChart3, Clock, CheckCircle2, Search, MapPin } from 'lucide-react';

const capabilities = [
  {
    titleKey: "gs.cap_1_title",
    descKey: "gs.cap_1_desc",
    icon: Building2,
    url: "#"
  },
  {
    titleKey: "gs.cap_2_title",
    descKey: "gs.cap_2_desc",
    icon: LayoutList,
    url: "#"
  },
  {
    titleKey: "gs.cap_3_title",
    descKey: "gs.cap_3_desc",
    icon: Clock,
    url: "#"
  },
  {
    titleKey: "gs.cap_4_title",
    descKey: "gs.cap_4_desc",
    icon: CheckCircle2,
    url: "#"
  },
  {
    titleKey: "gs.cap_5_title",
    descKey: "gs.cap_5_desc",
    icon: MapPin,
    url: "#"
  },
  {
    titleKey: "gs.cap_6_title",
    descKey: "gs.cap_6_desc",
    icon: Activity,
    url: "#"
  },
  {
    titleKey: "gs.cap_7_title",
    descKey: "gs.cap_7_desc",
    icon: BarChart3,
    url: "#"
  },
  {
    titleKey: "gs.cap_8_title",
    descKey: "gs.cap_8_desc",
    icon: ShieldAlert,
    url: "#"
  }
];

// Duplicate for seamless scroll
const extendedCapabilities = [...capabilities, ...capabilities];

function GovSchemes() {
  const { t } = useLanguage();

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
            <span className="text-blue-400 text-[12px] font-black uppercase tracking-[0.2em]">{t('gs.live_intelligence')}</span>
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-[900] text-white tracking-tighter uppercase leading-[1]">
          {t('gs.engine')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 italic">{t('gs.capabilities')}</span>
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
                  {t(item.titleKey)}
                </h4>
                <p className="text-slate-400 text-sm font-bold whitespace-normal max-w-[250px] leading-relaxed">
                  {t(item.descKey)}
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

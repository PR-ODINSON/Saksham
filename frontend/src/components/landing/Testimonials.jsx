import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Building2, Wrench, ShieldAlert, BarChart3, Users } from 'lucide-react';

const gridData = [
  {
    title: "District Officers",
    desc: "A centralized dashboard for DEOs to monitor prioritized maintenance queues based on real-world student impact scores.",
    icon: Building2,
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000",
    span: "md:col-span-2 md:row-span-2"
  },
  {
    title: "Field Reporting",
    desc: "Optimized mobile forms for school staff to complete structural health checks in under 2 minutes.",
    icon: Users,
    img: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1000",
    span: "md:col-span-1 md:row-span-1"
  },
  {
    title: "Contractor Sync",
    desc: "Automated work orders with before/after verification and GPS-tagged resolution audits.",
    icon: Wrench,
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000",
    span: "md:col-span-1 md:row-span-1"
  },
  {
    title: "Predictive Analytics",
    desc: "AI models forecasting failure windows for plumbing, electrical, and structural systems 30-60 days in advance.",
    icon: BarChart3,
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000",
    span: "md:col-span-3 md:row-span-1"
  }
];

function InteractiveBento() {
  return (
    <section id="use-cases" className="py-32 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto mb-[-120px] mt-[-140px]">
        
        {/* Header - Aligned with Saksham Branding */}
        <div className="mb-20">
          <h2 className="text-4xl md:text-[4.2rem] font-[900] text-[#0f172a] tracking-[-0.05em] leading-[1] uppercase">
            Built for Every <br /> <span className="text-blue-600 italic">Institution.</span>
          </h2>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[350px]">
          {gridData.map((item, i) => (
            <motion.div
              key={i}
              whileHover="hover"
              initial="initial"
              className={`relative group overflow-hidden rounded-[3rem] border border-slate-100 cursor-pointer ${item.span}`}
            >
              {/* Background Image (Maintenance Focused) */}
              <motion.img
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.05 }
                }}
                transition={{ duration: 0.6 }}
                src={item.img}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover z-0 filter grayscale-[20%] group-hover:grayscale-0 transition-all"
              />

              {/* White Paragraph Box Reveal on Hover (Z-Index Fix included) */}
              <motion.div
                variants={{
                  initial: { y: "100%", opacity: 0 },
                  hover: { y: 0, opacity: 1 }
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-4 bottom-4 z-50 bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-white/20"
              >
                <div className="flex justify-between items-start mb-4">
                  {/* Icon changed from Green to Blue */}
                  <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-600">
                    <item.icon size={24} strokeWidth={2.5} />
                  </div>
                  <div className="bg-blue-600 p-2 rounded-full text-white shadow-lg shadow-blue-500/20">
                    <ArrowUpRight size={20} strokeWidth={3} />
                  </div>
                </div>
                
                <h4 className="text-[#0f172a] font-[900] text-2xl tracking-tighter uppercase mb-2">
                  {item.title}
                </h4>
                <p className="text-slate-600 text-sm font-bold leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>

              {/* Dark overlay for initial visibility */}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors z-10" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default InteractiveBento;
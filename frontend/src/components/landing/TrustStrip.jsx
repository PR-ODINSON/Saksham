import React from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Quote, Building2 } from 'lucide-react';

function Testimonials() {
  const reviews = [
    { 
      name: 'Dr. Rajesh Mehta', 
      role: 'District Education Officer',
      date: 'March 18, 2026', 
      text: 'The impact prioritization logic is brilliant. We resolved critical plumbing issues in 12 girls’ schools before the exams started. Saksham is a lifesaver for our budget.' 
    },
    { 
      name: 'Amit Shahani', 
      role: 'Operations Manager',
      date: 'April 02, 2026', 
      text: 'Earlier, we were just reacting to complaints. Now, with the 60-day failure forecast, we schedule maintenance during holidays. Efficiency has increased by 70%.' 
    }
  ];

  return (
    <section id="testimonials" className="py-32 px-6 bg-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header - Terminal Style (consistent with Footer) */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
              <span className="text-blue-600 font-[900] tracking-[0.3em] text-[10px] uppercase">Field Impact Audit</span>
            </div>
            <h2 className="text-6xl md:text-[6.5rem] font-[900] text-[#0f172a] tracking-[-0.05em] leading-[0.85] uppercase">
              Voices of <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 italic">Authority.</span>
            </h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-right"
          >
            <p className="text-6xl font-[900] text-[#0f172a] tracking-tighter">30k+</p>
            <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em]">Schools Monitored</p>
          </motion.div>
        </div>

        {/* Review Cards - Institutional Block Design */}
        <div className="grid md:grid-cols-2 gap-12">
          {reviews.map((r, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10, boxShadow: '24px 24px 0 rgba(30, 58, 138, 0.1)' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-12 rounded-[3.5rem] border-[3px] border-[#0f172a] shadow-[16px 16px 0 #0f172a] transition-all duration-500 relative group"
            >
              {/* Star & User Info */}
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h4 className="text-[#0f172a] font-[900] text-2xl tracking-tight uppercase leading-none">{r.name}</h4>
                  <span className="text-blue-600 font-bold text-[10px] uppercase tracking-widest block mt-2">{r.role}</span>
                  <div className="flex gap-1 mt-4">
                    {[...Array(5)].map((_, starIdx) => (
                      <Star key={starIdx} size={16} className="fill-blue-600 text-blue-600" />
                    ))}
                  </div>
                </div>
                <div className="bg-[#f8fafc] px-4 py-2 rounded-xl border-2 border-[#0f172a] text-[#0f172a] font-black text-[10px] uppercase tracking-widest shadow-[4px 4px 0 #0f172a]">
                  {r.date}
                </div>
              </div>

              {/* Review Text */}
              <p className="text-slate-600 text-xl font-bold leading-[1.6] relative z-10">
                "{r.text}"
              </p>

              {/* Decor Icon (Consistent with Terminal theme) */}
              <div className="absolute bottom-8 right-10 text-blue-600/10 font-black pointer-events-none select-none">
                <Building2 size={120} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
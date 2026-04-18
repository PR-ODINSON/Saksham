import React from 'react';

function PageHeader({ icon, title, subtitle, className = '', variant = 'default' }) {
  const isCinematic = variant === 'cinematic';
  
  return (
    <div className={`text-center mb-12 ${className}`}>
      {icon && <div className={`text-7xl mb-6 ${isCinematic ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ''}`}>{icon}</div>}
      <h1 className={`${
        isCinematic 
          ? 'text-5xl md:text-7xl lg:text-8xl font-black text-emerald-900 leading-[0.9] tracking-tighter mb-6' 
          : 'text-3xl md:text-4xl lg:text-5xl font-black text-emerald-900 tracking-tight mb-3'
      }`}>
        {title}
      </h1>
      {subtitle && (
        <p className={`${
          isCinematic 
            ? 'text-xl text-emerald-900/60 max-w-2xl mx-auto leading-relaxed font-medium' 
            : 'text-lg text-emerald-900/40 max-w-2xl mx-auto font-medium'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default PageHeader;


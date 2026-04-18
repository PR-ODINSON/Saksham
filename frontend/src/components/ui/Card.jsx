import React from 'react';

function Card({
  children,
  className = '',
  padding = 'lg',
  shadow = 'md',
  hover = false,
  bordered = false
}) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const hoverClass = hover ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300' : '';
  const borderClass = bordered ? 'border-2 border-gray-200' : '';

  return (
    <div
      className={`bg-white rounded-2xl ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClass} ${borderClass} ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;

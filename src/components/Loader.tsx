import React from 'react';
import { motion } from 'motion/react';

export const Loader = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`relative ${sizes[size]}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="w-full h-full border-2 border-slate-100 border-t-[#AE6965] rounded-full"
      />
    </div>
  );
};

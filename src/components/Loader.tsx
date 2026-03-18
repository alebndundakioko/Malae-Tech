import React from 'react';
import { motion } from 'motion/react';

export const Loader = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`relative ${sizes[size]} flex items-center justify-center`}>
      {/* Outer rotating ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-full"
      />
      
      {/* Middle pulsing ring */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-2 bg-accent/10 rounded-full"
      />
      
      {/* Inner floating dots */}
      <div className="relative flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, -8, 0],
              backgroundColor: ['#666D59', '#8F9681', '#666D59']
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              delay: i * 0.2,
              ease: "easeInOut" 
            }}
            className="w-2 h-2 rounded-full"
          />
        ))}
      </div>
    </div>
  );
};

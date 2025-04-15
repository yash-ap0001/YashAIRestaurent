import React from 'react';

interface HotelMascotProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * A cute chef mascot for our hotel application
 * Used in loading indicators and branding elements
 */
const HotelMascot: React.FC<HotelMascotProps> = ({ 
  size = 100, 
  animated = false,
  className = '',
}) => {
  // Animation classes
  const animationClasses = animated 
    ? 'animate-bounce [animation-duration:2s] hover:animate-none transition-transform' 
    : '';
    
  // Face animation for the eyes (blinking)
  const eyeAnimation = animated 
    ? 'animate-pulse [animation-duration:3s]' 
    : '';
  
  return (
    <div 
      className={`relative select-none ${animationClasses} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Chef hat */}
      <div 
        className="absolute bg-white rounded-t-full"
        style={{
          width: size * 0.7,
          height: size * 0.4,
          top: 0,
          left: size * 0.15,
          border: `${size * 0.03}px solid #e2e2e2`,
        }}
      >
        {/* Hat band */}
        <div 
          className="absolute bg-primary/20 rounded-full"
          style={{
            width: size * 0.7,
            height: size * 0.1,
            bottom: size * 0.05,
          }}
        />
        
        {/* Hat top puff */}
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: size * 0.25,
            height: size * 0.25,
            top: -size * 0.15,
            left: size * 0.22,
            border: `${size * 0.02}px solid #e2e2e2`,
          }}
        />
      </div>
      
      {/* Face - circular with skin tone */}
      <div 
        className="absolute rounded-full bg-amber-200"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          top: size * 0.35,
          left: size * 0.2,
        }}
      >
        {/* Eyes */}
        <div 
          className={`absolute rounded-full bg-black ${eyeAnimation}`}
          style={{
            width: size * 0.08,
            height: size * 0.08,
            top: size * 0.15,
            left: size * 0.15,
          }}
        />
        <div 
          className={`absolute rounded-full bg-black ${eyeAnimation}`}
          style={{
            width: size * 0.08,
            height: size * 0.08,
            top: size * 0.15,
            right: size * 0.15,
          }}
        />
        
        {/* Smile */}
        <div 
          className="absolute bg-transparent"
          style={{
            width: size * 0.3,
            height: size * 0.15,
            bottom: size * 0.15,
            left: size * 0.15,
            borderBottomLeftRadius: size * 0.2,
            borderBottomRightRadius: size * 0.2,
            border: 'none',
            borderBottom: `${size * 0.04}px solid black`,
          }}
        />
        
        {/* Rosy cheeks */}
        <div 
          className="absolute rounded-full bg-red-300/60"
          style={{
            width: size * 0.1,
            height: size * 0.05,
            top: size * 0.25,
            left: size * 0.05,
          }}
        />
        <div 
          className="absolute rounded-full bg-red-300/60"
          style={{
            width: size * 0.1,
            height: size * 0.05,
            top: size * 0.25,
            right: size * 0.05,
          }}
        />
      </div>
      
      {/* Chef coat/uniform */}
      <div 
        className="absolute bg-white rounded-b-full"
        style={{
          width: size * 0.7,
          height: size * 0.4,
          top: size * 0.6,
          left: size * 0.15,
          borderTop: `${size * 0.03}px solid #e2e2e2`,
        }}
      >
        {/* Buttons */}
        <div 
          className="absolute rounded-full bg-primary"
          style={{
            width: size * 0.08,
            height: size * 0.08,
            top: size * 0.1,
            left: size * 0.2,
          }}
        />
        <div 
          className="absolute rounded-full bg-primary"
          style={{
            width: size * 0.08,
            height: size * 0.08,
            top: size * 0.1,
            right: size * 0.2,
          }}
        />
      </div>
    </div>
  );
};

export default HotelMascot;
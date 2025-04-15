import React from 'react';

interface MascotProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const HotelMascot: React.FC<MascotProps> = ({ 
  size = 100, 
  className = '',
  animated = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Animation definitions */}
      {animated && (
        <defs>
          <style>
            {`
              @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
                100% { transform: translateY(0px); }
              }
              @keyframes wiggle {
                0% { transform: rotate(0deg); }
                25% { transform: rotate(5deg); }
                75% { transform: rotate(-5deg); }
                100% { transform: rotate(0deg); }
              }
              @keyframes blink {
                0% { transform: scaleY(1); }
                10% { transform: scaleY(0.1); }
                20% { transform: scaleY(1); }
                100% { transform: scaleY(1); }
              }
              @keyframes wave {
                0% { transform: rotate(0deg); }
                20% { transform: rotate(-20deg); }
                40% { transform: rotate(10deg); }
                60% { transform: rotate(-10deg); }
                80% { transform: rotate(5deg); }
                100% { transform: rotate(0deg); }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </defs>
      )}

      {/* Body Group (floating animation) */}
      <g style={animated ? { animation: 'float 3s ease-in-out infinite' } : {}}>
        {/* Chef Hat */}
        <ellipse cx="100" cy="60" rx="35" ry="25" fill="white" />
        <rect x="65" y="60" width="70" height="20" fill="white" />
        
        {/* Head */}
        <circle cx="100" cy="95" r="35" fill="#FFD7B5" />
        
        {/* Face */}
        <g style={animated ? { animation: 'blink 4s infinite' } : {}}>
          <ellipse cx="85" cy="85" rx="5" ry="3" fill="#333" /> {/* Left Eye */}
          <ellipse cx="115" cy="85" rx="5" ry="3" fill="#333" /> {/* Right Eye */}
        </g>
        
        {/* Smiling Mouth */}
        <path d="M85,105 Q100,120 115,105" fill="none" stroke="#333" strokeWidth="2" />
        
        {/* Chef Uniform Body */}
        <rect x="70" y="130" width="60" height="50" rx="5" fill="#FFFFFF" />
        <rect x="85" y="130" width="30" height="50" fill="#FFFFFF" />
        
        {/* Buttons */}
        <circle cx="100" cy="140" r="3" fill="#333" />
        <circle cx="100" cy="155" r="3" fill="#333" />
        <circle cx="100" cy="170" r="3" fill="#333" />
        
        {/* Left Arm waving */}
        <g style={animated ? { animation: 'wave 2s infinite', transformOrigin: '75px 140px' } : {}}>
          <rect x="55" y="135" width="20" height="45" rx="10" fill="#FFFFFF" />
        </g>
        
        {/* Right Arm with Spoon */}
        <g style={animated ? { animation: 'wiggle 3s infinite' } : {}}>
          <rect x="125" y="135" width="20" height="45" rx="10" fill="#FFFFFF" />
          <rect x="142" y="135" width="5" height="30" rx="2" fill="#A0522D" />
          <ellipse cx="145" cy="170" rx="10" ry="5" fill="#A0522D" />
        </g>
        
        {/* Neck/Collar */}
        <rect x="90" y="125" width="20" height="10" rx="5" fill="#FFFFFF" />
        
        {/* Hotel Name Badge */}
        <rect x="85" y="135" width="30" height="10" rx="2" fill="#FF6347" />
        <text x="100" y="142.5" fontSize="8" textAnchor="middle" fill="white" fontWeight="bold">YASH</text>
      </g>

      {/* Optional Spinning Plate/Dish for loading animation */}
      {animated && (
        <g style={{ animation: 'spin 2s linear infinite', transformOrigin: 'center' }}>
          <circle cx="100" cy="200" r="15" fill="#E6E6FA" opacity="0.8" />
          <circle cx="100" cy="200" r="10" fill="#FF6347" opacity="0.6" />
        </g>
      )}
    </svg>
  );
};

export default HotelMascot;
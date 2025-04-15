import React from 'react';
import HotelMascot from './HotelMascot';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false,
  className = ''
}) => {
  const mascotSize = size === 'sm' ? 60 : size === 'md' ? 100 : 150;
  
  const containerClasses = `
    flex flex-col items-center justify-center
    ${fullScreen ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : ''}
    ${className}
  `;
  
  const messageClasses = `
    mt-4 text-center font-medium
    ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}
  `;
  
  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <div className="relative">
        <HotelMascot size={mascotSize} animated={true} />
        
        {/* Loading indicator circle around the mascot */}
        <div 
          className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" 
          style={{ 
            width: mascotSize, 
            height: mascotSize, 
            borderRadius: mascotSize / 2 
          }}
        />
      </div>
      
      {message && (
        <p className={messageClasses}>
          {message}
        </p>
      )}
      
      {/* Add loading dots animation */}
      <div className="flex space-x-1 mt-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
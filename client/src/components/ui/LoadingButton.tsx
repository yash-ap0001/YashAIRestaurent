import React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonProps } from '@/components/ui/button';
import HotelMascot from './HotelMascot';

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  isLoading = false,
  loadingText = 'Loading...',
  disabled,
  ...props
}) => {
  return (
    <Button 
      {...props} 
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="relative w-5 h-5">
            <HotelMascot size={20} animated={true} />
          </div>
          {loadingText && <span>{loadingText}</span>}
        </div>
      ) : (
        children
      )}
    </Button>
  );
};

export default LoadingButton;
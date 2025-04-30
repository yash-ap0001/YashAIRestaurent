import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  className?: string;
  showCloseButton?: boolean;
  blurIntensity?: number;
  overlayOpacity?: number;
}

export function MaterialDialog({
  isOpen,
  onClose,
  children,
  title,
  description,
  icon,
  footer,
  width = "max-w-4xl",
  className,
  showCloseButton = true,
  blurIntensity = 8,
  overlayOpacity = 70
}: MaterialDialogProps) {
  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${overlayOpacity / 100})`,
          backdropFilter: `blur(${blurIntensity}px)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px)`
        }}
        onClick={onClose}
      />
      
      {/* Dialog Content */}
      <div 
        className={cn(
          "relative w-full bg-gray-900 rounded-lg shadow-2xl overflow-hidden z-10", 
          width,
          className
        )}
        style={{
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 38px rgba(0, 0, 0, 0.3), 0 9px 12px rgba(0, 0, 0, 0.22)'
        }}
      >
        {/* Dialog Header - optional based on title */}
        {(title || description) && (
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {icon && (
                  <div className="h-8 w-8 bg-purple-600/20 rounded-full flex items-center justify-center">
                    {icon}
                  </div>
                )}
                {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
              </div>
              {showCloseButton && (
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {description && (
              <p className="mt-2 text-gray-300 text-sm">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Dialog Content */}
        <div className="p-4">
          {children}
        </div>

        {/* Dialog Footer - optional */}
        {footer && (
          <div className="p-4 bg-black/20 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Create a simple voice control context for now
type VoiceControlContextType = {
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  isListening: boolean;
  toggleListening: () => void;
};

// Create the context
const VoiceControlContext = createContext<VoiceControlContextType | null>(null);

// Basic voice control provider 
export const VoiceControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simple state management 
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  // Basic toggle functionality
  const toggleListening = () => {
    setIsListening(!isListening);
  };
  
  // Context value
  const contextValue = {
    voiceEnabled,
    setVoiceEnabled,
    isListening,
    toggleListening
  };
  
  return (
    <VoiceControlContext.Provider value={contextValue}>
      {children}
      
      {/* Global Voice Control Button */}
      <div className="fixed bottom-16 right-4 z-40">
        <Button
          size="icon"
          variant={isListening ? "default" : "outline"}
          className={isListening ? "bg-blue-600 hover:bg-blue-700" : ""}
          onClick={toggleListening}
        >
          {isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      </div>
    </VoiceControlContext.Provider>
  );
};

// Hook to use the voice control context
export const useVoiceControlContext = () => {
  const context = useContext(VoiceControlContext);
  
  if (!context) {
    throw new Error('useVoiceControlContext must be used within a VoiceControlProvider');
  }
  
  return context;
};
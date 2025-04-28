import React, { createContext, useContext, useEffect, useState } from 'react';
import { useVoiceControl } from '@/hooks/use-voice-control';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface VoiceControlContextType {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  processCommand: (command: string) => Promise<void>;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  language: string;
  setLanguage: (lang: string) => void;
  accentMode: boolean;
  setAccentMode: (enabled: boolean) => void;
}

const VoiceControlContext = createContext<VoiceControlContextType | null>(null);

export const VoiceControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load settings from local storage
  const [voiceEnabled, setVoiceEnabled] = useLocalStorage('voiceEnabled', true);
  const [language, setLanguage] = useLocalStorage('voiceLanguage', 'en-IN');
  const [accentMode, setAccentMode] = useLocalStorage('accentMode', true);
  const [volume, setVolume] = useLocalStorage('voiceVolume', 80);
  
  // Initialize voice control hook with stored settings
  const voiceControl = useVoiceControl({
    enabled: true,
    language,
    accentMode,
    voiceEnabled,
    volume
  });
  
  // Provide context value
  const contextValue: VoiceControlContextType = {
    ...voiceControl,
    voiceEnabled,
    setVoiceEnabled,
    language,
    setLanguage,
    accentMode,
    setAccentMode
  };

  return (
    <VoiceControlContext.Provider value={contextValue}>
      {children}
      
      {/* Global Voice Control Button */}
      <div className="fixed bottom-16 right-4 z-40">
        <Button
          size="icon"
          variant={voiceControl.isListening ? "default" : "outline"}
          className={voiceControl.isListening ? "bg-blue-600 hover:bg-blue-700" : ""}
          onClick={voiceControl.toggleListening}
        >
          {voiceControl.isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      </div>
    </VoiceControlContext.Provider>
  );
};

export const useVoiceControlContext = () => {
  const context = useContext(VoiceControlContext);
  
  if (!context) {
    throw new Error('useVoiceControlContext must be used within a VoiceControlProvider');
  }
  
  return context;
};
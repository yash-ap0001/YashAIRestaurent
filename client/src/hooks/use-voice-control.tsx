import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';

interface VoiceControlOptions {
  enabled?: boolean;
  language?: string;
  accentMode?: boolean;
  voiceEnabled?: boolean;
  volume?: number;
}

export const useVoiceControl = (options: VoiceControlOptions = {}) => {
  const {
    enabled = true,
    language = 'en-IN',
    accentMode = true,
    voiceEnabled = true,
    volume = 80
  } = options;
  
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synth = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const [location, setLocation] = useLocation();
  
  // Initialize speech recognition
  useEffect(() => {
    if (!enabled) return;
    
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      // @ts-ignore - TypeScript doesn't have these types by default
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcriptResult = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');
        
        setTranscript(transcriptResult);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          toast({
            title: 'Microphone Access Denied',
            description: 'Please enable microphone access to use voice controls.',
            variant: 'destructive',
          });
        }
      };
      
      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    } else {
      toast({
        title: 'Voice Control Not Available',
        description: 'Your browser does not support speech recognition.',
        variant: 'destructive',
      });
    }
  }, [enabled, language, toast]);
  
  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      
      toast({
        title: 'Voice Control Active',
        description: 'Speak a command...',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, [toast]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, []);
  
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Process voice command
  const processCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const response = await apiRequest('POST', '/api/voice-assistant/process', {
        command,
        context: { currentPage: location }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Handle navigation commands
        if (result.action === 'navigate' && result.path) {
          setLocation(result.path);
        }
        
        // Handle data refresh commands
        if (result.action === 'refresh') {
          queryClient.invalidateQueries();
        }
        
        // Handle specific API calls
        if (result.action === 'api_call' && result.endpoint) {
          await apiRequest(result.method || 'GET', result.endpoint, result.data);
          // Refresh relevant data
          if (result.invalidateQueries) {
            result.invalidateQueries.forEach((query: string) => {
              queryClient.invalidateQueries({ queryKey: [query] });
            });
          }
        }
        
        // Speak response if voice is enabled
        if (voiceEnabled && result.response) {
          speak(result.response);
        }
        
        // Show toast notification
        toast({
          title: 'Voice Command',
          description: result.response || 'Command processed successfully',
          variant: 'default',
        });
      } else {
        // Show error toast
        toast({
          title: 'Command Failed',
          description: result.error || 'Could not process voice command',
          variant: 'destructive',
        });
        
        if (voiceEnabled) {
          speak('Sorry, I could not process that command. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      toast({
        title: 'Command Error',
        description: 'An error occurred while processing your voice command',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  }, [location, setLocation, voiceEnabled, toast]);

  // Process transcript when it changes and user stops speaking
  useEffect(() => {
    if (!transcript || !isListening || isProcessing) return;
    
    const timer = setTimeout(() => {
      processCommand(transcript);
    }, 1500); // Wait 1.5 seconds after user stops speaking to process command
    
    return () => clearTimeout(timer);
  }, [transcript, isListening, isProcessing, processCommand]);

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if (!synth.current) return;
    
    // Cancel any ongoing speech
    synth.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume / 100;
    utterance.lang = language;
    
    synth.current.speak(utterance);
  }, [volume, language]);

  return {
    isListening,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    processCommand,
    speak
  };
};
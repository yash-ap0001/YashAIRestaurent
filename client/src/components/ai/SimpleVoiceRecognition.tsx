import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecognitionProps {
  onResult: (result: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

/**
 * SimpleVoiceRecognition - A standalone component that handles just voice recognition
 * without any other dependencies or complex state management
 */
const SimpleVoiceRecognition: React.FC<VoiceRecognitionProps> = ({
  onResult,
  onError,
  autoStart = false
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping recognition on unmount', err);
        }
      }
    };
  }, []);
  
  // Initialize recognition on mount if autoStart is true
  useEffect(() => {
    if (autoStart) {
      startListening();
    }
  }, [autoStart]);
  
  const startListening = () => {
    // Don't start if already listening
    if (isListening) return;
    
    // First check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const errorMessage = 'Your browser does not support speech recognition';
      console.error(errorMessage);
      toast({
        title: 'Speech Recognition Not Supported',
        description: errorMessage,
        variant: 'destructive'
      });
      if (onError) onError(errorMessage);
      return;
    }
    
    try {
      // Create a new recognition instance
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      // Configure recognition
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      
      // Set up event handlers
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        try {
          const speechResult = event.results[0][0].transcript;
          console.log('Speech recognition result:', speechResult);
          onResult(speechResult);
        } catch (error) {
          console.error('Error processing speech result:', error);
          if (onError) onError('Error processing speech result');
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      
      recognition.onerror = (event: any) => {
        const errorMessage = `Speech recognition error: ${event.error}`;
        console.error(errorMessage, event);
        setIsListening(false);
        recognitionRef.current = null;
        
        if (event.error !== 'aborted') {
          toast({
            title: 'Speech Recognition Error',
            description: `Error: ${event.error}. Please try again.`,
            variant: 'destructive'
          });
          if (onError) onError(errorMessage);
        }
      };
      
      // Start the recognition
      recognition.start();
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      toast({
        title: 'Speech Recognition Error',
        description: 'Could not start speech recognition',
        variant: 'destructive'
      });
      if (onError) onError('Failed to initialize speech recognition');
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  };
  
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  return (
    <Button
      type="button"
      size="sm"
      variant={isListening ? "default" : "secondary"}
      onClick={toggleListening}
      className={isListening ? "bg-primary text-white animate-pulse" : ""}
    >
      {isListening ? (
        <>
          <MicOff className="h-4 w-4 mr-2" />
          Stop Listening
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 mr-2" />
          Start Listening
        </>
      )}
    </Button>
  );
};

export default SimpleVoiceRecognition;
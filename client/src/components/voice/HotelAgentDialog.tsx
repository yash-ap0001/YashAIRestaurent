import { useState, useEffect } from "react";
import { useHotelAgentVoice } from "./HotelAgentVoice";
import { MaterialDialog } from "@/components/ui/material-dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface HotelAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HotelAgentDialog({ isOpen, onClose }: HotelAgentDialogProps) {
  const [conversation, setConversation] = useState<{ type: 'user' | 'agent', text: string }[]>([]);
  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    stopSpeaking,
    processVoiceCommand
  } = useHotelAgentVoice();

  // Update conversation when user speaks
  useEffect(() => {
    if (transcript && !isListening) {
      // Add user message to conversation
      setConversation(prev => [...prev, { type: 'user', text: transcript }]);
      
      // Process the command and get a response
      const response = processVoiceCommand(transcript);
      
      // Add agent response to conversation
      setConversation(prev => [...prev, { type: 'agent', text: response }]);
    }
  }, [transcript, isListening]);

  // Clean up speech and recognition when dialog closes
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  // Start with a greeting when the dialog opens
  useEffect(() => {
    if (isOpen && conversation.length === 0) {
      const greeting = "Hello! I'm your hotel management assistant. How can I help you today? You can ask about reservations, revenue, inventory, or staff.";
      setConversation([{ type: 'agent', text: greeting }]);
      setTimeout(() => {
        processVoiceCommand(greeting);
      }, 300);
    }
  }, [isOpen]);

  return (
    <MaterialDialog
      isOpen={isOpen}
      onClose={() => {
        stopListening();
        stopSpeaking();
        onClose();
      }}
      title="Hotel Management Assistant"
      description="Ask me anything about your hotel operations"
      icon={<Volume2 className="h-6 w-6 text-primary" />}
      width="max-w-xl"
      footer={
        <div className="flex justify-between w-full">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setConversation([]);
              const greeting = "Hello! I'm your hotel management assistant. How can I help you today?";
              setConversation([{ type: 'agent', text: greeting }]);
              processVoiceCommand(greeting);
            }}
          >
            Restart Conversation
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col space-y-4">
        {/* Conversation history */}
        <div className="bg-black/20 backdrop-blur-sm border border-gray-800 rounded-lg p-4 h-80 overflow-y-auto flex flex-col space-y-3">
          {conversation.map((message, index) => (
            <div 
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-primary/30 text-white' 
                    : 'bg-gray-800/50 text-white'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          
          {isListening && (
            <div className="flex justify-start">
              <div className="bg-gray-800/50 text-white p-3 rounded-lg flex items-center space-x-2">
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></span>
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></span>
                <span className="text-xs ml-2">Listening...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Voice controls */}
        <div className="flex justify-center items-center space-x-4">
          <Button
            size="lg"
            className={`rounded-full w-14 h-14 p-0 flex items-center justify-center ${isListening ? 'bg-red-600 hover:bg-red-700' : ''}`}
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
          >
            {isListening ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          
          <Button
            size="lg"
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else if (conversation.length > 0) {
                // Replay the last agent message
                const lastAgentMessage = [...conversation]
                  .reverse()
                  .find(msg => msg.type === 'agent');
                  
                if (lastAgentMessage) {
                  processVoiceCommand(lastAgentMessage.text);
                }
              }
            }}
          >
            {isSpeaking ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          {isListening 
            ? "I'm listening... Speak now" 
            : "Click the microphone and ask about your hotel business"
          }
        </div>
        
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400">
            Try asking about: 
            <span className="font-medium text-primary"> reservations</span>, 
            <span className="font-medium text-primary"> revenue</span>, 
            <span className="font-medium text-primary"> staff</span>, 
            <span className="font-medium text-primary"> inventory</span>, 
            <span className="font-medium text-primary"> customer feedback</span>, or 
            <span className="font-medium text-primary"> business recommendations</span>
          </p>
        </div>
      </div>
    </MaterialDialog>
  );
}
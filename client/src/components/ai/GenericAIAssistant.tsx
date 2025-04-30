import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MaterialDialog } from '../ui/material-dialog';
import { Button } from '../ui/button';
import { 
  MessageSquare, Mic, MicOff, Search, 
  RefreshCw, Download, ArrowUpRight,
  BarChart2, Volume2, VolumeX 
} from 'lucide-react';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

/**
 * Configuration options for the GenericAIAssistant
 */
export interface AIAssistantConfig {
  // Basic display settings
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  
  // API endpoints
  dataQueryEndpoint: string;
  chatEndpoint: string;
  
  // Additional custom endpoints
  customCommands?: {
    name: string;
    endpoint: string;
    buttonText: string;
    icon: React.ReactNode;
    processFn?: (data: any) => any;
  }[];
  
  // Voice processing
  voiceEnabled?: boolean;
  welcomeMessage?: string;
  autoListen?: boolean; // Automatically start listening after response
  continueConversation?: boolean; // Continue conversation without manual activation
  
  // Action handlers
  commandPatterns?: {
    pattern: RegExp;
    action: (matches: RegExpMatchArray, speak: (text: string) => void) => void;
  }[];
  
  // Optional data processing
  processQueryResponse?: (data: any) => any;
  processChatResponse?: (data: any) => any;
  
  // UI customization
  maxWidth?: string;
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  accentColor?: string;
  showListeningIndicator?: boolean;
  
  // Additional custom data
  extraDataQueries?: {
    name: string;
    endpoint: string;
    enabled?: boolean;
  }[];
  
  // Storage ID for conversation persistence
  storageKey?: string; // Unique key to store conversation history in localStorage
  maxStoredMessages?: number; // Maximum number of messages to store
}

/**
 * Generic AI Assistant Component that can be configured for different use cases
 */
const GenericAIAssistant: React.FC<AIAssistantConfig> = (props) => {
  const {
    title,
    description,
    icon,
    buttonText,
    dataQueryEndpoint,
    chatEndpoint,
    customCommands = [],
    voiceEnabled = true,
    welcomeMessage = "How can I assist you today?",
    autoListen = false,
    continueConversation = false,
    commandPatterns = [],
    processQueryResponse = (data) => data,
    processChatResponse = (data) => data.response || data.message || data,
    maxWidth = "2xl",
    buttonVariant = "outline",
    accentColor = "primary",
    showListeningIndicator = true,
    extraDataQueries = [],
    storageKey,
    maxStoredMessages = 20
  } = props;
  
  // Get user info if available
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Define message type
  type Message = {
    type: 'user' | 'agent';
    text: string;
    data?: any;
  };
  
  const [conversation, setConversation] = useState<Message[]>([]);
  
  // Audio elements for speech
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const { toast } = useToast();
  
  // Fetch main data
  const { 
    data: mainData, 
    isLoading: isLoadingData, 
    error: dataError, 
    refetch 
  } = useQuery({
    queryKey: [dataQueryEndpoint],
    queryFn: async () => {
      const res = await apiRequest('GET', dataQueryEndpoint);
      const data = await res.json();
      return processQueryResponse(data);
    },
    enabled: isOpen,
    staleTime: 60000, // Consider data fresh for 1 minute
  });
  
  // Setup extra data queries
  const extraDataResults = extraDataQueries.map(query => {
    return useQuery({
      queryKey: [query.endpoint],
      queryFn: async () => {
        const res = await apiRequest('GET', query.endpoint);
        return await res.json();
      },
      enabled: isOpen && (query.enabled !== false),
    });
  });
  
  // Chat request mutation
  const chatMutation = useMutation({
    mutationFn: async (userQuery: string) => {
      const res = await apiRequest('POST', chatEndpoint, { query: userQuery });
      const data = await res.json();
      return processChatResponse(data);
    },
    onSuccess: (response) => {
      // Add AI response to conversation
      const agentMessage: Message = { type: 'agent', text: response };
      const updatedConversation = [...conversation, agentMessage];
      setConversation(updatedConversation);
      
      // Save conversation history if enabled
      if (storageKey) {
        saveConversationHistory(updatedConversation);
      }
      
      // Speak response if voice is enabled
      if (voiceEnabled) {
        speakResponse(response);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Setup custom command mutations
  const customMutations = customCommands.map(command => {
    return useMutation({
      mutationFn: async () => {
        const res = await apiRequest('POST', command.endpoint);
        const data = await res.json();
        return command.processFn ? command.processFn(data) : data;
      },
      onSuccess: (response) => {
        // Add response to conversation
        const agentMessage: Message = { type: 'agent', text: response };
        setConversation(prev => [
          ...prev,
          agentMessage
        ]);
        
        // Speak response if voice is enabled
        if (voiceEnabled) {
          speakResponse(response);
        }
        
        // Refresh data
        refetch();
      },
      onError: (error: Error) => {
        toast({
          title: `${command.name} Error`,
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  });
  
  // Speech synthesis for AI responses
  const speakResponse = useCallback((text: string) => {
    if (!voiceEnabled) return;
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find a good voice
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') && voice.name.includes('Female')
      ) || voices.find(voice => 
        voice.name.includes('Female')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // Set properties
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Add event listeners
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        speechSynthesisRef.current = null;
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        speechSynthesisRef.current = null;
      };
      
      // Save reference and speak
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled]);

  // Process command based on patterns
  const processVoiceCommand = useCallback((command: string): boolean => {
    for (const pattern of commandPatterns) {
      const matches = command.match(pattern.pattern);
      if (matches) {
        pattern.action(matches, speakResponse);
        return true;
      }
    }
    return false;
  }, [commandPatterns, speakResponse]);
  
  // Save conversation to localStorage
  const saveConversationHistory = useCallback((updatedConversation: typeof conversation) => {
    if (!storageKey) return; // Only save if storage key is provided
    
    try {
      // Keep only the last N messages to avoid storage limits
      const limitedHistory = updatedConversation.slice(-maxStoredMessages);
      localStorage.setItem(storageKey, JSON.stringify({
        conversation: limitedHistory,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }, [storageKey, maxStoredMessages]);
  
  // Voice recognition
  const toggleVoiceRecognition = useCallback(() => {
    if (!voiceEnabled) {
      toast({
        title: 'Voice Recognition Disabled',
        description: 'Voice recognition is disabled for this assistant.',
        variant: 'default'
      });
      return;
    }
    
    if (isListening) {
      setIsListening(false);
      return;
    }
    
    setIsListening(true);
    
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: 'Speech Recognition Not Supported',
        description: 'Your browser does not support speech recognition.',
        variant: 'destructive'
      });
      setIsListening(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setQuery(speechResult);
      
      // Automatically submit if confidence is high
      if (event.results[0][0].confidence > 0.8) {
        const userMessage = { type: 'user' as const, text: speechResult };
        const updatedConversation = [...conversation, userMessage];
        setConversation(updatedConversation);
        
        // Save conversation history if enabled
        if (storageKey) {
          saveConversationHistory(updatedConversation);
        }
        
        // Check if this is a command first
        const isCommand = processVoiceCommand(speechResult);
        
        // If not a command, treat as a regular chat query
        if (!isCommand) {
          chatMutation.mutate(speechResult);
        }
        
        setQuery('');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      setIsListening(false);
      toast({
        title: 'Speech Recognition Error',
        description: 'There was an error with speech recognition. Please try again.',
        variant: 'destructive'
      });
    };
    
    recognition.start();
  }, [voiceEnabled, isListening, conversation, processVoiceCommand, 
      chatMutation, toast, setQuery, setIsListening, storageKey, saveConversationHistory]);
  
  // Auto-restart listening after speaking is done
  useEffect(() => {
    if (autoListen && !isSpeaking && !isListening && isOpen && conversation.length > 0) {
      // Restart listening after speaking is done if auto-listen is enabled
      const timer = setTimeout(() => {
        toggleVoiceRecognition();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isListening, autoListen, isOpen, conversation.length, toggleVoiceRecognition]);
  
  // Initialize effects for voice synthesis and dialog behavior
  useEffect(() => {
    if (isOpen) {
      // Fetch initial data
      refetch();
      
      // Initialize speech synthesis voices when dialog opens
      if (voiceEnabled && window.speechSynthesis) {
        const getVoices = () => {
          // This will trigger loading voices
          window.speechSynthesis.getVoices();
        };
        
        // Get voices immediately
        getVoices();
        
        // And also when voices change (some browsers load them asynchronously)
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = getVoices;
        }
      }
      
      // Try to load saved conversation history from localStorage
      if (storageKey && conversation.length === 0) {
        try {
          const savedHistory = localStorage.getItem(storageKey);
          
          if (savedHistory) {
            const { conversation: savedConversation, timestamp } = JSON.parse(savedHistory);
            const historyDate = new Date(timestamp);
            const now = new Date();
            
            // Only use conversation history if it's less than 12 hours old
            if (now.getTime() - historyDate.getTime() < 12 * 60 * 60 * 1000) {
              const userName = user?.fullName?.split(' ')[0] || 'User';
              setConversation(savedConversation);
              
              // Add welcome back message
              const welcomeBack = `Welcome back, ${userName}! We were discussing something earlier. How can I help you now?`;
              const welcomeBackMessage: Message = { type: 'agent', text: welcomeBack };
              setConversation(prev => [...prev, welcomeBackMessage]);
              
              if (voiceEnabled) {
                setTimeout(() => {
                  speakResponse(welcomeBack);
                  
                  // Auto-activate microphone after greeting if auto-listen is enabled
                  if (autoListen) {
                    setTimeout(() => {
                      toggleVoiceRecognition();
                    }, 2000);
                  }
                }, 300);
              }
              
              return; // Skip the regular greeting
            }
          }
        } catch (error) {
          console.error('Error loading conversation history:', error);
        }
      }
      
      // Add welcome message when dialog opens (if no history was loaded)
      if (welcomeMessage && conversation.length === 0) {
        const welcomeMsg: Message = { type: 'agent', text: welcomeMessage };
        setConversation([welcomeMsg]);
        
        if (voiceEnabled) {
          speakResponse(welcomeMessage);
          
          // Auto-activate microphone after greeting if auto-listen is enabled
          if (autoListen) {
            setTimeout(() => {
              toggleVoiceRecognition();
            }, 2000);
          }
        }
      }
    } else {
      // Cancel any speech when dialog closes
      if (voiceEnabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Reset conversation when dialog closes
      setConversation([]);
    }
  }, [isOpen, refetch, welcomeMessage, voiceEnabled, speakResponse, storageKey, 
      conversation.length, autoListen, toggleVoiceRecognition, user]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    // Add user query to conversation
    const userMessage: Message = { type: 'user', text: query };
    setConversation(prev => [...prev, userMessage]);
    
    // Save conversation history if enabled
    if (storageKey) {
      saveConversationHistory([...conversation, userMessage]);
    }
    
    // Check if this is a command first
    const isCommand = processVoiceCommand(query);
    
    // If not a command, send to AI
    if (!isCommand) {
      chatMutation.mutate(query);
    }
    
    // Clear input
    setQuery('');
  };
  
  // Export data to JSON function is defined below
  
  // Export data to JSON
  const exportData = () => {
    if (!mainData) return;
    
    const dataStr = JSON.stringify(mainData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `ai-assistant-data-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: 'Data Exported',
      description: 'Your data has been exported successfully.'
    });
  };
  
  return (
    <>
      {/* Open button */}
      <Button
        variant={buttonVariant}
        className="flex items-center gap-2 bg-black/20 backdrop-blur-sm border-primary/20 hover:bg-black/40 hover:border-primary/30"
        onClick={() => setIsOpen(true)}
      >
        {icon}
        <span className="text-sm">{buttonText}</span>
      </Button>
      
      {/* Dialog */}
      <MaterialDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        icon={icon}
        className={`max-w-${maxWidth}`}
      >
        <div className="flex flex-col space-y-4">          
          {/* Conversation history */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-gray-800 rounded-lg p-4 h-96 overflow-y-auto flex flex-col space-y-3"
          >
            {conversation.length === 0 ? (
              <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <MessageSquare className="h-10 w-10 text-gray-700 mb-2" />
                <p>Ask a question or try a voice command</p>
                <p className="text-xs text-gray-600 mt-2">Type your message below or click the microphone to speak</p>
              </div>
            ) : (
              conversation.map((message, index) => (
                <div 
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-primary/30 text-white' 
                        : 'bg-gray-800/50 text-white'
                    }`}
                  >
                    {/* Support for rich content */}
                    {message.data ? (
                      <div className="space-y-2">
                        <p className="text-sm whitespace-pre-line">{message.text}</p>
                        <pre className="text-xs bg-black/30 p-2 rounded overflow-auto">
                          {JSON.stringify(message.data, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-line">{message.text}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Input form */}
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your message..."
              className="pr-20"
            />
            <div className="absolute right-1 top-1 flex space-x-1">
              {voiceEnabled && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={toggleVoiceRecognition}
                  className={isListening ? "text-primary animate-pulse" : "text-gray-400"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
          
          {/* Quick access buttons for custom commands */}
          {customCommands.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {customCommands.map((command, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  size="sm" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => customMutations[index].mutate()}
                  disabled={customMutations[index].isPending}
                >
                  {command.icon}
                  <span>{command.buttonText}</span>
                </Button>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportData}
              disabled={!mainData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isLoadingData}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </MaterialDialog>
    </>
  );
};

export default GenericAIAssistant;
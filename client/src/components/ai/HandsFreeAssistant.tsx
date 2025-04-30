import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, 
  CheckCircle2, XCircle, HelpCircle, Settings, 
  AlertCircle, PlayCircle, AlignLeft, List
} from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Command {
  name: string;
  description: string;
  patterns: string[];
  examples: string[];
  category: 'orders' | 'kitchen' | 'inventory' | 'customers' | 'general';
}

// List of available voice commands
const AVAILABLE_COMMANDS: Command[] = [
  {
    name: 'Create Order',
    description: 'Create a new order for a specific table',
    patterns: ['create order for table (number)', 'new order table (number)'],
    examples: ['Create order for table 5', 'New order table 12'],
    category: 'orders',
  },
  {
    name: 'Update Order Status',
    description: 'Change the status of an existing order',
    patterns: ['mark order (number) as (status)', 'change order (number) to (status)'],
    examples: ['Mark order 1001 as ready', 'Change order 1002 to complete'],
    category: 'orders',
  },
  {
    name: 'Add Item to Order',
    description: 'Add a menu item to an existing order',
    patterns: ['add (item) to order (number)', 'order (number) add (item)'],
    examples: ['Add pizza to order 1001', 'Order 1002 add pasta'],
    category: 'orders',
  },
  {
    name: 'Check Kitchen Status',
    description: 'Get information about kitchen orders and preparation',
    patterns: ['kitchen status', 'check kitchen', 'what\'s in the kitchen'],
    examples: ['Kitchen status', 'Check kitchen'],
    category: 'kitchen',
  },
  {
    name: 'Check Inventory',
    description: 'Get information about current inventory levels',
    patterns: ['inventory status', 'check inventory', 'stock levels'],
    examples: ['Inventory status', 'Check stock levels'],
    category: 'inventory',
  },
  {
    name: 'Customer Information',
    description: 'Get information about customers',
    patterns: ['customer info (name/number)', 'lookup customer (name/number)'],
    examples: ['Customer info John Smith', 'Lookup customer 1001'],
    category: 'customers',
  },
  {
    name: 'General Help',
    description: 'Get assistance with using the system',
    patterns: ['help', 'what can you do', 'available commands'],
    examples: ['Help', 'What can you do?'],
    category: 'general',
  },
];

const HandsFreeAssistant: React.FC = () => {
  // State variables
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandSuccess, setCommandSuccess] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('commands');
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Start voice recognition
  const startListening = useCallback(() => {
    // If already listening, don't restart
    if (isListening) return;
    
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: 'Speech Recognition Not Supported',
        description: 'Your browser does not support speech recognition.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Create new recognition instance
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      // Configure recognition
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = continuousMode;
      
      // Handle recognition start
      recognition.onstart = () => {
        setIsListening(true);
        setCommandSuccess(null);
        setTranscription('Listening...');
      };
      
      // Handle results
      recognition.onresult = (event: any) => {
        try {
          const transcript = event.results[0][0].transcript;
          setTranscription(transcript);
          
          // If final result
          if (event.results[0].isFinal) {
            processCommand(transcript);
          }
        } catch (err) {
          console.error("Error processing speech result:", err);
        }
      };
      
      // Handle end of recognition
      recognition.onend = () => {
        setIsListening(false);
        
        // If in continuous mode, restart listening
        if (continuousMode && recognitionRef.current) {
          setTimeout(() => {
            startListening();
          }, 500); // Small delay before restarting
        } else {
          recognitionRef.current = null;
        }
      };
      
      // Handle recognition errors
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;
        
        if (event.error !== 'aborted') {
          setTranscription('Error: ' + event.error);
          toast({
            title: 'Speech Recognition Issue',
            description: `Please try again or check microphone permissions.`,
            variant: 'default'
          });
        }
      };
      
      // Start recognition
      recognition.start();
      
    } catch (err) {
      console.error("Error initializing speech recognition:", err);
      setIsListening(false);
      recognitionRef.current = null;
      
      toast({
        title: 'Speech Recognition Error',
        description: 'There was an error starting speech recognition.',
        variant: 'destructive'
      });
    }
  }, [isListening, continuousMode, toast]);
  
  // Stop voice recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        recognitionRef.current = null;
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
    }
  }, []);
  
  // Process the spoken command
  const processCommand = useCallback(async (command: string) => {
    // Add to transcript history
    setTranscriptHistory(prev => [command, ...prev.slice(0, 9)]);
    
    // Set as processing
    setIsProcessing(true);
    
    try {
      // Send to backend for processing
      const response = await apiRequest('POST', '/api/voice-assistant/process', {
        command,
        userType: user?.role || 'waiter', // Default to waiter if role not set
      });
      
      const data = await response.json();
      
      // Add response to history
      setResponses(prev => [data.response, ...prev.slice(0, 9)]);
      
      // Speak the response if not muted
      if (!isMuted) {
        speakText(data.response);
      }
      
      // Set success indicator
      setCommandSuccess(data.success);
      
      // Reset after a few seconds
      setTimeout(() => {
        setCommandSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error("Error processing command:", error);
      const errorMessage = "Sorry, I couldn't process that command. Please try again.";
      setResponses(prev => [errorMessage, ...prev.slice(0, 9)]);
      
      if (!isMuted) {
        speakText(errorMessage);
      }
      
      setCommandSuccess(false);
    } finally {
      setIsProcessing(false);
    }
  }, [user, isMuted]);
  
  // Speak text using speech synthesis
  const speakText = useCallback((text: string) => {
    if (isMuted) return;
    
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
      utterance.pitch = 1.1;
      utterance.volume = volume / 100;
      
      // Save reference and speak
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [isMuted, volume]);
  
  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number[]) => {
    setVolume(newVolume[0]);
  }, []);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);
  
  // Toggle continuous mode
  const toggleContinuousMode = useCallback(() => {
    // If currently listening, stop first
    if (isListening) {
      stopListening();
    }
    
    setContinuousMode(!continuousMode);
    
    // Show toast notification
    toast({
      title: !continuousMode ? 'Continuous Mode Enabled' : 'Continuous Mode Disabled',
      description: !continuousMode 
        ? 'Assistant will keep listening for commands' 
        : 'Assistant will stop after each command',
    });
  }, [continuousMode, isListening, stopListening, toast]);
  
  // Filter commands by category
  const filteredCommands = AVAILABLE_COMMANDS.filter(command => 
    selectedCategory === 'all' || command.category === selectedCategory
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition on unmount:', e);
        }
      }
      
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Hands-Free Voice Assistant</CardTitle>
            <CardDescription>Control restaurant operations with voice commands</CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant={isMuted ? "outline" : "ghost"} 
              size="icon" 
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            
            <Button 
              variant={isListening ? "destructive" : "default"} 
              onClick={isListening ? stopListening : startListening}
              className={isListening ? "animate-pulse" : ""}
            >
              {isListening ? 
                <>
                  <MicOff className="mr-2 h-4 w-4" /> Stop Listening
                </> : 
                <>
                  <Mic className="mr-2 h-4 w-4" /> Start Listening
                </>
              }
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Voice status indicator */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {isProcessing ? (
                <Badge variant="outline" className="animate-pulse bg-yellow-500/10 text-yellow-500">
                  Processing...
                </Badge>
              ) : isListening ? (
                <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500">
                  Listening...
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted">Ready</Badge>
              )}
              
              {commandSuccess !== null && (
                <Badge 
                  variant="outline" 
                  className={`ml-2 ${
                    commandSuccess 
                      ? "bg-green-500/10 text-green-500" 
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {commandSuccess ? "Success" : "Failed"}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="continuous-mode" className="text-sm">
                Continuous Mode
              </Label>
              <Switch 
                id="continuous-mode" 
                checked={continuousMode} 
                onCheckedChange={toggleContinuousMode} 
              />
            </div>
          </div>
          
          <div className="text-lg font-medium min-h-[40px]">
            {transcription || "Say a command..."}
          </div>
          
          {!isMuted && (
            <div className="mt-4 flex items-center space-x-4">
              <Volume2 className="h-4 w-4 shrink-0" />
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="flex-1"
              />
              <span className="w-10 text-center text-sm">
                {volume}%
              </span>
            </div>
          )}
        </div>
        
        {/* Tabs for Commands and History */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="commands">
              <List className="h-4 w-4 mr-2" />
              Available Commands
            </TabsTrigger>
            <TabsTrigger value="history">
              <AlignLeft className="h-4 w-4 mr-2" />
              Command History
            </TabsTrigger>
            <TabsTrigger value="help">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="commands" className="space-y-4">
            <div className="flex flex-wrap gap-2 my-2">
              <Button 
                variant={selectedCategory === 'all' ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              <Button 
                variant={selectedCategory === 'orders' ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedCategory('orders')}
              >
                Orders
              </Button>
              <Button 
                variant={selectedCategory === 'kitchen' ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedCategory('kitchen')}
              >
                Kitchen
              </Button>
              <Button 
                variant={selectedCategory === 'inventory' ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedCategory('inventory')}
              >
                Inventory
              </Button>
              <Button 
                variant={selectedCategory === 'customers' ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedCategory('customers')}
              >
                Customers
              </Button>
              <Button 
                variant={selectedCategory === 'general' ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedCategory('general')}
              >
                General
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredCommands.map((command, index) => (
                <div key={index} className="border rounded-md p-3 hover:bg-accent/10">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium">{command.name}</h4>
                    <Badge variant="outline">{command.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{command.description}</p>
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Examples:</span>
                    {command.examples.map((example, idx) => (
                      <div key={idx} className="text-sm bg-muted/20 rounded-sm p-1 pl-2">
                        "{example}"
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {transcriptHistory.length === 0 && responses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No command history yet</p>
                </div>
              )}
              
              {transcriptHistory.map((transcript, index) => (
                <div key={index} className="space-y-2 mb-4">
                  <div className="bg-accent/10 rounded-md p-3">
                    <div className="flex items-center mb-1">
                      <Mic className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-xs text-muted-foreground">You said:</span>
                    </div>
                    <p className="text-sm">{transcript}</p>
                  </div>
                  {responses[index] && (
                    <div className="bg-primary/5 rounded-md p-3 ml-4">
                      <div className="flex items-center mb-1">
                        <Volume2 className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-xs text-muted-foreground">Assistant responded:</span>
                      </div>
                      <p className="text-sm">{responses[index]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="help">
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <h3 className="font-medium flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-primary" />
                  How to Use
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="flex">
                    <span className="mr-2">1.</span> 
                    <span>Click "Start Listening" to activate voice recognition</span>
                  </li>
                  <li className="flex">
                    <span className="mr-2">2.</span> 
                    <span>Speak one of the available commands clearly</span>
                  </li>
                  <li className="flex">
                    <span className="mr-2">3.</span> 
                    <span>The assistant will process your command and respond</span>
                  </li>
                  <li className="flex">
                    <span className="mr-2">4.</span> 
                    <span>Enable "Continuous Mode" to keep the assistant listening</span>
                  </li>
                </ul>
              </div>
              
              <div className="rounded-md border p-4">
                <h3 className="font-medium flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-primary" />
                  Tips
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="flex">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0" /> 
                    <span>Speak clearly and at a normal pace</span>
                  </li>
                  <li className="flex">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0" /> 
                    <span>Use the exact command patterns for best results</span>
                  </li>
                  <li className="flex">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0" /> 
                    <span>Reduce background noise for better recognition</span>
                  </li>
                  <li className="flex">
                    <XCircle className="h-4 w-4 mr-2 text-red-500 shrink-0" /> 
                    <span>Avoid speaking too quickly or using unclear phrases</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setActiveTab('help')}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
        
        <Button 
          onClick={startListening}
          disabled={isListening}
          variant="default"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Try a Command
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HandsFreeAssistant;
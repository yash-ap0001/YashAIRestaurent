import React, { useState, useEffect, useRef } from 'react';
import { MaterialDialog } from '../ui/material-dialog';
import { Button } from '../ui/button';
import { 
  TrendingUp, BarChart3, RefreshCw, Download, Mic, MicOff, Search, 
  Utensils, CheckCircle2, Circle, ClipboardList, AlertCircle, ReceiptText, Trash2
} from 'lucide-react';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

type AnalysisMode = 'general' | 'financial' | 'operational' | 'strategic' | 'customer' | 'staff' | 'marketing' | 'order';

// Define order statuses
type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'billed';

interface Order {
  id: number;
  orderNumber: string;
  tableNumber: string | null;
  status: string;
  totalAmount: number;
  createdAt?: Date | string | null;
}

const RestaurantAdminAI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('general');
  const [conversation, setConversation] = useState<{
    type: 'user' | 'agent';
    text: string;
    chartData?: any;
    chartType?: string;
    action?: 'update_order' | 'create_order' | 'delete_order';
    orderData?: any;
  }[]>([]);
  
  // Audio elements for speech
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Store orders data
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  const { toast } = useToast();
  
  // Fetch admin dashboard data
  const { data: adminData, isLoading: isLoadingAdminData, error: adminDataError, refetch } = useQuery({
    queryKey: ['/api/admin/dashboard-data'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/dashboard-data');
      return await res.json();
    },
    enabled: isOpen,
    staleTime: 60000, // Consider data fresh for 1 minute
  });
  
  // Fetch orders data
  const { data: orders, isLoading: isLoadingOrders, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/orders');
      return await res.json();
    },
    enabled: isOpen,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest('POST', '/api/orders', orderData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Add success message to conversation
      const successMessage = `Order ${data.orderNumber} created successfully for table ${data.tableNumber || 'Takeaway'}.`;
      
      setConversation(prev => [
        ...prev,
        {
          type: 'agent',
          text: successMessage,
          action: 'create_order',
          orderData: data
        }
      ]);
      
      // Speak success message
      speakResponse(successMessage);
      
      setAnalysisMode('order');
      
      toast({
        title: 'Order Created',
        description: successMessage,
      });
    },
    onError: (error: any) => {
      const errorMessage = `Failed to create order. ${error.message || ''}`;
      speakResponse(errorMessage);
      
      toast({
        title: 'Error Creating Order',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
  
  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, orderData }: { id: number, orderData: any }) => {
      const res = await apiRequest('PATCH', `/api/orders/${id}`, orderData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Get readable status
      const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);
      
      // Add success message to conversation
      const successMessage = `Order ${data.orderNumber} for table ${data.tableNumber || 'Takeaway'} updated to status: ${statusText}.`;
      
      setConversation(prev => [
        ...prev,
        {
          type: 'agent',
          text: successMessage,
          action: 'update_order',
          orderData: data
        }
      ]);
      
      // Speak success message
      speakResponse(successMessage);
      
      setAnalysisMode('order');
      
      toast({
        title: 'Order Updated',
        description: successMessage,
      });
    },
    onError: (error: any) => {
      const errorMessage = `Failed to update order. ${error.message || ''}`;
      speakResponse(errorMessage);
      
      toast({
        title: 'Error Updating Order',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
  
  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/orders/${id}`);
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Add success message to conversation
      const successMessage = `Order #${variables} has been deleted successfully.`;
      
      setConversation(prev => [
        ...prev,
        {
          type: 'agent',
          text: successMessage,
          action: 'delete_order'
        }
      ]);
      
      // Speak success message
      speakResponse(successMessage);
      
      setAnalysisMode('order');
      
      toast({
        title: 'Order Deleted',
        description: successMessage,
      });
    },
    onError: (error: any) => {
      const errorMessage = `Failed to delete order. ${error.message || ''}`;
      speakResponse(errorMessage);
      
      toast({
        title: 'Error Deleting Order',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
  
  // AI Insights mutation
  const insightsMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('POST', '/api/admin/ai/insights', { query });
      return await res.json();
    },
    onSuccess: (data) => {
      // Add AI response to conversation
      setConversation(prev => [
        ...prev,
        {
          type: 'agent',
          text: data.response,
          chartData: data.chartData.data,
          chartType: data.chartData.type
        }
      ]);
      
      // Determine the analysis mode based on the query
      determineAnalysisMode(query);
    },
    onError: (error: any) => {
      toast({
        title: 'Error generating insights',
        description: error.message || 'Failed to generate business insights',
        variant: 'destructive'
      });
    }
  });
  
  // Business Health Assessment mutation
  const healthAssessmentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ai/business-health');
      return await res.json();
    },
    onSuccess: (data) => {
      // Format health assessment response
      const healthText = `
Business Health Assessment:
- Overall Score: ${data.overallScore}/100
- Financial Health: ${data.financialScore}/100 (${data.financialAssessment})
- Operational Efficiency: ${data.operationalScore}/100 (${data.operationalAssessment})
- Customer Satisfaction: ${data.customerScore}/100 (${data.customerAssessment})
- Staff Performance: ${data.staffScore}/100 (${data.staffAssessment})
      `.trim();
      
      // Add to conversation
      setConversation(prev => [
        ...prev,
        {
          type: 'user',
          text: 'Perform a health assessment of my business'
        },
        {
          type: 'agent',
          text: healthText,
          chartData: {
            labels: ['Financial', 'Operational', 'Customer', 'Staff'],
            datasets: [{
              data: [data.financialScore, data.operationalScore, data.customerScore, data.staffScore]
            }]
          },
          chartType: 'radar'
        }
      ]);
      
      setAnalysisMode('general');
    },
    onError: (error: any) => {
      toast({
        title: 'Error generating health assessment',
        description: error.message || 'Failed to assess business health',
        variant: 'destructive'
      });
    }
  });
  
  // Growth Opportunities mutation
  const growthOpportunitiesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ai/growth-opportunities');
      return await res.json();
    },
    onSuccess: (data) => {
      // Format growth opportunities response
      const opportunitiesText = `
Top Growth Opportunities:
${data.map((opp: any, idx: number) => `${idx + 1}. ${opp.area} - Estimated impact: ${opp.impact.toFixed(1)}% profit increase, Timeframe: ${opp.timeframe}, Investment level: ${opp.investmentRequired}`).join('\n')}
      `.trim();
      
      // Add to conversation
      setConversation(prev => [
        ...prev,
        {
          type: 'user',
          text: 'Show me growth opportunities for my business'
        },
        {
          type: 'agent',
          text: opportunitiesText,
          chartData: {
            labels: data.map((opp: any) => opp.area),
            datasets: [{
              label: 'Estimated Impact (%)',
              data: data.map((opp: any) => opp.impact)
            }]
          },
          chartType: 'bar'
        }
      ]);
      
      setAnalysisMode('strategic');
    },
    onError: (error: any) => {
      toast({
        title: 'Error generating growth opportunities',
        description: error.message || 'Failed to identify growth opportunities',
        variant: 'destructive'
      });
    }
  });
  
  // Determine analysis mode based on query
  // Speech synthesis - speak response
  const speakResponse = (text: string) => {
    // Stop any current speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    // Create a new speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Optional: Configure voice settings
    utterance.rate = 1.0; // Speed
    utterance.pitch = 1.0; // Pitch
    utterance.volume = 1.0; // Volume
    
    // Get available voices
    const voices = speechSynthesis.getVoices();
    
    // Try to find a female English voice (common in most browsers)
    const englishVoice = voices.find(voice => 
      voice.lang.includes('en-') && voice.name.includes('Female')
    ) || voices.find(voice => voice.lang.includes('en-'));
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    // Track speech state
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error', event);
      setIsSpeaking(false);
    };
    
    // Store the utterance reference
    speechSynthesisRef.current = utterance;
    
    // Speak the text
    speechSynthesis.speak(utterance);
  };
  
  // Process voice commands related to orders
  const processOrderVoiceCommand = (command: string) => {
    const commandLower = command.toLowerCase();
    
    // Extract table number using regex
    const tableNumberMatch = commandLower.match(/table\s+(\w+)/i);
    const tableNumber = tableNumberMatch ? tableNumberMatch[1] : null;
    
    // Create order command
    if (commandLower.includes('create order') || commandLower.includes('new order')) {
      createOrder(tableNumber);
      return true;
    }
    
    // Get order number from command using regex
    const orderNumberMatch = commandLower.match(/order\s+(\w+)/i) || 
                            commandLower.match(/number\s+(\w+)/i);
    let orderNumber = orderNumberMatch ? orderNumberMatch[1] : null;
    
    // Try to find the order
    let targetOrder: Order | undefined;
    
    if (orderNumber && orders) {
      targetOrder = orders.find((order: Order) => 
        order.orderNumber.toLowerCase().includes(orderNumber.toLowerCase())
      );
    } else if (tableNumber && orders) {
      // If no order number but we have a table number, try to find by table
      targetOrder = orders.find((order: Order) => 
        order.tableNumber === tableNumber
      );
    }
    
    if (targetOrder) {
      // Status update commands
      if (commandLower.includes('pending')) {
        updateOrderStatus(targetOrder.id, 'pending');
        return true;
      } else if (commandLower.includes('preparing') || commandLower.includes('prep')) {
        updateOrderStatus(targetOrder.id, 'preparing');
        return true;
      } else if (commandLower.includes('ready')) {
        updateOrderStatus(targetOrder.id, 'ready');
        return true;
      } else if (commandLower.includes('complete') || commandLower.includes('completed')) {
        updateOrderStatus(targetOrder.id, 'completed');
        return true;
      } else if (commandLower.includes('bill') || commandLower.includes('billed')) {
        updateOrderStatus(targetOrder.id, 'billed');
        return true;
      } else if (commandLower.includes('delete') || commandLower.includes('remove') || 
                 commandLower.includes('cancel')) {
        deleteOrder(targetOrder.id);
        return true;
      }
    }
    
    // If we get here, it's not an order command
    return false;
  };
  
  // Create a new order 
  const createOrder = (tableNumber: string | null) => {
    createOrderMutation.mutate({
      tableNumber: tableNumber,
      status: 'pending',
      totalAmount: 0,
      orderSource: 'ai',
      notes: 'Created via voice command'
    });
  };
  
  // Update order status
  const updateOrderStatus = (orderId: number, status: string) => {
    updateOrderMutation.mutate({
      id: orderId,
      orderData: {
        status
      }
    });
  };
  
  // Delete an order
  const deleteOrder = (orderId: number) => {
    deleteOrderMutation.mutate(orderId);
  };
  
  // Initialize effects for voice synthesis and dialog behavior
  useEffect(() => {
    if (isOpen) {
      // Fetch initial voice data
      refetch();
      refetchOrders();
      
      // Initialize speech synthesis voices when dialog opens
      // Workaround for browsers that load voices asynchronously
      if (window.speechSynthesis) {
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
      
      // Add voice welcome message when dialog opens
      const welcomeMessage = "Welcome to Restaurant Business Advisor. How can I assist you today?";
      setConversation([{ type: 'agent', text: welcomeMessage }]);
      speakResponse(welcomeMessage);
    } else {
      // Cancel any speech when dialog closes
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Reset conversation when dialog closes
      setConversation([]);
    }
  }, [isOpen, refetch, refetchOrders]);
  
  // Add order status mode effect
  useEffect(() => {
    // Automatically switch to order mode if any order-related API calls are made
    if (createOrderMutation.isPending || 
        updateOrderMutation.isPending || 
        deleteOrderMutation.isPending) {
      setAnalysisMode('order');
    }
  }, [
    createOrderMutation.isPending, 
    updateOrderMutation.isPending, 
    deleteOrderMutation.isPending
  ]);
  
  // Determine analysis mode based on query
  const determineAnalysisMode = (query: string) => {
    const queryLower = query.toLowerCase();
    
    // Check for order-related commands first
    if (queryLower.includes('order') || queryLower.includes('table') || 
        queryLower.includes('pending') || queryLower.includes('preparing') || 
        queryLower.includes('ready') || queryLower.includes('complete') || 
        queryLower.includes('bill')) {
      setAnalysisMode('order');
      
      // If it's an order command, process it
      if (processOrderVoiceCommand(query)) {
        return;
      }
    }
    
    // Otherwise, continue with other analytics modes
    if (queryLower.includes('revenue') || queryLower.includes('profit') || 
        queryLower.includes('cost') || queryLower.includes('margin') ||
        queryLower.includes('financial')) {
      setAnalysisMode('financial');
    } else if (queryLower.includes('staff') || queryLower.includes('employee') || 
               queryLower.includes('turnover')) {
      setAnalysisMode('staff');
    } else if (queryLower.includes('customer') || queryLower.includes('satisfaction') || 
               queryLower.includes('retention')) {
      setAnalysisMode('customer');
    } else if (queryLower.includes('operation') || queryLower.includes('efficiency')) {
      setAnalysisMode('operational');
    } else if (queryLower.includes('strategy') || queryLower.includes('growth') || 
               queryLower.includes('expansion')) {
      setAnalysisMode('strategic');
    } else if (queryLower.includes('marketing') || queryLower.includes('promotion') || 
               queryLower.includes('campaign')) {
      setAnalysisMode('marketing');
    } else {
      setAnalysisMode('general');
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    // Add user query to conversation
    setConversation(prev => [
      ...prev,
      { type: 'user', text: query }
    ]);
    
    // Get AI insights
    insightsMutation.mutate(query);
    
    // Clear input
    setQuery('');
  };
  
  // Start voice recognition
  const toggleVoiceRecognition = () => {
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
    
    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setQuery(speechResult);
      
      // Automatically submit if confidence is high
      if (event.results[0][0].confidence > 0.8) {
        setConversation(prev => [
          ...prev,
          { type: 'user', text: speechResult }
        ]);
        
        // Check if this is an order management command first
        const isOrderCommand = processOrderVoiceCommand(speechResult);
        
        // If not an order command, treat as a regular insight query
        if (!isOrderCommand) {
          insightsMutation.mutate(speechResult);
        }
        
        setQuery('');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event);
      setIsListening(false);
      toast({
        title: 'Speech Recognition Error',
        description: 'There was an error with speech recognition. Please try again.',
        variant: 'destructive'
      });
    };
    
    recognition.start();
  };
  
  // Export analytics data
  const exportAnalytics = () => {
    if (!adminData) return;
    
    const dataStr = JSON.stringify(adminData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `restaurant-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: 'Analytics Exported',
      description: 'Your business analytics data has been exported successfully.'
    });
  };
  
  // Render chart component based on data
  const renderChart = (chartData: any, chartType: string) => {
    // Placeholder for chart rendering
    return (
      <div className="bg-gray-900/70 backdrop-blur-sm rounded p-2 mt-2 h-44 flex items-center justify-center">
        <div className="text-xs text-gray-400 text-center">
          {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart Visualization
          <div className="text-xs mt-1 text-primary/70">
            {chartData.labels?.join(', ')}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
      {/* Open button */}
      <Button
        variant="outline"
        className="flex items-center gap-2 bg-black/20 backdrop-blur-sm border-primary/20 hover:bg-black/40 hover:border-primary/30"
        onClick={() => setIsOpen(true)}
      >
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm">Restaurant Business Advisor</span>
      </Button>
      
      {/* Dialog */}
      <MaterialDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Restaurant Business Advisor"
        description="Strategic insights for your restaurant business"
        icon={<TrendingUp className="h-6 w-6 text-primary" />}
        className="max-w-2xl"
      >
        <div className="flex flex-col space-y-4">
          {/* Analytics mode indicator */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Analysis Mode:</span>
                <span className="text-sm font-medium text-primary">
                  {analysisMode.charAt(0).toUpperCase() + analysisMode.slice(1)} Analytics
                </span>
              </div>
              <div className="flex space-x-1">
                {/* Analysis mode selector buttons */}
                <button 
                  onClick={() => setAnalysisMode('financial')}
                  className={`px-2 py-1 text-xs rounded ${analysisMode === 'financial' ? 'bg-primary/20 text-primary' : 'text-gray-400'}`}
                >
                  Financial
                </button>
                <button 
                  onClick={() => setAnalysisMode('operational')}
                  className={`px-2 py-1 text-xs rounded ${analysisMode === 'operational' ? 'bg-primary/20 text-primary' : 'text-gray-400'}`}
                >
                  Operations
                </button>
                <button 
                  onClick={() => setAnalysisMode('strategic')}
                  className={`px-2 py-1 text-xs rounded ${analysisMode === 'strategic' ? 'bg-primary/20 text-primary' : 'text-gray-400'}`}
                >
                  Strategic
                </button>
              </div>
            </div>
          </div>
          
          {/* Conversation history */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-gray-800 rounded-lg p-4 h-96 overflow-y-auto flex flex-col space-y-3"
          >
            {conversation.length === 0 ? (
              <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <TrendingUp className="h-10 w-10 text-gray-700 mb-2" />
                <p>Ask a question about your restaurant business</p>
                <p className="text-xs text-gray-600 mt-2">Examples: "How's our revenue trend?", "Analyze customer satisfaction", "Ideas to improve profit margin"</p>
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
                    {/* Support for rich content including data visualizations */}
                    {message.chartData && message.chartType ? (
                      <div className="space-y-2">
                        <p className="text-sm whitespace-pre-line">{message.text}</p>
                        {renderChart(message.chartData, message.chartType)}
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
              placeholder="Ask a business question..."
              className="pr-20"
            />
            <div className="absolute right-1 top-1 flex space-x-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleVoiceRecognition}
                className={isListening ? "text-primary animate-pulse" : "text-gray-400"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
          
          {/* Order Management UI - only shown in order mode */}
          {analysisMode === 'order' && (
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Voice Order Management</h3>
                <div className="flex items-center space-x-1">
                  <div className={`h-2 w-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                  <span className="text-xs text-gray-400">{isSpeaking ? 'Speaking' : 'Ready'}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-400 mb-3">
                <p>Use voice commands to manage orders:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>"Create order for table 5"</li>
                  <li>"Set order 1001 to preparing"</li>
                  <li>"Mark table 3 order as ready to serve"</li>
                  <li>"Complete order 1002"</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center justify-center gap-1 py-1 h-auto"
                  onClick={() => {
                    const tableNum = window.prompt('Enter table number:');
                    if (tableNum) {
                      createOrder(tableNum);
                    }
                  }}
                >
                  <Utensils className="h-3 w-3" />
                  <span className="text-xs">New Order</span>
                </Button>
                
                {['pending', 'preparing', 'ready', 'completed', 'billed'].map((status) => {
                  // Map status to appropriate icon
                  let StatusIcon;
                  switch(status) {
                    case 'pending': StatusIcon = Circle; break;
                    case 'preparing': StatusIcon = ClipboardList; break;
                    case 'ready': StatusIcon = AlertCircle; break;
                    case 'completed': StatusIcon = CheckCircle2; break;
                    case 'billed': StatusIcon = ReceiptText; break;
                    default: StatusIcon = Circle;
                  }
                  
                  return (
                    <Button 
                      key={status}
                      variant="outline" 
                      size="sm"
                      className="flex items-center justify-center gap-1 py-1 h-auto"
                      onClick={() => {
                        if (!orders || orders.length === 0) {
                          toast({
                            title: 'No orders found',
                            description: 'There are no active orders to update',
                            variant: 'destructive'
                          });
                          return;
                        }
                        
                        // Ask for order number
                        const orderNum = window.prompt('Enter order number:');
                        if (!orderNum) return;
                        
                        // Find matching order
                        const order = orders.find((o: Order) => 
                          o.orderNumber.toLowerCase().includes(orderNum.toLowerCase())
                        );
                        
                        if (order) {
                          updateOrderStatus(order.id, status);
                        } else {
                          toast({
                            title: 'Order not found',
                            description: `Could not find order number ${orderNum}`,
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      <StatusIcon className="h-3 w-3" />
                      <span className="text-xs capitalize">{status}</span>
                    </Button>
                  );
                })}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center justify-center gap-1 py-1 h-auto text-red-500 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => {
                    if (!orders || orders.length === 0) {
                      toast({
                        title: 'No orders found',
                        description: 'There are no active orders to delete',
                        variant: 'destructive'
                      });
                      return;
                    }
                    
                    // Ask for order number
                    const orderNum = window.prompt('Enter order number to delete:');
                    if (!orderNum) return;
                    
                    // Find matching order
                    const order = orders.find((o: Order) => 
                      o.orderNumber.toLowerCase().includes(orderNum.toLowerCase())
                    );
                    
                    if (order) {
                      if (window.confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
                        deleteOrder(order.id);
                      }
                    } else {
                      toast({
                        title: 'Order not found',
                        description: `Could not find order number ${orderNum}`,
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="text-xs">Delete</span>
                </Button>
              </div>
            </div>
          )}
          
          {/* Quick access buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center justify-center gap-2"
              onClick={() => healthAssessmentMutation.mutate()}
              disabled={healthAssessmentMutation.isPending}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Business Health Assessment</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center justify-center gap-2"
              onClick={() => growthOpportunitiesMutation.mutate()}
              disabled={growthOpportunitiesMutation.isPending}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Growth Opportunities</span>
            </Button>
          </div>
          
          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportAnalytics}
              disabled={!adminData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Analysis
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isLoadingAdminData}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAdminData ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </MaterialDialog>
    </>
  );
};

export default RestaurantAdminAI;
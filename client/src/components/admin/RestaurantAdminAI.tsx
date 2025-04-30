import React, { useState } from 'react';
import { MaterialDialog } from '../ui/material-dialog';
import { Button } from '../ui/button';
import { TrendingUp, BarChart3, RefreshCw, Download, Mic, MicOff, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

type AnalysisMode = 'general' | 'financial' | 'operational' | 'strategic' | 'customer' | 'staff' | 'marketing';

const RestaurantAdminAI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('general');
  const [conversation, setConversation] = useState<{
    type: 'user' | 'agent';
    text: string;
    chartData?: any;
    chartType?: string;
  }[]>([]);
  
  const { toast } = useToast();
  
  // Fetch admin dashboard data
  const { data: adminData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/dashboard-data'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/dashboard-data');
      return await res.json();
    },
    enabled: isOpen,
    staleTime: 60000, // Consider data fresh for 1 minute
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
  const determineAnalysisMode = (query: string) => {
    const queryLower = query.toLowerCase();
    
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
        
        insightsMutation.mutate(speechResult);
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
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </MaterialDialog>
    </>
  );
};

export default RestaurantAdminAI;
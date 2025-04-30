import React from 'react';
import { Card } from '@/components/ui/card';
import OrderManagementAI from '@/components/ai/OrderManagementAI';
import RestaurantAdminAI from '@/components/admin/RestaurantAdminAI.fixed';
import { 
  MessageSquare, 
  Utensils, 
  TrendingUp,
  Building2,
  Landmark,
  Users,
  Car,
  CalendarCheck,
  Network
} from 'lucide-react';

const AIDemo: React.FC = () => {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <MessageSquare className="h-6 w-6 mr-2 text-primary" />
          AI Assistants Demo
        </h1>
        <p className="text-gray-400 mt-2">
          Explore reusable AI assistant components for different business applications
        </p>
        <div className="mt-4">
          <a 
            href="/speech-demo" 
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Mic className="h-4 w-4 mr-2" />
            Test Speech Recognition
          </a>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Current Components */}
        <Card className="p-6 bg-gray-900/50 backdrop-blur">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-primary" />
            Current AI Components
          </h2>
          <p className="text-gray-400 mb-6">
            These AI assistants are currently implemented in the application and ready to use.
          </p>
          
          <div className="space-y-4">
            <div className="border border-gray-800 rounded-lg p-4 bg-black/20">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Utensils className="h-4 w-4 mr-2 text-primary" /> 
                Order Management Assistant
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                Voice-controlled assistant for creating and managing restaurant orders.
              </p>
              <div className="mt-4">
                <OrderManagementAI />
              </div>
            </div>
            
            <div className="border border-gray-800 rounded-lg p-4 bg-black/20">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-primary" /> 
                Restaurant Business Advisor
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                AI-powered insights for restaurant business analytics and strategic planning.
              </p>
              <div className="mt-4">
                <RestaurantAdminAI />
              </div>
            </div>
          </div>
        </Card>
        
        {/* Future Components */}
        <Card className="p-6 bg-gray-900/50 backdrop-blur">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Network className="h-5 w-5 mr-2 text-primary" />
            Potential Business Applications
          </h2>
          <p className="text-gray-400 mb-6">
            The GenericAIAssistant component can be customized for various business needs:
          </p>
          
          <div className="space-y-4">
            <div className="border border-gray-800 rounded-lg p-4 bg-black/20">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-primary" /> 
                Hotel Concierge Assistant
              </h3>
              <p className="text-sm text-gray-400">
                Assists guests with room service requests, local recommendations, and hotel information.
              </p>
              <ul className="text-xs text-gray-500 mt-2 list-disc list-inside">
                <li>Room booking and management</li>
                <li>Housekeeping and maintenance requests</li>
                <li>Local attractions and dining recommendations</li>
              </ul>
            </div>
            
            <div className="border border-gray-800 rounded-lg p-4 bg-black/20">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Landmark className="h-4 w-4 mr-2 text-primary" /> 
                Financial Advisor Assistant
              </h3>
              <p className="text-sm text-gray-400">
                Provides financial insights, investment recommendations, and budget analysis.
              </p>
              <ul className="text-xs text-gray-500 mt-2 list-disc list-inside">
                <li>Portfolio performance analysis</li>
                <li>Investment recommendations</li>
                <li>Budget tracking and optimization</li>
              </ul>
            </div>
            
            <div className="border border-gray-800 rounded-lg p-4 bg-black/20">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Users className="h-4 w-4 mr-2 text-primary" /> 
                HR Recruitment Assistant
              </h3>
              <p className="text-sm text-gray-400">
                Helps manage the hiring process, candidate screening, and interview scheduling.
              </p>
              <ul className="text-xs text-gray-500 mt-2 list-disc list-inside">
                <li>Resume screening and candidate ranking</li>
                <li>Interview scheduling and coordination</li>
                <li>Onboarding process management</li>
              </ul>
            </div>
            
            <div className="border border-gray-800 rounded-lg p-4 bg-black/20">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Car className="h-4 w-4 mr-2 text-primary" /> 
                Fleet Management Assistant
              </h3>
              <p className="text-sm text-gray-400">
                Manages vehicle tracking, maintenance scheduling, and driver assignment.
              </p>
              <ul className="text-xs text-gray-500 mt-2 list-disc list-inside">
                <li>Vehicle maintenance scheduling</li>
                <li>Driver assignment and routing</li>
                <li>Fuel consumption and performance analytics</li>
              </ul>
            </div>
            
            <div className="border border-gray-800 rounded-lg p-4 bg-black/20">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <CalendarCheck className="h-4 w-4 mr-2 text-primary" /> 
                Event Management Assistant
              </h3>
              <p className="text-sm text-gray-400">
                Coordinates event planning, vendor management, and guest communication.
              </p>
              <ul className="text-xs text-gray-500 mt-2 list-disc list-inside">
                <li>Event scheduling and timeline management</li>
                <li>Vendor coordination and tracking</li>
                <li>Guest communications and RSVP management</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="mt-8 p-6 rounded-lg border border-gray-800 bg-black/30 backdrop-blur-md">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <p className="text-gray-400 mb-4">
          The AI assistants are built using a modular architecture with three key components:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-md bg-gray-900/50 border border-gray-800">
            <h3 className="font-medium mb-2">1. GenericAIAssistant Component</h3>
            <p className="text-sm text-gray-400">
              A configurable React component that handles UI, voice recognition, and API interactions.
            </p>
          </div>
          
          <div className="p-4 rounded-md bg-gray-900/50 border border-gray-800">
            <h3 className="font-medium mb-2">2. Domain-Specific Commands</h3>
            <p className="text-sm text-gray-400">
              Regular expression patterns that match specific voice commands for business tasks.
            </p>
          </div>
          
          <div className="p-4 rounded-md bg-gray-900/50 border border-gray-800">
            <h3 className="font-medium mb-2">3. AI Processing Backend</h3>
            <p className="text-sm text-gray-400">
              API endpoints that use Anthropic Claude (or other LLMs) to process natural language.
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>
            This architecture allows for rapid development of new AI assistants for different business domains while maintaining consistent UX patterns and leveraging the same underlying technology.
          </p>
        </div>
      </div>
    </>
  );
};

export default AIDemo;
import React from 'react';
import { Helmet } from 'react-helmet';
import { 
  Mic, Users, Navigation, ShoppingBag, List, 
  Utensils, BarChart2, HelpCircle, UserCog 
} from 'lucide-react';
import HandsFreeAssistant from '@/components/ai/HandsFreeAssistant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const HandsFreeAssistantPage = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <Helmet>
        <title>Voice Assistant | YashHotelBot</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hands-Free Restaurant Management</h1>
        <p className="text-muted-foreground">
          Control restaurant operations with voice commands for efficient hands-free management
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Assistant */}
        <div className="lg:col-span-2">
          <HandsFreeAssistant />
        </div>
        
        {/* Right column - Quick info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <List className="mr-2 h-5 w-5 text-primary" />
                Voice Assistant Benefits
              </CardTitle>
              <CardDescription>
                How voice commands improve restaurant operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <div className="mr-3 mt-1 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Hands-Free Operation</h3>
                  <p className="text-sm text-muted-foreground">
                    Perform tasks without touching devices while handling food, ingredients, or busy with customers
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-1 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Utensils className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Faster Order Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Create and update orders instantly with voice commands, reducing time spent on terminals
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-1 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Improved Staff Coordination</h3>
                  <p className="text-sm text-muted-foreground">
                    Check kitchen status and inventory levels without leaving your station
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-1 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Navigation className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Reduced Errors</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-powered natural language processing accurately interprets commands, reducing manual input errors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCog className="mr-2 h-5 w-5 text-primary" />
                Tips for Better Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1.</span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">Speak clearly and naturally</span> - 
                  There's no need to shout or speak unnaturally slowly
                </p>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2.</span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">Use the command patterns</span> - 
                  Follow the example patterns for best recognition
                </p>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">3.</span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">Reduce background noise</span> - 
                  When possible, use in quieter areas or direct microphone
                </p>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">4.</span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">Enable continuous mode</span> - 
                  For busy periods, keep voice recognition active
                </p>
              </div>
              
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <div className="flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2 text-primary" />
                  <p className="text-xs font-medium">Need help?</p>
                </div>
                <p className="text-xs mt-1">
                  Say "Help" or "What can you do?" at any time to see available commands
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HandsFreeAssistantPage;
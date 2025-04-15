import React, { useState } from 'react';
import HotelMascot from '@/components/ui/HotelMascot';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import LoadingButton from '@/components/ui/LoadingButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLoading } from '@/hooks/useLoading';

const LoadingDemo = () => {
  const { isLoading: isLoading1, withLoading: withLoading1 } = useLoading();
  const { isLoading: isLoading2, withLoading: withLoading2 } = useLoading();
  const { isLoading: isLoading3, withLoading: withLoading3 } = useLoading();
  
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  // Simulate a loading operation
  const simulateLoading = (seconds: number) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Loading Components Demo</h1>
      
      <Tabs defaultValue="mascot" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="mascot">Mascot</TabsTrigger>
          <TabsTrigger value="indicators">Loading Indicators</TabsTrigger>
          <TabsTrigger value="buttons">Loading Buttons</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mascot">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Static Mascot</CardTitle>
                <CardDescription>Normal state without animation</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <HotelMascot size={150} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Animated Mascot</CardTitle>
                <CardDescription>Animated with floating and blinking effects</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <HotelMascot size={150} animated={true} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Small Mascot</CardTitle>
                <CardDescription>Smaller version for inline use</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                <HotelMascot size={60} animated={true} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="indicators">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Small Indicator</CardTitle>
                <CardDescription>For smaller UI elements</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center h-40">
                <LoadingIndicator size="sm" message="Loading menu items..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Medium Indicator</CardTitle>
                <CardDescription>Default size for most contexts</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center h-40">
                <LoadingIndicator message="Processing your order..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Large Indicator</CardTitle>
                <CardDescription>For full-page or section loading</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center h-40">
                <LoadingIndicator size="lg" message="Preparing your meal..." />
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={() => setShowFullScreen(true)}
              className="mr-4"
            >
              Show Fullscreen Loader
            </Button>
            
            {showFullScreen && (
              <div className="fixed inset-0 z-50 bg-background">
                <LoadingIndicator 
                  size="lg" 
                  message="Welcome to Yash Hotel!" 
                  fullScreen={true} 
                />
                <Button
                  className="absolute top-4 right-4"
                  variant="outline"
                  onClick={() => setShowFullScreen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="buttons">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Primary Button</CardTitle>
                <CardDescription>With loading state</CardDescription>
              </CardHeader>
              <CardContent>
                <LoadingButton 
                  isLoading={isLoading1}
                  loadingText="Processing..."
                  onClick={() => withLoading1(simulateLoading(3))}
                  className="w-full"
                >
                  Submit Order
                </LoadingButton>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Secondary Button</CardTitle>
                <CardDescription>With loading state</CardDescription>
              </CardHeader>
              <CardContent>
                <LoadingButton 
                  isLoading={isLoading2}
                  loadingText="Saving..."
                  onClick={() => withLoading2(simulateLoading(3))}
                  variant="secondary"
                  className="w-full"
                >
                  Save Changes
                </LoadingButton>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Destructive Button</CardTitle>
                <CardDescription>With loading state</CardDescription>
              </CardHeader>
              <CardContent>
                <LoadingButton 
                  isLoading={isLoading3}
                  loadingText="Deleting..."
                  onClick={() => withLoading3(simulateLoading(3))}
                  variant="destructive"
                  className="w-full"
                >
                  Delete Item
                </LoadingButton>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoadingDemo;
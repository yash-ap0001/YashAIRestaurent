import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ProcessStep = {
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  details?: string;
  data?: any;
};

export function AIOrderSimulator() {
  const { toast } = useToast();
  const [naturalLanguageOrder, setNaturalLanguageOrder] = useState<string>(
    "I'd like to order butter chicken, 2 garlic naan, and a mango lassi. Add some extra spice to the butter chicken please."
  );
  const [processing, setProcessing] = useState<boolean>(false);
  const [steps, setSteps] = useState<ProcessStep[]>([
    { name: "Parse order with AI", status: "pending" },
    { name: "Create order", status: "pending" },
    { name: "Generate kitchen token", status: "pending" },
    { name: "Process payment", status: "pending" },
    { name: "Generate bill", status: "pending" }
  ]);

  const updateStepStatus = (index: number, status: ProcessStep["status"], details?: string, data?: any) => {
    setSteps(currentSteps => {
      const newSteps = [...currentSteps];
      newSteps[index] = { 
        ...newSteps[index], 
        status, 
        details: details || newSteps[index].details,
        data: data || newSteps[index].data
      };
      return newSteps;
    });
  };

  const simulateOrder = async () => {
    if (!naturalLanguageOrder.trim()) {
      toast({
        title: "Error",
        description: "Please enter an order description",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    
    // Reset steps
    setSteps(steps.map(step => ({ ...step, status: "pending", details: undefined, data: undefined })));

    try {
      // Step 1: Parse the natural language order
      updateStepStatus(0, "processing", "Sending to OpenAI for processing...");
      const processedOrderResponse = await apiRequest(
        "POST",
        "/api/ai/process-order",
        { orderText: naturalLanguageOrder }
      );
      const processedOrderResult = await processedOrderResponse.json();

      if (!processedOrderResult || !processedOrderResult.items || !Array.isArray(processedOrderResult.items)) {
        throw new Error("Failed to process order with AI");
      }

      updateStepStatus(0, "completed", "Order processed successfully", processedOrderResult);
      
      // Step 2: Create the order
      updateStepStatus(1, "processing", "Creating order in the system...");
      const orderItems = processedOrderResult.items.map((item: any) => ({
        menuItemId: item.menuItemId || 1, // Fallback to first menu item if not found
        quantity: item.quantity || 1,
        price: item.price || 320, // Add required price field
        notes: item.specialInstructions || ""
      }));
      
      const orderResponse = await apiRequest(
        "POST",
        "/api/orders",
        {
          tableNumber: "AI-Test",
          customerName: "AI Customer",
          customerPhone: "+911234567890",
          items: orderItems,
          status: "confirmed",
          totalAmount: orderItems.reduce((total, item) => total + (item.price * item.quantity), 0),
          orderSource: "ai_simulator" // This identifies orders created by the AI simulator
        }
      );
      const orderResult = await orderResponse.json();
      
      if (!orderResult || !orderResult.id) {
        throw new Error("Failed to create order");
      }
      
      updateStepStatus(1, "completed", "Order created successfully", orderResult);
      
      // Step 3: Generate kitchen token
      updateStepStatus(2, "processing", "Generating kitchen token...");
      console.log("Making API request to create kitchen token");
      const kitchenTokenResponse = await apiRequest(
        "POST",
        "/api/simulator/create-kitchen-token",
        {
          orderId: orderResult.id,
          status: "pending",
          isUrgent: false
        }
      );
      
      // Check if response is HTML by looking at content-type
      const contentType = kitchenTokenResponse.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Received HTML response instead of JSON');
        const htmlContent = await kitchenTokenResponse.text();
        console.error('Response content:', htmlContent);
        throw new Error('Received HTML response from server. See console for details.');
      }
      
      const kitchenTokenResult = await kitchenTokenResponse.json();
      
      if (!kitchenTokenResult || !kitchenTokenResult.id) {
        throw new Error("Failed to create kitchen token");
      }
      
      updateStepStatus(2, "completed", "Kitchen token generated", kitchenTokenResult);
      
      // Simulate kitchen preparing the order
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update kitchen token status to 'preparing'
      const updatedTokenResponse = await apiRequest(
        "PATCH",
        `/api/kitchen-tokens/${kitchenTokenResult.id}`,
        {
          status: "preparing"
        }
      );
      const updatedToken = await updatedTokenResponse.json();
      
      updateStepStatus(2, "completed", "Kitchen is preparing the order", updatedToken);
      
      // Step 4: Process payment
      updateStepStatus(3, "processing", "Processing payment...");
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const paymentResult = {
        id: "pmt_" + Math.random().toString(36).substring(2, 10),
        amount: orderResult.totalAmount,
        status: "completed",
        method: "card",
        timestamp: new Date().toISOString()
      };
      
      updateStepStatus(3, "completed", "Payment processed successfully", paymentResult);
      
      // Step 5: Generate bill
      updateStepStatus(4, "processing", "Generating bill...");
      
      console.log("Creating bill for order:", orderResult.id);
      const billResponse = await apiRequest(
        "POST",
        "/api/simulator/create-bill",
        {
          orderId: orderResult.id,
          amount: orderResult.totalAmount,
          subtotal: orderResult.totalAmount * 0.9, // 90% of total
          tax: orderResult.totalAmount * 0.1, // 10% of total
          discount: 0,
          total: orderResult.totalAmount,
          paymentMethod: "card",
          status: "paid",
          customerName: "AI Customer",
          customerPhone: "+911234567890"
        }
      );
      
      // Check if response is HTML
      const billContentType = billResponse.headers.get('content-type');
      if (billContentType && billContentType.includes('text/html')) {
        console.error('Received HTML response instead of JSON for bill creation');
        const htmlContent = await billResponse.text();
        console.error('Bill response content:', htmlContent);
        throw new Error('Received HTML response from server for bill creation');
      }
      
      const billResult = await billResponse.json();
      
      if (!billResult || !billResult.id) {
        throw new Error("Failed to generate bill");
      }
      
      updateStepStatus(4, "completed", "Bill generated successfully", billResult);
      
      // Invalidate queries to refresh data across the application
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      toast({
        title: "Order Completed",
        description: "The AI order simulation has completed successfully!",
      });
      
    } catch (error) {
      console.error("Order simulation failed:", error);
      const failedStepIndex = steps.findIndex(step => step.status === "processing");
      
      if (failedStepIndex >= 0) {
        updateStepStatus(
          failedStepIndex, 
          "error", 
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
      
      toast({
        title: "Error",
        description: "The order simulation failed. Please check the console for more details.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStepStatusIcon = (status: ProcessStep["status"]) => {
    switch (status) {
      case "pending":
        return null;
      case "processing":
        return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className="bg-neutral-800 border-neutral-700 w-full">
      <CardHeader>
        <CardTitle className="text-white">AI Order Simulator</CardTitle>
        <CardDescription className="text-neutral-400">
          Test the complete AI order processing flow from natural language to bill generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            value={naturalLanguageOrder}
            onChange={(e) => setNaturalLanguageOrder(e.target.value)}
            placeholder="Enter a natural language order..."
            className="min-h-[100px] bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
            disabled={processing}
          />
        </div>
        
        <Button
          onClick={simulateOrder}
          className="w-full bg-purple-900 hover:bg-purple-800 text-white"
          disabled={processing || !naturalLanguageOrder.trim()}
        >
          {processing ? "Processing..." : "Process Order with AI"}
        </Button>
        
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-white mb-3">Processing Steps</h3>
          
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`p-3 rounded-md border ${
                step.status === "error" 
                  ? "border-red-800 bg-red-900 bg-opacity-20" 
                  : step.status === "completed" 
                    ? "border-green-800 bg-green-900 bg-opacity-20" 
                    : step.status === "processing" 
                      ? "border-blue-800 bg-blue-900 bg-opacity-20"
                      : "border-neutral-700 bg-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5">
                    {getStepStatusIcon(step.status)}
                  </span>
                  <span className={`text-sm font-medium ${
                    step.status === "error" 
                      ? "text-red-400" 
                      : step.status === "completed" 
                        ? "text-green-400" 
                        : step.status === "processing" 
                          ? "text-blue-400"
                          : "text-neutral-400"
                  }`}>
                    {step.name}
                  </span>
                </div>
                <span className="text-xs text-neutral-500 capitalize">
                  {step.status}
                </span>
              </div>
              
              {step.details && (
                <p className="text-xs mt-1 text-neutral-400">
                  {step.details}
                </p>
              )}
              
              {step.status === "completed" && step.data && step.name === "Parse order with AI" && (
                <div className="mt-2 p-2 bg-neutral-900 rounded-md border border-neutral-700">
                  <p className="text-xs text-neutral-400 font-medium mb-1">Processed Items:</p>
                  <ul className="text-xs text-neutral-300 space-y-1">
                    {step.data.items.map((item: any, i: number) => (
                      <li key={i}>• {item.quantity || 1}x {item.name} {item.specialInstructions ? `(${item.specialInstructions})` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
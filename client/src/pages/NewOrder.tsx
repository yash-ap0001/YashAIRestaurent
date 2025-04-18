import { OrderForm } from "@/components/orders/OrderForm";
import { 
  Utensils, 
  Clipboard, 
  ArrowLeft, 
  MessageSquareText, 
  ReceiptText, 
  Mic, 
  MicOff, 
  Send, 
  ClipboardList,
  FileText,
  Sparkles,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NewOrder() {
  const [activeTab, setActiveTab] = useState("menu-order");
  const [aiOrderInput, setAiOrderInput] = useState("");
  const [isProcessingAiOrder, setIsProcessingAiOrder] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const { toast } = useToast();
  
  // Process AI natural language order
  const processAiOrder = async () => {
    if (!aiOrderInput.trim()) return;
    
    setIsProcessingAiOrder(true);
    
    try {
      const response = await apiRequest("POST", "/api/ai/process-order", {
        text: aiOrderInput
      });
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        setOrderItems(data.items);
        toast({
          title: "Order processed",
          description: `Successfully processed your order with ${data.items.length} items.`,
        });
      } else {
        toast({
          title: "No items detected",
          description: "Unable to detect menu items in your description. Please try again with more specific details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing AI order:", error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your natural language order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAiOrder(false);
    }
  };
  
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="bg-neutral-950 p-1 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="-ml-2 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white ml-2">
            Create New Order
          </h1>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-gray-500">
          <div className="flex items-center gap-1">
            <Utensils className="h-4 w-4 text-blue-500" />
            <span className="text-xs">Menu Selection</span>
          </div>
          <div className="flex items-center gap-1">
            <Clipboard className="h-4 w-4 text-blue-500" />
            <span className="text-xs">AI Processing</span>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-blue-950/40 h-7 w-full p-1 justify-start gap-2 m-1 rounded">
          <TabsTrigger value="menu-order" className="h-7 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Utensils className="h-3.5 w-3.5 mr-1.5" /> 
            Menu Order
          </TabsTrigger>
          <TabsTrigger value="ai-order" className="h-7 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI Natural Language Order
          </TabsTrigger>
          <TabsTrigger value="voice-order" className="h-7 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <MessageSquareText className="h-3.5 w-3.5 mr-1.5" />
            Voice Order
          </TabsTrigger>
          <TabsTrigger value="external-order" className="h-7 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <ReceiptText className="h-3.5 w-3.5 mr-1.5" />
            External Order
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-hidden bg-neutral-900">
          <TabsContent value="menu-order" className="h-[calc(100vh-90px)] m-0 data-[state=active]:block overflow-hidden">
            <div className="h-full overflow-hidden">
              <OrderForm />
            </div>
          </TabsContent>
          
          {/* AI Natural Language Order Tab Content */}
          <TabsContent value="ai-order" className="h-[calc(100vh-90px)] m-0 data-[state=active]:block overflow-hidden">
            <div className="flex h-full overflow-hidden">
              {/* Left Column - AI Order Input */}
              <div className="w-1/2 h-full border-r border-gray-800 p-3 flex flex-col">
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AI Natural Language Order</h3>
                    <p className="text-sm text-gray-400">Describe your order in simple sentences</p>
                  </div>
                </div>
                
                <div className="bg-purple-950/20 rounded-lg p-3 border border-purple-900/30 mb-3">
                  <h4 className="text-sm font-medium text-purple-300 mb-1">How to use:</h4>
                  <ul className="text-sm text-gray-300 space-y-1 list-disc pl-5">
                    <li>Type your order in natural language</li>
                    <li>You can include quantities and special instructions</li>
                    <li>Our AI supports Hindi, Telugu, English, and Spanish</li>
                    <li>For example: "I'd like 2 veg biryani, 1 butter naan, and a mango lassi. Make the biryani spicy."</li>
                  </ul>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 rounded-lg border border-purple-800/40 overflow-hidden mb-3">
                    <Textarea
                      placeholder="Type your order in natural language here..."
                      value={aiOrderInput}
                      onChange={(e) => setAiOrderInput(e.target.value)}
                      className="h-full bg-black/70 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-white text-sm placeholder:text-gray-500"
                    />
                  </div>
                  
                  <Button
                    type="button"
                    onClick={processAiOrder}
                    disabled={isProcessingAiOrder || !aiOrderInput.trim()}
                    className="w-full font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
                  >
                    {isProcessingAiOrder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Process Natural Language Order
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Right Column - Order Summary */}
              <div className="w-1/2 h-full p-3 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-white">Your Order Summary</h3>
                  <div className="text-sm bg-purple-900/30 px-2 py-1 rounded-full text-purple-300 border border-purple-800/50">
                    {orderItems.length || 0} items
                  </div>
                </div>
                
                <div className="flex-1 bg-black/70 rounded-lg border border-gray-800 overflow-hidden">
                  {orderItems.length > 0 ? (
                    <div className="h-full p-3 overflow-auto">
                      {orderItems.map((item, index) => (
                        <div key={index} className="mb-3 p-2 border border-purple-900/20 rounded-md bg-purple-950/10">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-white">{item.name}</h4>
                            <span className="text-purple-300">x{item.quantity}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-400">{item.specialInstructions || "No special instructions"}</span>
                            <span className="text-white">₹{item.price * item.quantity}</span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
                        <span className="font-bold text-white">Total Amount:</span>
                        <span className="text-lg font-bold text-white">
                          ₹{orderItems.reduce((total, item) => total + (item.price * item.quantity), 0)}
                        </span>
                      </div>
                      
                      <div className="mt-4">
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                          Place Order
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <Sparkles className="h-12 w-12 text-purple-500 mb-4" />
                      <h3 className="text-xl font-bold text-white">Your order is empty</h3>
                      <p className="text-gray-400 text-center mt-2 max-w-xs">
                        Use the natural language input on the left to describe your order
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="voice-order" className="h-[calc(100vh-90px)] m-0 data-[state=active]:block overflow-hidden">
            <div className="flex h-full overflow-hidden">
              {/* Left Column - Voice Order Input */}
              <div className="w-1/2 h-full border-r border-gray-800 p-3 flex flex-col">
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
                    <MessageSquareText className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Voice Order</h3>
                    <p className="text-sm text-gray-400">Speak naturally to place your order</p>
                  </div>
                </div>
                
                <div className="bg-neutral-950 rounded-lg p-4 border border-blue-800 flex flex-col items-center mb-4">
                  <div className="w-24 h-24 bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                    <Mic className="h-12 w-12 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Voice Recognition</h3>
                  <p className="text-gray-400 text-center mt-2 mb-4">
                    Speak naturally and our AI will recognize items, quantities, and special instructions.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-900/50">
                      <MicOff className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Mic className="h-4 w-4 mr-2" />
                      Start Recording
                    </Button>
                  </div>
                </div>
                
                <div className="bg-blue-950/20 rounded-lg p-3 border border-blue-900/30 mb-3">
                  <h4 className="text-sm font-medium text-blue-300 mb-1">Voice Order Tips:</h4>
                  <ul className="text-sm text-gray-300 space-y-1 list-disc pl-5">
                    <li>Speak clearly and at a moderate pace</li>
                    <li>Specify quantity before each item (e.g., "2 Veg Biryani")</li>
                    <li>Include special instructions after the item name</li>
                    <li>Our AI understands Hindi, Telugu, English, and Spanish</li>
                    <li>You can say "cancel" or "start over" to reset your order</li>
                  </ul>
                </div>
                
                <div className="flex-1 overflow-auto rounded-lg border border-blue-900/30 bg-black p-3">
                  <div className="flex items-center mb-2">
                    <FileText className="h-5 w-5 text-blue-400 mr-2" />
                    <h4 className="font-medium text-white">Transcription</h4>
                  </div>
                  <div className="text-gray-300 p-3 border border-blue-900/30 rounded-lg min-h-[100px] text-sm">
                    <p className="text-gray-500 italic">Your voice input will appear here...</p>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Order Summary */}
              <div className="w-1/2 h-full p-3 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-white">Your Order Summary</h3>
                  <div className="text-sm bg-blue-900/30 px-2 py-1 rounded-full text-blue-300 border border-blue-800/50">
                    0 items
                  </div>
                </div>
                
                <div className="flex-1 bg-black rounded-lg border border-gray-800 overflow-hidden">
                  <div className="h-full flex flex-col items-center justify-center">
                    <MessageSquareText className="h-12 w-12 text-blue-500 mb-4" />
                    <h3 className="text-xl font-bold text-white">Your order is empty</h3>
                    <p className="text-gray-400 text-center mt-2 max-w-xs">
                      Use the voice recognition on the left to start adding items to your order
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="external-order" className="h-[calc(100vh-90px)] m-0 p-6 data-[state=active]:flex flex-col">
            <div className="bg-neutral-950 rounded-xl p-6 border border-gray-800 flex flex-col items-center">
              <ReceiptText className="h-16 w-16 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold text-white">External Order</h2>
              <p className="text-gray-400 text-center mt-2 max-w-md">
                Process orders from external platforms like Zomato, Swiggy, or other delivery services.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Button className="bg-red-600 hover:bg-red-700">
                  Zomato Order
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  Swiggy Order
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

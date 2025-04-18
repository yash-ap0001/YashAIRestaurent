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
  FileText
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewOrder() {
  const [activeTab, setActiveTab] = useState("menu-order");
  
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="bg-neutral-950 p-2 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
        <div>
          <Link href="/">
            <Button variant="ghost" className="-ml-3 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Create New Order
          </h1>
        </div>
        
        <div className="hidden md:flex items-center gap-6 text-gray-500">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-blue-500" />
            <span className="text-sm">Easy Menu Selection</span>
          </div>
          <div className="flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-blue-500" />
            <span className="text-sm">AI-Powered Order Processing</span>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-blue-950/40 h-9 w-full p-1 justify-start gap-2 m-2 rounded">
          <TabsTrigger value="menu-order" className="h-7 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Utensils className="h-3.5 w-3.5 mr-1.5" /> 
            Menu Order
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
          <TabsContent value="menu-order" className="h-[calc(100vh-120px)] m-0 data-[state=active]:block overflow-hidden">
            <div className="h-full overflow-hidden">
              <OrderForm />
            </div>
          </TabsContent>
          
          <TabsContent value="voice-order" className="h-[calc(100vh-120px)] m-0 data-[state=active]:block overflow-hidden">
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
          
          <TabsContent value="external-order" className="h-[calc(100vh-120px)] m-0 p-8 data-[state=active]:flex flex-col">
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

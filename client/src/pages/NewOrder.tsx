import { OrderForm } from "@/components/orders/OrderForm";
import { Utensils, Clipboard, ArrowLeft, MessageSquareText, ReceiptText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewOrder() {
  const [activeTab, setActiveTab] = useState("menu-order");
  
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="bg-neutral-950 p-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
        <div>
          <Link href="/">
            <Button variant="ghost" className="mb-2 -ml-3 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">
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
        <TabsList className="bg-neutral-950 border-b border-gray-800 h-10 px-4 w-full justify-start gap-2">
          <TabsTrigger value="menu-order" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300">
            <Utensils className="h-4 w-4 mr-2" /> 
            Menu Order
          </TabsTrigger>
          <TabsTrigger value="voice-order" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300">
            <MessageSquareText className="h-4 w-4 mr-2" />
            Voice Order
          </TabsTrigger>
          <TabsTrigger value="external-order" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300">
            <ReceiptText className="h-4 w-4 mr-2" />
            External Order
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-hidden bg-neutral-900">
          <TabsContent value="menu-order" className="h-full m-0 data-[state=active]:block overflow-hidden">
            <div className="h-full overflow-hidden">
              <OrderForm />
            </div>
          </TabsContent>
          
          <TabsContent value="voice-order" className="flex-1 h-full m-0 p-8 data-[state=active]:flex flex-col">
            <div className="bg-neutral-950 rounded-xl p-6 border border-gray-800 flex flex-col items-center">
              <MessageSquareText className="h-16 w-16 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold text-white">Voice Order</h2>
              <p className="text-gray-400 text-center mt-2 max-w-md">
                Speak naturally to create an order. Our AI will recognize items, quantities, and special instructions.
              </p>
              <Button className="mt-6 bg-blue-600 hover:bg-blue-700">
                Start Voice Recognition
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="external-order" className="flex-1 h-full m-0 p-8 data-[state=active]:flex flex-col">
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

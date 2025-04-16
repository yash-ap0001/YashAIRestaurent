import { OrderForm } from "@/components/orders/OrderForm";
import { Utensils, Clipboard, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NewOrder() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/">
            <Button variant="ghost" className="mb-2 -ml-3 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Create New Order
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Create a new order for in-restaurant guests, or enter orders from external platforms 
            like Zomato and Swiggy. You can also use our AI-powered natural language order processing.
          </p>
        </div>
        
        <div className="hidden md:flex items-center gap-6 text-gray-500">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-purple-500" />
            <span className="text-sm">Easy Menu Selection</span>
          </div>
          <div className="flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-purple-500" />
            <span className="text-sm">AI-Powered Order Processing</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-1 rounded-2xl">
        <OrderForm />
      </div>
    </div>
  );
}

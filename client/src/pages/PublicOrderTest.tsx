import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, ShoppingBag, Smartphone, User, Phone, Globe } from "lucide-react";
import { SiZomato, SiSwiggy } from "react-icons/si";
import { initializeWebSocket } from "@/lib/queryClient";

// Type definitions
interface Order {
  id: number;
  orderNumber: string;
  tableNumber?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderSource: string;
  notes?: string;
}

// Format currency utility
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Get the appropriate icon for order source
const getSourceIcon = (source: string) => {
  switch (source?.toLowerCase()) {
    case 'zomato':
      return <SiZomato className="h-4 w-4" />;
    case 'swiggy':
      return <SiSwiggy className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'whatsapp':
      return <Smartphone className="h-4 w-4" />;
    case 'manual':
      return <User className="h-4 w-4" />;
    case 'ai':
      return <Globe className="h-4 w-4" />;
    default:
      return <ExternalLink className="h-4 w-4" />;
  }
};

// Status colors for badges
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-200 text-amber-800';
    case 'preparing':
      return 'bg-indigo-200 text-indigo-800';
    case 'ready':
      return 'bg-emerald-200 text-emerald-800';
    case 'completed':
      return 'bg-purple-200 text-purple-800';
    case 'billed':
      return 'bg-pink-200 text-pink-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

export default function PublicOrderTest() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  // Initialize WebSocket manually - this is a public page
  useEffect(() => {
    console.log('Initializing WebSocket connection for public test page');
    initializeWebSocket();
  }, []);

  // Query to fetch all orders directly from the API
  const { data: orders = [], isLoading, isError, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000, // Poll every 5 seconds
    retry: 3,
    staleTime: 0,
    // Force bypass any cache to ensure we get fresh data
    queryFn: async () => {
      console.log("Directly fetching orders for PublicOrderTest page");
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      console.log("Fetched orders:", data);
      return data;
    }
  });
  
  // Filter orders based on search term
  const filteredOrders = orders.filter((order: Order) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(searchTermLower) ||
      (order.tableNumber?.toLowerCase() || "").includes(searchTermLower) ||
      order.status.toLowerCase().includes(searchTermLower) ||
      order.orderSource.toLowerCase().includes(searchTermLower) ||
      (order.notes?.toLowerCase() || "").includes(searchTermLower)
    );
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Public Order Test Page</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              console.log("Manual refresh clicked");
              refetch();
              toast({
                title: "Refreshing orders",
                description: "Fetching latest orders from the server...",
              });
            }} 
            variant="default"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh Orders
          </Button>
        </div>
      </div>
      
      <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 mb-4">
        <p className="font-bold">🔍 Testing Mode</p>
        <p>This is a public page for testing order display without authentication. All orders in the system are shown here.</p>
        <p className="mt-2 text-sm">Total orders loaded: {orders.length}</p>
        {orders.length > 0 && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer hover:underline">Debug: Show order sources</summary>
            <ul className="mt-1 list-disc list-inside">
              {Array.from(new Set(orders.map(o => o.orderSource))).map(source => (
                <li key={source}>{source || "undefined"}: {orders.filter(o => o.orderSource === source).length} orders</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      
      <div className="mb-4">
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading orders...</span>
        </div>
      ) : isError ? (
        <div className="text-red-600 p-4 border border-red-300 rounded bg-red-50">
          Error loading orders. Please try again.
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-gray-600 p-4 border border-gray-300 rounded bg-gray-50">
          No orders found. Try adjusting your search or create a new order.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order: Order) => (
            <div 
              key={order.id} 
              className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg">{order.orderNumber}</h3>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                <span className="font-medium mr-1">Source:</span>
                {getSourceIcon(order.orderSource)}
                <span>{order.orderSource || "Unknown"}</span>
              </div>
              
              {order.tableNumber && (
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium mr-1">Table:</span>
                  {order.tableNumber}
                </div>
              )}
              
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-medium mr-1">Amount:</span>
                {formatCurrency(order.totalAmount)}
              </div>
              
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-medium mr-1">Created:</span>
                {format(new Date(order.createdAt), "MMM d, HH:mm")}
              </div>
              
              {order.notes && (
                <div className="text-sm mt-2 border-t pt-2">
                  <span className="font-medium">Notes:</span>
                  <p className="text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
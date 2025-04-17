import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Minus, X, Send, AlignLeft, Search, ListChecks, Sparkles, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  dietaryInfo: string[];
  isAvailable: boolean;
  imageUrl?: string;
}

interface OrderItem {
  menuItemId: number;
  menuItemName?: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

interface SingleOrderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SingleOrderDialog({ open, onClose }: SingleOrderDialogProps) {
  const [tableNumber, setTableNumber] = useState("T1");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("menu-select");
  const [aiOrderInput, setAiOrderInput] = useState("");
  const [isProcessingAiOrder, setIsProcessingAiOrder] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch menu items
  const { data: menuItems = [], isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  // Extract unique categories
  const categories = menuItems.reduce((acc: string[], item) => {
    if (!acc.includes(item.category)) {
      acc.push(item.category);
    }
    return acc;
  }, []);

  // Filter menu items by category and search query
  const filteredMenuItems = menuItems
    .filter(item => {
      // Apply category filter
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      // Apply search filter
      const matchesSearch = 
        !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      tableNumber: string;
      orderItems: OrderItem[];
      notes?: string;
    }) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Order created successfully:', data);
      console.log('Order data structure received from server:', JSON.stringify(data, null, 2));
      
      if (!data || !data.id || !data.orderNumber) {
        console.error('Warning: Order data is incomplete. Missing critical fields:', data);
      }
      
      // Optimistically update the orders cache with the new order
      queryClient.setQueryData(['/api/orders'], (oldData: any[] | undefined) => {
        if (!oldData) {
          console.log('No existing orders data, creating new array with just this order');
          return [data];
        }
        console.log('Adding new order to existing orders data. New total:', oldData.length + 1);
        return [data, ...oldData];
      });
      
      // Then invalidate all related queries 
      console.log('Invalidating orders query cache');
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Immediately refetch the orders to ensure consistent data
      console.log('Triggering immediate refetch of orders');
      queryClient.refetchQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: "Order created",
        description: `Order #${data.orderNumber} has been created successfully.`,
      });
      
      // Add a slight delay before closing to ensure UI updates are visible
      setTimeout(() => {
        resetForm();
        onClose();
      }, 500);
    },
    onError: (error: Error) => {
      console.error('Failed to create order:', error);
      toast({
        title: "Failed to create order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset form when dialog is opened
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setTableNumber("T1");
    setSelectedCategory("all");
    setOrderItems([]);
    setNotes("");
    setAiOrderInput("");
  };
  
  // Process natural language order with AI
  const processAiOrder = async () => {
    if (!aiOrderInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter your order in natural language",
        variant: "destructive",
      });
      return;
    }
    
    if (isProcessingAiOrder) return; // Prevent multiple submissions
    
    try {
      setIsProcessingAiOrder(true);
      
      toast({
        title: "Processing",
        description: "Analyzing your natural language order...",
      });
      
      const response = await apiRequest("POST", "/api/ai/process-order", {
        orderText: aiOrderInput,
        tableNumber: tableNumber
      });
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        // Set order items based on AI processing results
        const processedItems = data.items.map((item: any) => ({
          menuItemId: item.menuItemId,
          menuItemName: item.name,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions || "",
        }));
        
        setOrderItems(processedItems);
        setActiveTab("menu-select"); // Switch to menu view to show selections
        
        toast({
          title: "Order processed",
          description: `Successfully identified ${processedItems.length} items from your request`,
        });
      } else {
        toast({
          title: "Processing issue",
          description: "Couldn't identify menu items in your request. Please try different wording or select items manually.",
          variant: "destructive",
        });
      }
      
      // Clear the AI input field
      setAiOrderInput("");
      
    } catch (error) {
      console.error("Error processing AI order:", error);
      toast({
        title: "Error",
        description: "Failed to process your natural language order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAiOrder(false);
    }
  };

  const addOrderItem = (menuItem: MenuItem) => {
    // Check if the item is already in the order
    const existingItemIndex = orderItems.findIndex(
      item => item.menuItemId === menuItem.id
    );

    if (existingItemIndex >= 0) {
      // Update quantity if item already exists
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Add new item to order
      setOrderItems([
        ...orderItems,
        {
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          quantity: 1,
          price: menuItem.price,
        },
      ]);
    }
  };

  const updateItemQuantity = (index: number, change: number) => {
    const updatedItems = [...orderItems];
    const newQuantity = updatedItems[index].quantity + change;

    if (newQuantity <= 0) {
      // Remove item if quantity becomes zero or negative
      updatedItems.splice(index, 1);
    } else {
      // Update quantity
      updatedItems[index].quantity = newQuantity;
    }

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };

  const handleSubmit = () => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    // Determine if this order was created using AI
    const wasCreatedWithAI = activeTab === "ai-order";

    // Prepare order data for submission
    const orderData = {
      tableNumber,
      orderItems: orderItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.specialInstructions || "",
      })),
      // Also include items array for compatibility (some endpoints might expect this format)
      items: orderItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.specialInstructions || "",
      })),
      notes: notes || undefined,
      orderSource: wasCreatedWithAI ? "ai_dialog" : "manual_dialog", // Differentiate between AI and manual orders
      status: "pending",
      totalAmount: totalAmount,
      useAIAutomation: wasCreatedWithAI // Enable AI automation for orders created with AI
    };

    // Log the order being created for debugging
    console.log('Creating order with data:', orderData);
    
    // Disable button during submission
    createOrderMutation.mutate(orderData);
  };

  // Calculate total amount
  const totalAmount = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-6xl h-[650px] overflow-hidden bg-neutral-900 border border-gray-800 shadow-lg p-0">
        {/* Header with Table Selection & Create Button */}
        <div className="flex px-4 py-2 border-b border-gray-800 gap-4 bg-neutral-950 h-14 items-center">
          <DialogTitle className="text-xl font-bold text-white">Create Order</DialogTitle>
          
          <div className="flex items-center gap-2 ml-4">
            <span className="text-white font-medium text-sm whitespace-nowrap">Table:</span>
            <Select
              value={tableNumber}
              onValueChange={(value) => setTableNumber(value)}
            >
              <SelectTrigger className="w-20 h-8 border-blue-600 bg-black text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="T1" />
              </SelectTrigger>
              <SelectContent className="bg-black border-blue-600 text-white">
                {Array.from({ length: 10 }, (_, i) => (
                  <SelectItem key={i} value={`T${i + 1}`} className="text-white focus:bg-blue-600 focus:text-white">
                    T{i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 flex justify-center">
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending || orderItems.length === 0}
              className={`h-9 px-6 font-bold ${orderItems.length === 0 ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50'}`}
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Create Order</>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="h-[calc(100%-110px)] overflow-hidden flex flex-col">
          {/* Tab Selector */}
          <div className="border-b border-gray-800 bg-neutral-950">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 h-9 w-full p-1 bg-blue-950/40">
                <TabsTrigger 
                  value="menu-select" 
                  className="h-7 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                  Menu Selection
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-order" 
                  className="h-7 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  AI Natural Language Order
                </TabsTrigger>
              </TabsList>
              
              {/* Menu Selection Tab Content */}
              <TabsContent value="menu-select" className="mt-0 h-[calc(100vh-280px)]">
                <div className="flex h-full">
                  {/* Left Column - Menu Items */}
                  <div className="w-1/2 h-full border-r border-gray-800 p-3 flex flex-col">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="bg-black rounded-lg flex-1">
                        <div className="flex items-center p-1">
                          <Search className="h-4 w-4 text-gray-400 ml-2" />
                          <Input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 bg-transparent text-white placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                      
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="w-[130px] h-8 border-blue-600 bg-black text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-blue-600 text-white">
                          <SelectItem value="all" className="text-white focus:bg-blue-800 focus:text-white">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category} className="text-white focus:bg-blue-800 focus:text-white">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isLoadingMenu ? (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                        <p className="text-sm text-gray-500">Loading menu items...</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto rounded-lg border border-gray-800 bg-black p-2">
                        <div className="grid grid-cols-2 gap-2">
                          {filteredMenuItems.map((menuItem) => {
                            // Check if this item is already in the order
                            const existingItem = orderItems.find(item => item.menuItemId === menuItem.id);
                            const isInOrder = !!existingItem;
                            
                            return (
                              <div
                                key={menuItem.id}
                                onClick={() => menuItem.isAvailable && addOrderItem(menuItem)}
                                className={`
                                  relative cursor-pointer rounded-lg p-3 transition-all duration-200
                                  ${!menuItem.isAvailable ? 'opacity-50 cursor-not-allowed bg-black' : 
                                    isInOrder ? 'bg-blue-900/20 border border-blue-700' : 
                                    'bg-black hover:bg-blue-900/20 transition-colors flex flex-col border border-blue-900/30'}
                                `}
                              >
                                {isInOrder && (
                                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold">
                                    {existingItem.quantity}
                                  </div>
                                )}
                                
                                <h4 className="font-medium text-white">{menuItem.name}</h4>
                                <p className="text-xs text-gray-400 mt-1 mb-1 line-clamp-2">{menuItem.description || 'Fragrant basmati rice dish'}</p>
                                <span className="text-blue-500 font-semibold mt-auto">{formatCurrency(menuItem.price)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Order Items */}
                  <div className="w-1/2 h-full p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white">Your Order Summary</h3>
                      {orderItems.length > 0 && (
                        <div className="text-sm bg-blue-900/30 px-2 py-1 rounded-full text-blue-300 border border-blue-800/50">
                          {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 bg-black rounded-lg border border-gray-800 overflow-hidden">
                      {orderItems.length > 0 ? (
                        <div className="h-full flex flex-col">
                          <div className="flex-1 overflow-auto p-2 space-y-2">
                            {orderItems.map((item, index) => {
                              const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                              return (
                                <div key={index} className="border border-blue-800/50 rounded-lg p-3 space-y-2 hover:bg-blue-900/20 transition-colors">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <h4 className="font-bold text-white">{item.menuItemName || (menuItem ? menuItem.name : `Item #${item.menuItemId}`)}</h4>
                                      <p className="text-sm text-blue-300">{formatCurrency(item.price)} per item</p>
                                    </div>
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:bg-red-900/30 hover:text-red-300 rounded-full"
                                      onClick={() => removeOrderItem(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <Button 
                                      type="button"
                                      variant="outline" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-full border-blue-600 text-blue-400 hover:bg-blue-900 hover:text-white"
                                      onClick={() => updateItemQuantity(index, -1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="mx-3 w-6 text-center font-bold text-white">{item.quantity}</span>
                                    <Button 
                                      type="button"
                                      variant="outline" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-full border-blue-600 text-blue-400 hover:bg-blue-900 hover:text-white"
                                      onClick={() => updateItemQuantity(index, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <span className="ml-auto font-bold text-blue-400">
                                      {formatCurrency(item.price * item.quantity)}
                                    </span>
                                  </div>
                                  
                                  <Input
                                    placeholder="Special instructions..."
                                    value={item.specialInstructions || ""}
                                    onChange={(e) => {
                                      const updatedItems = [...orderItems];
                                      updatedItems[index].specialInstructions = e.target.value;
                                      setOrderItems(updatedItems);
                                    }}
                                    className="text-xs h-7 border border-blue-600 bg-black text-white placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="p-3 bg-blue-900/30 flex justify-between items-center border-t border-blue-800">
                            <span className="font-bold text-blue-300">Total Amount</span>
                            <span className="text-xl font-extrabold text-white">
                              {formatCurrency(totalAmount)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center">
                          <Send className="h-12 w-12 text-blue-500 mb-4" />
                          <h3 className="text-xl font-bold text-white">Your order is empty</h3>
                          <p className="text-gray-400 text-center mt-2 max-w-xs">
                            Add items from the menu on the left to create your order
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* AI Natural Language Order Tab Content */}
              <TabsContent value="ai-order" className="mt-0 h-[calc(100vh-280px)]">
                <div className="flex h-full">
                  {/* Left Column - AI Natural Language Input */}
                  <div className="w-1/2 h-full border-r border-gray-800 p-3 flex flex-col">
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
                        <Sparkles className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Natural Language Order</h3>
                        <p className="text-sm text-gray-400">Describe your order in natural language</p>
                      </div>
                    </div>
                    
                    <div className="relative mb-4">
                      <Textarea 
                        value={aiOrderInput}
                        onChange={(e) => setAiOrderInput(e.target.value)}
                        onKeyDown={(e) => {
                          // Handle Ctrl+Enter or Cmd+Enter to submit
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            processAiOrder();
                          }
                        }}
                        placeholder="Type your order here, for example: 'I want 2 Veg Biryani, 1 Butter Chicken with extra spice, 3 Garlic Naan, and 2 Sweet Lassi'"
                        className="w-full h-32 bg-neutral-950 border-blue-800 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-600 focus:ring-blue-600"
                      />
                      <Button
                        type="button"
                        className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700"
                        onClick={processAiOrder}
                        disabled={isProcessingAiOrder || !aiOrderInput.trim()}
                      >
                        {isProcessingAiOrder ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Process Order
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="bg-blue-950/20 rounded-lg p-3 border border-blue-900/30 mb-3">
                      <h4 className="text-sm font-medium text-blue-300 mb-1">Tips for Natural Language Orders:</h4>
                      <ul className="text-sm text-gray-300 space-y-1 list-disc pl-5">
                        <li>Specify quantity before each item (e.g., "2 Veg Biryani")</li>
                        <li>Include special instructions after the item name (e.g., "Butter Chicken with extra spice")</li>
                        <li>You can mix multiple items in a single request</li>
                        <li>Our AI understands Hindi, Telugu, English, and Spanish</li>
                        <li><span className="text-blue-300">Pro tip:</span> Use <kbd className="px-1 py-0.5 bg-blue-900/50 rounded text-xs border border-blue-700 mx-1">Ctrl+Enter</kbd> to quickly process your order</li>
                      </ul>
                    </div>
                    
                    <div className="flex-1 overflow-auto rounded-lg border border-blue-900/30 bg-black p-3">
                      <div className="flex items-center mb-2">
                        <MessageSquare className="h-5 w-5 text-blue-400 mr-2" />
                        <h4 className="font-medium text-white">Example Orders</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="border border-blue-900/30 rounded-md p-2 hover:bg-blue-900/10 cursor-pointer"
                          onClick={() => setAiOrderInput("3 Veg Biryani, 2 Butter Chicken, 5 Naan, and 2 Mango Lassi")}>
                          <p className="text-sm text-gray-300">3 Veg Biryani, 2 Butter Chicken, 5 Naan, and 2 Mango Lassi</p>
                        </div>
                        <div className="border border-blue-900/30 rounded-md p-2 hover:bg-blue-900/10 cursor-pointer"
                          onClick={() => setAiOrderInput("मुझे 2 पनीर टिक्का, 1 दाल फ्राई और 3 बटर नान चाहिए")}>
                          <p className="text-sm text-gray-300">मुझे 2 पनीर टिक्का, 1 दाल फ्राई और 3 बटर नान चाहिए</p>
                        </div>
                        <div className="border border-blue-900/30 rounded-md p-2 hover:bg-blue-900/10 cursor-pointer"
                          onClick={() => setAiOrderInput("Quiero 2 pollo al curry, 1 arroz con verduras y 3 naan de ajo")}>
                          <p className="text-sm text-gray-300">Quiero 2 pollo al curry, 1 arroz con verduras y 3 naan de ajo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Order Summary */}
                  <div className="w-1/2 h-full p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white">Your Order Summary</h3>
                      {orderItems.length > 0 && (
                        <div className="text-sm bg-blue-900/30 px-2 py-1 rounded-full text-blue-300 border border-blue-800/50">
                          {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 bg-black rounded-lg border border-gray-800 overflow-hidden">
                      {orderItems.length > 0 ? (
                        <div className="h-full flex flex-col">
                          <div className="flex-1 overflow-auto p-2 space-y-2">
                            {orderItems.map((item, index) => {
                              const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                              return (
                                <div key={index} className="border border-blue-800/50 rounded-lg p-3 space-y-2 hover:bg-blue-900/20 transition-colors">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <h4 className="font-bold text-white">{item.menuItemName || (menuItem ? menuItem.name : `Item #${item.menuItemId}`)}</h4>
                                      <p className="text-sm text-blue-300">{formatCurrency(item.price)} per item</p>
                                    </div>
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:bg-red-900/30 hover:text-red-300 rounded-full"
                                      onClick={() => removeOrderItem(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <Button 
                                      type="button"
                                      variant="outline" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-full border-blue-600 text-blue-400 hover:bg-blue-900 hover:text-white"
                                      onClick={() => updateItemQuantity(index, -1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="mx-3 w-6 text-center font-bold text-white">{item.quantity}</span>
                                    <Button 
                                      type="button"
                                      variant="outline" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-full border-blue-600 text-blue-400 hover:bg-blue-900 hover:text-white"
                                      onClick={() => updateItemQuantity(index, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <span className="ml-auto font-bold text-blue-400">
                                      {formatCurrency(item.price * item.quantity)}
                                    </span>
                                  </div>
                                  
                                  <Input
                                    placeholder="Special instructions..."
                                    value={item.specialInstructions || ""}
                                    onChange={(e) => {
                                      const updatedItems = [...orderItems];
                                      updatedItems[index].specialInstructions = e.target.value;
                                      setOrderItems(updatedItems);
                                    }}
                                    className="text-xs h-7 border border-blue-600 bg-black text-white placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="p-3 bg-blue-900/30 flex justify-between items-center border-t border-blue-800">
                            <span className="font-bold text-blue-300">Total Amount</span>
                            <span className="text-xl font-extrabold text-white">
                              {formatCurrency(totalAmount)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center">
                          <Send className="h-12 w-12 text-blue-500 mb-4" />
                          <h3 className="text-xl font-bold text-white">Your order is empty</h3>
                          <p className="text-gray-400 text-center mt-2 max-w-xs">
                            Process your natural language order to see items here
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        


        {/* Footer with Notes */}
        <div className="border-t border-gray-800 p-3 bg-neutral-950">
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <div className="flex border rounded border-blue-600 px-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-black">
                <AlignLeft className="h-4 w-4 text-blue-500 mr-2 mt-3" />
                <Textarea
                  placeholder="Order notes... (dietary preferences, allergies, special requirements)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px] bg-transparent text-white placeholder:text-gray-500 py-2"
                />
              </div>
            </div>
            
            <Button
              type="button" 
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 mt-3"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
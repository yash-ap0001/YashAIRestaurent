import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Minus, X, Search, ListChecks, Sparkles, MessageSquare, Bot } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CompactOrderSummary } from "./CompactOrderSummary";

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
  const [useAIAutomation, setUseAIAutomation] = useState(false);
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
      
      if (!data || !data.id || !data.orderNumber) {
        console.error('Warning: Order data is incomplete. Missing critical fields:', data);
      }
      
      // Optimistically update the orders cache with the new order
      queryClient.setQueryData(['/api/orders'], (oldData: any[] | undefined) => {
        if (!oldData) return [data];
        return [data, ...oldData];
      });
      
      // Then invalidate all related queries 
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Immediately refetch the orders to ensure consistent data
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
    setUseAIAutomation(false); // Reset AI automation toggle to off
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
      useAIAutomation: useAIAutomation // Use the explicit toggle from UI
    };

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
      <DialogContent className="sm:max-w-6xl h-[600px] overflow-hidden bg-neutral-900 border border-gray-800 shadow-lg p-0">
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
          
          <div className="flex items-center ml-4 gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="ai-automation"
                checked={useAIAutomation}
                onCheckedChange={setUseAIAutomation}
                className="data-[state=checked]:bg-blue-600"
              />
              <Label
                htmlFor="ai-automation"
                className="text-xs flex items-center font-medium text-white"
              >
                <Bot className="h-3.5 w-3.5 mr-1 text-blue-400" />
                Auto-Progress
              </Label>
            </div>
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
        <div className="flex-1 overflow-hidden flex flex-col">
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
              <TabsContent value="menu-select" className="mt-0 h-full">
                <div className="flex h-full">
                  {/* Left Column - Menu Items */}
                  <div className="w-1/2 h-full border-r border-gray-800 p-2 flex flex-col">
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
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-hidden">
                        <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent grid grid-cols-1 gap-1.5">
                          {filteredMenuItems.length === 0 ? (
                            <div className="text-center p-3 text-gray-500">
                              No menu items found matching your search criteria.
                            </div>
                          ) : (
                            filteredMenuItems.map((menuItem) => (
                              <div
                                key={menuItem.id}
                                className="bg-black/50 border border-gray-800 rounded-lg p-2 hover:bg-blue-900/10 hover:border-blue-600/50 transition-colors cursor-pointer flex justify-between"
                                onClick={() => addOrderItem(menuItem)}
                              >
                                <div>
                                  <h4 className="font-semibold text-white text-sm">{menuItem.name}</h4>
                                  <p className="text-gray-400 text-xs line-clamp-1">{menuItem.description}</p>
                                  {menuItem.dietaryInfo && menuItem.dietaryInfo.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {menuItem.dietaryInfo.map((tag) => (
                                        <span
                                          key={tag}
                                          className="text-[9px] bg-blue-900/30 text-blue-300 rounded-full px-1 py-0.5"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="pl-2 flex items-start">
                                  <span className="font-bold text-blue-300 text-sm whitespace-nowrap">
                                    {formatCurrency(menuItem.price)}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Column - Order Summary */}
                  <div className="w-1/2 h-full">
                    <CompactOrderSummary
                      orderItems={orderItems}
                      notes={notes}
                      onNotesChange={setNotes}
                      onUpdateQuantity={updateItemQuantity}
                      onRemoveItem={removeOrderItem}
                      emptyStateIcon={<ListChecks className="h-8 w-8 text-blue-500/70" />}
                      emptyStateText="Your order is empty. Add items from the menu."
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* AI Natural Language Order Tab Content */}
              <TabsContent value="ai-order" className="mt-0 h-full">
                <div className="flex h-full">
                  {/* Left Column - AI Order Input */}
                  <div className="w-1/2 h-full border-r border-gray-800 p-2 flex flex-col">
                    <h3 className="font-semibold text-white text-sm mb-2 flex items-center">
                      <Sparkles className="h-4 w-4 mr-1.5 text-blue-400" />
                      Describe Your Order in Natural Language
                    </h3>
                    
                    <div className="bg-black/50 rounded-lg border border-gray-800 p-2 mb-2">
                      <p className="text-gray-400 text-xs">
                        Describe exactly what you would like to order. Our AI will understand and process your request.
                        <br/><br/>
                        <span className="text-blue-400">Example:</span> "I'd like two masala dosas, one plain dosa, and three glasses of sweet lassi."
                      </p>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1 rounded-lg border border-gray-800 overflow-hidden mb-2">
                        <Textarea
                          placeholder="Type your order in natural language here..."
                          value={aiOrderInput}
                          onChange={(e) => setAiOrderInput(e.target.value)}
                          className="h-full bg-black border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-white text-sm placeholder:text-gray-600"
                        />
                      </div>
                      
                      <Button
                        type="button"
                        onClick={processAiOrder}
                        disabled={isProcessingAiOrder || !aiOrderInput.trim()}
                        className="w-full font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
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
                  
                  {/* Right Column - Order Summary (same as in the menu tab) */}
                  <div className="w-1/2 h-full">
                    <CompactOrderSummary
                      orderItems={orderItems}
                      notes={notes}
                      onNotesChange={setNotes}
                      onUpdateQuantity={updateItemQuantity}
                      onRemoveItem={removeOrderItem}
                      emptyStateIcon={<MessageSquare className="h-8 w-8 text-blue-500/70" />}
                      emptyStateText="Describe your order using natural language and let our AI do the work!"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Minus, Check, X } from "lucide-react";

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

interface BulkOrderCreateProps {
  isOpen: boolean;
  onClose: () => void;
}



export function BulkOrderCreate({ isOpen, onClose }: BulkOrderCreateProps) {
  const [activeTab, setActiveTab] = useState<string>("standard");
  const [orderCount, setOrderCount] = useState<number>(10);
  const [tablePrefix, setTablePrefix] = useState<string>("T");
  const [tableStart, setTableStart] = useState<number>(1);
  const [selectedMenuItems, setSelectedMenuItems] = useState<number[]>([]);
  const [aiPrompt, setAiPrompt] = useState<string>("");

  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch menu items for selection
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });
  
  // Filter menu items by category for easier selection
  const menuItemsByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);
  
  // Get unique categories
  const categories = Object.keys(menuItemsByCategory).sort();
  
  // Standard bulk order creation
  const bulkOrderMutation = useMutation({
    mutationFn: async (data: {
      orderCount: number;
      tablePrefix: string;
      tableStart: number;
      selectedMenuItems: number[];
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/simulator/create-bulk-orders",
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-tokens"] });
      
      toast({
        title: "Bulk orders created",
        description: `Successfully created ${orderCount} orders`,
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create bulk orders",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // AI-powered bulk order creation
  const aiOrderMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest(
        "POST",
        "/api/ai/process-bulk-order",
        { prompt }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-tokens"] });
      
      toast({
        title: "AI bulk orders created",
        description: `Successfully created ${data.createdCount} orders based on your prompt`,
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create orders",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Toggle menu item selection
  const toggleMenuItem = (menuItemId: number) => {
    setSelectedMenuItems((current) => {
      if (current.includes(menuItemId)) {
        return current.filter(id => id !== menuItemId);
      } else {
        return [...current, menuItemId];
      }
    });
  };
  

  
  // Create bulk orders with standard method
  const handleCreateBulkOrders = () => {
    if (selectedMenuItems.length === 0) {
      toast({
        title: "Select menu items",
        description: "Please select at least one menu item",
        variant: "destructive",
      });
      return;
    }
    
    bulkOrderMutation.mutate({
      orderCount,
      tablePrefix,
      tableStart,
      selectedMenuItems,
    });
  };
  
  // Create bulk orders with AI
  const handleCreateAiOrders = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please describe the orders you want to create",
        variant: "destructive",
      });
      return;
    }
    
    aiOrderMutation.mutate(aiPrompt);
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
    >
      <DialogContent 
        className="sm:max-w-[600px] max-h-[550px] overflow-y-auto bg-zinc-900/90 border border-purple-600/30 shadow-xl p-0 backdrop-blur-sm">
        <DialogHeader className="relative p-4 bg-gradient-to-r from-purple-900/60 to-purple-800/60 rounded-t-lg border-b border-purple-600/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Bulk Order Creation
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Tabs 
          defaultValue="standard" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="px-6 pt-6"
        >
          <TabsList className="grid grid-cols-2 bg-zinc-800">
            <TabsTrigger value="standard" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">Standard Creation</TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">AI-Powered Creation</TabsTrigger>
          </TabsList>
          
          {/* Standard bulk creation tab */}
          <TabsContent value="standard" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderCount" className="text-white">Number of Orders</Label>
                <Input
                  id="orderCount"
                  type="number"
                  min={1}
                  max={100}
                  value={orderCount}
                  onChange={(e) => setOrderCount(parseInt(e.target.value) || 1)}
                  className="border-gray-700 bg-black/90 focus:border-purple-500 focus:ring-purple-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tablePrefix" className="text-white">Table Prefix</Label>
                <Input
                  id="tablePrefix"
                  value={tablePrefix}
                  onChange={(e) => setTablePrefix(e.target.value)}
                  maxLength={3}
                  className="border-gray-700 bg-black/90 focus:border-purple-500 focus:ring-purple-500/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableStart" className="text-white">Starting Table Number</Label>
                <Input
                  id="tableStart"
                  type="number"
                  min={1}
                  value={tableStart}
                  onChange={(e) => setTableStart(parseInt(e.target.value) || 1)}
                  className="border-gray-700 bg-black/90 focus:border-purple-500 focus:ring-purple-500/30 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium text-white">Select Menu Items</Label>
                <div className="bg-purple-600/20 text-purple-400 text-xs px-3 py-1 rounded-full border border-purple-600/30">
                  Selected {selectedMenuItems.length} items
                </div>
              </div>
              <div className="border border-gray-700 rounded-md p-2 max-h-[150px] overflow-y-auto bg-black/90 shadow-inner">
                {isLoadingMenuItems ? (
                  <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    {categories.map((category) => (
                      <div key={category} className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide px-1">
                          {category}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {menuItemsByCategory[category].map((item) => (
                            <div 
                              key={item.id} 
                              className={`flex items-center space-x-2 border rounded-md p-1.5 cursor-pointer transition-all ${
                                selectedMenuItems.includes(item.id) 
                                  ? 'bg-purple-900/30 border-purple-500 shadow-md' 
                                  : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/50'
                              }`}
                              onClick={() => toggleMenuItem(item.id)}
                            >
                              <Checkbox 
                                checked={selectedMenuItems.includes(item.id)} 
                                onCheckedChange={() => toggleMenuItem(item.id)}
                                className={selectedMenuItems.includes(item.id) ? "border-purple-500" : ""}
                              />
                              <div className="flex-1 truncate">
                                <span className={`text-sm font-medium ${selectedMenuItems.includes(item.id) ? "text-white" : "text-gray-200"}`}>
                                  {item.name}
                                </span>
                                <span className={`text-sm ml-2 ${selectedMenuItems.includes(item.id) ? "text-purple-300" : "text-gray-400"}`}>
                                  ₹{item.price}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* AI-powered creation tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Label htmlFor="aiPrompt" className="text-base font-medium text-white">Describe Your Order Requirements</Label>
              </div>
              <Textarea
                id="aiPrompt"
                placeholder="Example: Create breakfast orders for 20 tables (T1-T20) with coffee, dosa and idli"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="h-32 border-gray-700 bg-black/90 focus:border-purple-500 focus:ring-purple-500/30 shadow-inner text-white"
              />
              <p className="text-sm text-gray-300 bg-purple-900/30 p-3 rounded-md border border-purple-600/40">
                Provide details like number of orders, table numbers, menu items, and any special requirements.
                Our AI will analyze your request and create the appropriate orders automatically.
              </p>
            </div>
            
            <div className="bg-black/90 rounded-lg border border-gray-800 p-4 mt-2">
              <h3 className="text-sm font-semibold text-white mb-3">Try these examples:</h3>
              <div className="grid grid-cols-1 gap-2">
                <div onClick={() => setAiPrompt("Create lunch orders for tables L1 through L30 with curry and rice")} 
                  className="rounded-md border border-gray-800 p-3 cursor-pointer hover:bg-gray-900/50 hover:border-gray-700 transition-all">
                  <p className="text-sm text-purple-300 font-medium">"Create lunch orders for tables L1 through L30 with curry and rice"</p>
                </div>
                <div onClick={() => setAiPrompt("20 breakfast orders for tables starting at B10 with coffee and snacks")} 
                  className="rounded-md border border-gray-800 p-3 cursor-pointer hover:bg-gray-900/50 hover:border-gray-700 transition-all">
                  <p className="text-sm text-purple-300 font-medium">"20 breakfast orders for tables starting at B10 with coffee and snacks"</p>
                </div>
                <div onClick={() => setAiPrompt("15 dinner reservations with our signature biryani dishes")} 
                  className="rounded-md border border-gray-800 p-3 cursor-pointer hover:bg-gray-900/50 hover:border-gray-700 transition-all">
                  <p className="text-sm text-purple-300 font-medium">"15 dinner reservations with our signature biryani dishes"</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-purple-600/30 sticky bottom-0 bg-gradient-to-r from-purple-900/60 to-purple-800/60 rounded-b-lg">
          <Button variant="outline" onClick={onClose} className="border-gray-700 hover:bg-gray-800 hover:text-white">
            Cancel
          </Button>
          {activeTab === "standard" ? (
            <Button 
              onClick={handleCreateBulkOrders}
              disabled={bulkOrderMutation.isPending || selectedMenuItems.length === 0}
              className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800 shadow-md"
            >
              {bulkOrderMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create {orderCount} Orders
            </Button>
          ) : (
            <Button 
              onClick={handleCreateAiOrders}
              disabled={aiOrderMutation.isPending || !aiPrompt.trim()}
              className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800 shadow-md"
            >
              {aiOrderMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create Orders with AI
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
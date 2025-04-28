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

interface OrderTemplate {
  name: string;
  description: string;
  itemsCount: number;
  tablePrefix: string;
  defaultItems: {
    menuItemId: number;
    quantity: number;
  }[];
}

// Pre-defined templates for common order patterns
const TEMPLATES: OrderTemplate[] = [
  {
    name: "Breakfast - 10 Tables",
    description: "Standard breakfast items for 10 tables",
    itemsCount: 3,
    tablePrefix: "B",
    defaultItems: []  // Will be populated with breakfast items
  },
  {
    name: "Lunch - 20 Tables",
    description: "Lunch combo for 20 tables",
    itemsCount: 3,
    tablePrefix: "L",
    defaultItems: []  // Will be populated with lunch items
  },
  {
    name: "Dinner - 15 Tables",
    description: "Full dinner service for 15 tables",
    itemsCount: 4,
    tablePrefix: "D",
    defaultItems: []  // Will be populated with dinner items
  },
  {
    name: "Coffee Break - 30 Tables",
    description: "Coffee and snacks for 30 tables",
    itemsCount: 2,
    tablePrefix: "C",
    defaultItems: []  // Will be populated with coffee items
  }
];

// TemplateCard component with gradient styling
interface TemplateCardProps {
  template: OrderTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  /* 
   * Matching exact gradient styles from column headers:
   * - Pending/Breakfast: from-amber-500 to-orange-700
   * - Preparing/Lunch: from-indigo-500 to-blue-700
   * - Ready/Coffee: from-emerald-500 to-green-700
   * - Completed/Dinner: from-purple-500 to-violet-700
   */
  return (
    <div 
      className={`rounded-lg p-4 hover:shadow-xl transition-all cursor-pointer 
        ${template.name.includes('Breakfast') ? 'bg-gradient-to-r from-amber-500/90 to-orange-700/90' : 
          template.name.includes('Lunch') ? 'bg-gradient-to-r from-indigo-500/90 to-blue-700/90' : 
          template.name.includes('Dinner') ? 'bg-gradient-to-r from-purple-500/90 to-violet-700/90' : 
          'bg-gradient-to-r from-emerald-500/90 to-green-700/90'} 
        text-white ${isSelected ? 'ring-2 ring-white shadow-lg scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-xl text-white drop-shadow-md">{template.name}</h3>
        {isSelected && (
          <div className="rounded-full bg-white/30 p-1 shadow-md">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      <p className="text-sm text-white/90 font-medium">{template.description}</p>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs bg-black/30 px-3 py-1 rounded-full text-white font-medium shadow-sm">
          {template.itemsCount} items
        </span>
        <span className="text-xs bg-black/30 px-3 py-1 rounded-full text-white font-medium shadow-sm">
          Tables: {template.tablePrefix}1-{template.tablePrefix}{template.name.match(/\d+/)?.[0] || '10'}
        </span>
      </div>
    </div>
  );
}

export function BulkOrderCreate({ isOpen, onClose }: BulkOrderCreateProps) {
  const [activeTab, setActiveTab] = useState<string>("standard");
  const [orderCount, setOrderCount] = useState<number>(10);
  const [tablePrefix, setTablePrefix] = useState<string>("T");
  const [tableStart, setTableStart] = useState<number>(1);
  const [selectedMenuItems, setSelectedMenuItems] = useState<number[]>([]);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
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
  
  // Apply template
  const applyTemplate = (templateName: string) => {
    // If "none" is selected, reset to defaults
    if (templateName === "none") {
      setTablePrefix("T");
      setOrderCount(10);
      setSelectedMenuItems([]);
      return;
    }
    
    const template = TEMPLATES.find(t => t.name === templateName);
    if (!template) return;
    
    setTablePrefix(template.tablePrefix);
    setOrderCount(templateName.includes("Breakfast") ? 10 : 
                 templateName.includes("Lunch") ? 20 : 
                 templateName.includes("Dinner") ? 15 : 30);
    
    // Select menu items based on template
    const newSelectedItems: number[] = [];
    
    if (templateName.includes("Breakfast")) {
      // Find breakfast items
      menuItems.forEach(item => {
        const nameLower = item.name.toLowerCase();
        const categoryLower = item.category.toLowerCase();
        if (
          nameLower.includes("breakfast") || 
          categoryLower.includes("breakfast") ||
          nameLower.includes("coffee") || 
          nameLower.includes("tea") || 
          nameLower.includes("juice") ||
          nameLower.includes("egg") ||
          nameLower.includes("dosa") ||
          nameLower.includes("idli") ||
          nameLower.includes("toast")
        ) {
          newSelectedItems.push(item.id);
        }
      });
    } else if (templateName.includes("Lunch")) {
      // Find lunch items
      menuItems.forEach(item => {
        const nameLower = item.name.toLowerCase();
        const categoryLower = item.category.toLowerCase();
        if (
          nameLower.includes("lunch") || 
          categoryLower.includes("lunch") ||
          nameLower.includes("curry") || 
          nameLower.includes("rice") || 
          nameLower.includes("naan") ||
          nameLower.includes("roti") ||
          nameLower.includes("thali")
        ) {
          newSelectedItems.push(item.id);
        }
      });
    } else if (templateName.includes("Dinner")) {
      // Find dinner items
      menuItems.forEach(item => {
        const nameLower = item.name.toLowerCase();
        const categoryLower = item.category.toLowerCase();
        if (
          nameLower.includes("dinner") || 
          categoryLower.includes("dinner") ||
          nameLower.includes("special") || 
          nameLower.includes("signature") || 
          nameLower.includes("main") ||
          nameLower.includes("biryani") ||
          nameLower.includes("curry")
        ) {
          newSelectedItems.push(item.id);
        }
      });
    } else if (templateName.includes("Coffee")) {
      // Find coffee and snack items
      menuItems.forEach(item => {
        const nameLower = item.name.toLowerCase();
        const categoryLower = item.category.toLowerCase();
        if (
          nameLower.includes("coffee") || 
          categoryLower.includes("coffee") ||
          nameLower.includes("tea") || 
          nameLower.includes("snack") || 
          nameLower.includes("pastry") ||
          nameLower.includes("cake") ||
          nameLower.includes("cookie")
        ) {
          newSelectedItems.push(item.id);
        }
      });
    }
    
    // Limit to 3-4 items depending on template
    setSelectedMenuItems(newSelectedItems.slice(0, template.itemsCount));
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-black border border-gray-800 shadow-lg">
        <DialogHeader>
          <DialogTitle>Bulk Order Creation</DialogTitle>
          <DialogDescription>
            Create multiple orders at once to save time. Perfect for events or busy periods.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue="standard" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="mt-4"
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="standard">Standard Creation</TabsTrigger>
            <TabsTrigger value="ai">AI-Powered Creation</TabsTrigger>
          </TabsList>
          
          {/* Standard bulk creation tab */}
          <TabsContent value="standard" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderCount">Number of Orders</Label>
                <Input
                  id="orderCount"
                  type="number"
                  min={1}
                  max={100}
                  value={orderCount}
                  onChange={(e) => setOrderCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="template">Apply Template (Optional)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {TEMPLATES.map((template) => (
                    <TemplateCard 
                      key={template.name}
                      template={template}
                      isSelected={selectedTemplate === template.name}
                      onClick={() => {
                        if (selectedTemplate === template.name) {
                          setSelectedTemplate('none');
                          applyTemplate('none');
                        } else {
                          setSelectedTemplate(template.name);
                          applyTemplate(template.name);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tablePrefix">Table Prefix</Label>
                <Input
                  id="tablePrefix"
                  value={tablePrefix}
                  onChange={(e) => setTablePrefix(e.target.value)}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableStart">Starting Table Number</Label>
                <Input
                  id="tableStart"
                  type="number"
                  min={1}
                  value={tableStart}
                  onChange={(e) => setTableStart(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Select Menu Items</Label>
                <div className="bg-purple-600/20 text-purple-400 text-xs px-3 py-1 rounded-full border border-purple-600/30">
                  Selected {selectedMenuItems.length} items
                </div>
              </div>
              <div className="border border-gray-700 rounded-md p-4 max-h-[300px] overflow-y-auto bg-black/50 shadow-inner">
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
                              className={`flex items-center space-x-2 border rounded-md p-2.5 cursor-pointer transition-all ${
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
                <Label htmlFor="aiPrompt" className="text-base font-medium">Describe Your Order Requirements</Label>
              </div>
              <Textarea
                id="aiPrompt"
                placeholder="Example: Create breakfast orders for 20 tables (T1-T20) with coffee, dosa and idli"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="h-32 border-gray-700 bg-black/50 focus:border-purple-500 focus:ring-purple-500/30 shadow-inner"
              />
              <p className="text-sm text-gray-400 bg-purple-900/10 p-3 rounded-md border border-purple-900/30">
                Provide details like number of orders, table numbers, menu items, and any special requirements.
                Our AI will analyze your request and create the appropriate orders automatically.
              </p>
            </div>
            
            <div className="bg-black/30 rounded-lg border border-gray-800 p-4 mt-2">
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
        
        <DialogFooter className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
          <Button variant="outline" onClick={onClose} className="border-gray-700 hover:bg-gray-800 hover:text-white">
            <X className="h-4 w-4 mr-2" />
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
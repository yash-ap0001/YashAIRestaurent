import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Copy, FileSpreadsheet, MessageSquare } from "lucide-react";

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

export function BulkOrderCreate({ isOpen, onClose }: BulkOrderCreateProps) {
  const [activeTab, setActiveTab] = useState("quick");
  const [orderCount, setOrderCount] = useState(10);
  const [tablePrefix, setTablePrefix] = useState("T");
  const [tableStart, setTableStart] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [processingAi, setProcessingAi] = useState(false);
  const [selectedCommonItems, setSelectedCommonItems] = useState<number[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query menu items
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Sample order templates
  const orderTemplates: OrderTemplate[] = [
    {
      name: "Breakfast for 20",
      description: "Standard breakfast with dosa, idli and coffee",
      itemsCount: 20,
      tablePrefix: "T",
      defaultItems: [
        { menuItemId: 1, quantity: 1 }, // Assuming ID 1 is Dosa
        { menuItemId: 2, quantity: 1 }, // Assuming ID 2 is Idli
        { menuItemId: 10, quantity: 1 }, // Assuming ID 10 is Coffee
      ]
    },
    {
      name: "Lunch for 50",
      description: "South Indian thali with rice, curry, and lassi",
      itemsCount: 50,
      tablePrefix: "T",
      defaultItems: [
        { menuItemId: 3, quantity: 1 }, // Assuming ID 3 is Rice
        { menuItemId: 4, quantity: 1 }, // Assuming ID 4 is Curry
        { menuItemId: 11, quantity: 1 }, // Assuming ID 11 is Lassi
      ]
    },
    {
      name: "Dinner for 30",
      description: "Evening specials with biryani and naan",
      itemsCount: 30,
      tablePrefix: "T",
      defaultItems: [
        { menuItemId: 5, quantity: 1 }, // Assuming ID 5 is Biryani
        { menuItemId: 6, quantity: 1 }, // Assuming ID 6 is Naan
        { menuItemId: 12, quantity: 1 }, // Assuming ID 12 is Sweet
      ]
    },
  ];

  // Select a template
  const handleTemplateSelect = (templateName: string) => {
    const template = orderTemplates.find(t => t.name === templateName);
    if (template) {
      setSelectedTemplate(templateName);
      setOrderCount(template.itemsCount);
      setTablePrefix(template.tablePrefix);
      
      // Select the default menu items for this template
      setSelectedCommonItems(template.defaultItems.map(item => item.menuItemId));
      
      toast({
        title: "Template Selected",
        description: `${template.name} template loaded with ${template.itemsCount} orders.`,
      });
    }
  };

  // Create bulk orders mutation
  const createBulkOrdersMutation = useMutation({
    mutationFn: async (data: {
      orderCount: number;
      tablePrefix: string;
      tableStart: number;
      selectedMenuItems: number[];
    }) => {
      const response = await apiRequest("POST", "/api/simulator/create-bulk-orders", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Bulk Orders Created",
        description: `Successfully created ${orderCount} new orders.`,
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

  // Create orders from AI prompt mutation
  const createAiOrdersMutation = useMutation({
    mutationFn: async (prompt: string) => {
      setProcessingAi(true);
      const response = await apiRequest("POST", "/api/ai/process-bulk-order", { prompt });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "AI Orders Created",
        description: `Created ${data.createdCount} orders from your natural language input.`,
      });
      setProcessingAi(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process AI order",
        description: error.message,
        variant: "destructive",
      });
      setProcessingAi(false);
    },
  });

  // Handle quick create submission
  const handleQuickCreate = () => {
    if (selectedCommonItems.length === 0) {
      toast({
        title: "No menu items selected",
        description: "Please select at least one menu item for the orders.",
        variant: "destructive",
      });
      return;
    }

    createBulkOrdersMutation.mutate({
      orderCount,
      tablePrefix,
      tableStart,
      selectedMenuItems: selectedCommonItems,
    });
  };

  // Handle AI prompt submission
  const handleAiPrompt = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description of the orders you want to create.",
        variant: "destructive",
      });
      return;
    }

    createAiOrdersMutation.mutate(aiPrompt);
  };

  // Handle menu item selection
  const toggleMenuItem = (id: number) => {
    setSelectedCommonItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Bulk Order Creation</DialogTitle>
          <DialogDescription>
            Create multiple orders in one go with minimal clicks.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="quick">
              <Plus className="h-4 w-4 mr-2" />
              Quick Create
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Copy className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="ai">
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          {/* Quick Create Tab */}
          <TabsContent value="quick" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderCount">Number of Orders</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="orderCount"
                      min={1}
                      max={100}
                      step={1}
                      value={[orderCount]}
                      onValueChange={(value) => setOrderCount(value[0])}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={orderCount}
                      onChange={(e) => setOrderCount(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tablePrefix">Table Prefix</Label>
                    <Input
                      id="tablePrefix"
                      value={tablePrefix}
                      onChange={(e) => setTablePrefix(e.target.value)}
                      placeholder="T"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tableStart">Starting Table Number</Label>
                    <Input
                      id="tableStart"
                      type="number"
                      min={1}
                      value={tableStart}
                      onChange={(e) => setTableStart(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Common Menu Items</Label>
                <div className="border rounded-md p-2 h-40 overflow-y-auto space-y-1">
                  {isLoadingMenuItems ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    menuItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${
                          selectedCommonItems.includes(item.id) ? "bg-secondary" : ""
                        }`}
                        onClick={() => toggleMenuItem(item.id)}
                      >
                        <div className="flex items-center">
                          <span>{item.name}</span>
                          <Badge variant="outline" className="ml-2">
                            ₹{item.price}
                          </Badge>
                        </div>
                        {selectedCommonItems.includes(item.id) && (
                          <Badge className="bg-primary">Selected</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select items to include in all orders. Each order will include all selected items.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickCreate}
                disabled={createBulkOrdersMutation.isPending}
                className="gap-2"
              >
                {createBulkOrdersMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Create {orderCount} Orders
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {orderTemplates.map((template) => (
                <Card 
                  key={template.name}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedTemplate === template.name ? "border-primary border-2" : ""
                  }`}
                  onClick={() => handleTemplateSelect(template.name)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="text-sm text-muted-foreground">
                      <div>Orders: {template.itemsCount}</div>
                      <div>Items per order: {template.defaultItems.length}</div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      size="sm"
                      variant={selectedTemplate === template.name ? "default" : "outline"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateSelect(template.name);
                        setActiveTab("quick");
                      }}
                    >
                      Use Template
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setActiveTab("quick")}
                disabled={!selectedTemplate}
              >
                Continue to Configuration
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiPrompt">Describe Your Order Requirements</Label>
                <Textarea
                  id="aiPrompt"
                  placeholder="Create 25 vegetarian lunch orders for tables 10-35 with rice, dal, and naan."
                  rows={5}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the bulk orders you need, including quantities, table numbers, and menu items.
                  Our AI will automatically create the appropriate orders.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h4 className="font-medium mb-2">Example inputs:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="cursor-pointer hover:text-primary" onClick={() => setAiPrompt("Create 10 breakfast orders with dosa and coffee for tables T1 to T10")}>
                    "Create 10 breakfast orders with dosa and coffee for tables T1 to T10"
                  </li>
                  <li className="cursor-pointer hover:text-primary" onClick={() => setAiPrompt("Generate 25 lunch orders, each with rice, curry, and lassi")}>
                    "Generate 25 lunch orders, each with rice, curry, and lassi"
                  </li>
                  <li className="cursor-pointer hover:text-primary" onClick={() => setAiPrompt("Make 15 dinner orders with biryani, naan, and sweet dish for customer event")}>
                    "Make 15 dinner orders with biryani, naan, and sweet dish for customer event"
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={processingAi}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAiPrompt}
                disabled={!aiPrompt.trim() || processingAi}
                className="gap-2"
              >
                {processingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Process with AI
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
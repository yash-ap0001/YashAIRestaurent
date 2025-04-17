import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MenuItem } from "@shared/schema";
import { Loader2, Minus, Plus, Trash2, Sparkles, Search, List, ShoppingCart } from "lucide-react";
import { NaturalLanguageOrderInput } from "./NaturalLanguageOrderInput";

const formSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  items: z.array(
    z.object({
      menuItemId: z.number().min(1, "Menu item is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      price: z.number().min(0, "Price must be positive"),
      notes: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
  notes: z.string().optional(),
  isUrgent: z.boolean().default(false),
  orderSource: z.string().default("manual"),
  useAIAutomation: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export function OrderForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const [selectedItems, setSelectedItems] = useState<{
    menuItemId: number;
    name: string;
    quantity: number;
    price: number;
    notes: string;
  }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tableNumber: "",
      items: [],
      notes: "",
      isUrgent: false,
      orderSource: "manual",
      useAIAutomation: true,
    },
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });
  
  // Extract unique categories for filtering
  const categories = menuItems ? 
    ['all', ...Array.from(new Set(menuItems.map(item => item.category)))] : 
    ['all'];
    
  // Filter menu items by category and search query
  const filteredMenuItems = menuItems ? 
    menuItems.filter(item => {
      // Apply category filter
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      // Apply search filter
      const matchesSearch = 
        !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    }) : [];

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      try {
        console.log("DEBUG - Preparing to submit order data:", orderData);
        
        // Check if we have items
        if (!orderData.items || !orderData.items.length) {
          console.error("No items in order data");
          throw new Error("Order must contain at least one item");
        }
        
        // Check if we have a table number
        if (!orderData.tableNumber) {
          console.error("No table number in order data");
          throw new Error("Table number is required");
        }
        
        // Combine everything in one complete request
        const requestData = {
          tableNumber: orderData.tableNumber,
          status: "pending",
          totalAmount: orderData.totalAmount,
          notes: orderData.notes || "",
          isUrgent: !!orderData.isUrgent,
          orderSource: orderData.orderSource || "manual",
          useAIAutomation: orderData.useAIAutomation !== undefined ? orderData.useAIAutomation : true,
          items: orderData.items || []
        };
        
        // Log the complete request
        console.log("DEBUG - Submitting data to API:", JSON.stringify(requestData, null, 2));
        
        // Use the project's standard API request function - pass method as first parameter
        const result = await apiRequest("POST", "/api/orders", requestData);
        
        console.log("DEBUG - Order API response:", result);
        return result;
      } catch (error) {
        console.error("DEBUG - Error in order mutation:", error);
        throw error;
      }
    },
    onSuccess: async (response) => {
      // Convert response to JSON
      const data = await response.json();
      console.log("DEBUG - Order created successfully with data:", data);
      
      // Show success toast with order number
      toast({
        title: "✅ Order created successfully",
        description: `Order #${data.orderNumber} has been created and sent to the kitchen`,
        variant: "default",
        duration: 5000
      });
      
      // Refresh all relevant data across the application
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      // Navigate to kitchen tokens view
      setLocation("/kitchen-tokens");
    },
    onError: (error: any) => {
      console.error("DEBUG - Error creating order:", error);
      
      // Show detailed error message
      toast({
        title: "❌ Error creating order",
        description: error.message || "An unknown error occurred. Please try again.",
        variant: "destructive",
        duration: 7000
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submit triggered with data:", data);
    
    // Validate required field
    if (!data.tableNumber) {
      toast({
        title: "Missing table number",
        description: "Please select a table before submitting",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure we have items
    if (selectedItems.length === 0) {
      toast({ 
        title: "No items selected",
        description: "Please add at least one menu item to the order", 
        variant: "destructive" 
      });
      return;
    }
    
    // Calculate total amount from selected items
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Map items to the format the API expects
    const formattedItems = selectedItems.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes || ""
    }));
    
    // Create final order data
    const orderData = {
      tableNumber: data.tableNumber,
      status: "pending",
      totalAmount: totalAmount,
      notes: data.notes || "",
      isUrgent: !!data.isUrgent,
      orderSource: data.orderSource || "manual",
      useAIAutomation: data.useAIAutomation,
      items: formattedItems
    };
    
    console.log("Form submission - Final order data to submit:", orderData);
    
    // Submit to API
    createOrderMutation.mutate(orderData);
  };

  const addMenuItem = (menuItemId: number) => {
    if (!menuItems) return;
    
    const menuItem = menuItems.find(item => item.id === parseInt(String(menuItemId)));
    if (!menuItem) return;
    
    // Check if item already exists in the order
    const existingItemIndex = selectedItems.findIndex(item => item.menuItemId === menuItem.id);
    
    if (existingItemIndex >= 0) {
      // Increment quantity if item already exists
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += 1;
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      setSelectedItems([
        ...selectedItems,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: 1,
          price: menuItem.price,
          notes: ""
        }
      ]);
    }
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = newQuantity;
    setSelectedItems(updatedItems);
  };

  const updateItemNotes = (index: number, notes: string) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].notes = notes;
    setSelectedItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Debug form state
  console.log("Form state:", {
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    errors: form.formState.errors,
    submitCount: form.formState.submitCount,
    isSubmitting: form.formState.isSubmitting,
    selectedItems: selectedItems
  });
  
  // Direct form submit handler function for debugging
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Direct form submit triggered");
    
    // Check if there's a table number selected
    if (!form.getValues("tableNumber")) {
      console.error("Missing table number");
      toast({
        title: "Error",
        description: "Please select a table number",
        variant: "destructive"
      });
      return;
    }
    
    // Check if items are selected
    if (selectedItems.length === 0) {
      console.error("No items selected");
      toast({
        title: "Error",
        description: "Please add at least one menu item",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Attempting manual form submit with form data:", form.getValues());
    console.log("Selected items:", selectedItems);
    
    // Calculate total amount
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create order data manually
    const orderData = {
      tableNumber: form.getValues("tableNumber"),
      status: "pending",
      totalAmount: totalAmount,
      notes: form.getValues("notes") || "",
      isUrgent: !!form.getValues("isUrgent"),
      orderSource: form.getValues("orderSource") || "manual",
      useAIAutomation: form.getValues("useAIAutomation"),
      items: selectedItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || ""
      }))
    };
    
    console.log("Submitting order data manually:", orderData);
    createOrderMutation.mutate(orderData);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="h-[calc(100vh-170px)] flex flex-col">
        {/* Header Area with Table/Source Selection */}
        <div className="flex px-4 py-2 border-b border-gray-800 gap-4 bg-neutral-950 h-14">
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm whitespace-nowrap">Table:</span>
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        name="tableNumber"
                      >
                        <SelectTrigger className="w-20 h-8 border-blue-600 bg-black text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                          <SelectValue placeholder="T1" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-blue-600 text-white">
                          <SelectItem value="T1">T1</SelectItem>
                          <SelectItem value="T2">T2</SelectItem>
                          <SelectItem value="T3">T3</SelectItem>
                          <SelectItem value="T4">T4</SelectItem>
                          <SelectItem value="T5">T5</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm whitespace-nowrap">Source:</span>
              <FormField
                control={form.control}
                name="orderSource"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-28 h-8 border-blue-600 bg-black text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                          <SelectValue placeholder="Manual" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-blue-600 text-white">
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="zomato">Zomato</SelectItem>
                          <SelectItem value="swiggy">Swiggy</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="ml-auto flex items-center">
              <Button 
                type="submit"
                className={`h-9 px-6 font-bold ${selectedItems.length === 0 ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 shadow-lg shadow-blue-900/50'}`}
                disabled={createOrderMutation.isPending || selectedItems.length === 0}
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
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex h-[calc(100vh-220px)] overflow-hidden">
          {/* Menu Items (Left Side) */}
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
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="text-white focus:bg-blue-800 focus:text-white">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-gray-800 bg-black p-2">
              <div className="grid grid-cols-2 gap-2">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-black rounded-lg p-3 cursor-pointer hover:bg-blue-900/20 transition-colors flex flex-col border border-blue-900/30"
                    onClick={() => addMenuItem(item.id)}
                  >
                    <h4 className="font-medium text-white">{item.name}</h4>
                    <p className="text-xs text-gray-400 mt-1 mb-1 line-clamp-2">{item.description || 'Fragrant basmati rice dish'}</p>
                    <span className="text-blue-500 font-semibold mt-auto">₹{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary (Right Side) */}
          <div className="w-1/2 h-full p-3 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-white">Your Order Summary</h3>
              {selectedItems.length > 0 && (
                <div className="text-sm bg-blue-900/30 px-2 py-1 rounded-full text-blue-300 border border-blue-800/50">
                  {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
                </div>
              )}
            </div>
            
            <div className="flex-1 bg-black rounded-lg border border-gray-800 overflow-hidden">
              {selectedItems.length > 0 ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-auto p-2 space-y-2">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="border border-blue-800/50 rounded-lg p-3 space-y-2 hover:bg-blue-900/20 transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-white">{item.name}</h4>
                            <p className="text-sm text-blue-300">₹{item.price} per item</p>
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:bg-red-900/30 hover:text-red-300 rounded-full"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center">
                          <Button 
                            type="button"
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6 rounded-full border-blue-600 text-blue-400 hover:bg-blue-900 hover:text-white"
                            onClick={() => updateItemQuantity(index, Math.max(1, item.quantity - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mx-3 w-6 text-center font-bold text-white">{item.quantity}</span>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6 rounded-full border-blue-600 text-blue-400 hover:bg-blue-900 hover:text-white"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="ml-auto font-bold text-blue-400">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        
                        <Input
                          placeholder="Special instructions..."
                          value={item.notes}
                          onChange={(e) => updateItemNotes(index, e.target.value)}
                          className="text-xs h-7 border border-blue-600 bg-black text-white placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-blue-900/30 flex justify-between items-center border-t border-blue-800">
                    <span className="font-bold text-blue-300">Total Amount</span>
                    <span className="text-xl font-extrabold text-white">
                      ₹{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <ShoppingCart className="h-12 w-12 text-blue-500 mb-4" />
                  <h3 className="text-xl font-bold text-white">Your order is empty</h3>
                  <p className="text-gray-400 text-center mt-2 max-w-xs">
                    Add items from the menu on the left to create your order
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer Area with Notes and Checkboxes */}
        <div className="border-t border-gray-800 p-3 bg-neutral-950">
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormControl>
                      <div className="flex items-center border rounded border-blue-600 px-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-black h-9">
                        <List className="h-4 w-4 text-blue-500 mr-2" />
                        <Input
                          placeholder="Order notes..."
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 bg-transparent text-white placeholder:text-gray-500"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="isUrgent"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 m-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                  </FormControl>
                  <FormLabel className="text-red-400 text-sm font-medium cursor-pointer">Urgent</FormLabel>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="useAIAutomation"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 m-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                  </FormControl>
                  <FormLabel className="text-blue-400 text-sm font-medium cursor-pointer flex items-center">
                    AI Automation <Sparkles className="h-3 w-3 text-blue-500 ml-1" />
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}

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
import { Loader2, Minus, Plus, Trash2, Sparkles, Search } from "lucide-react";
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
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <Card className="bg-black rounded-xl shadow-md overflow-hidden border border-purple-800">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white pb-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <span>Create Your Order</span>
            </CardTitle>
            <p className="text-white text-opacity-90 mt-1">Fill in the order details manually or use our AI to process natural language orders</p>
            
          </CardHeader>
          <CardContent className="space-y-6 p-6 bg-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem className="bg-black p-4 rounded-xl shadow-md border border-purple-800">
                    <FormLabel className="text-sm font-semibold text-white">Table Number</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full mt-2 bg-black border-2 border-purple-600 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-purple-600 text-white">
                          <SelectItem value="Table 1" className="text-white focus:bg-purple-800 focus:text-white">Table 1</SelectItem>
                          <SelectItem value="Table 2" className="text-white focus:bg-purple-800 focus:text-white">Table 2</SelectItem>
                          <SelectItem value="Table 3" className="text-white focus:bg-purple-800 focus:text-white">Table 3</SelectItem>
                          <SelectItem value="Table 4" className="text-white focus:bg-purple-800 focus:text-white">Table 4</SelectItem>
                          <SelectItem value="Table 5" className="text-white focus:bg-purple-800 focus:text-white">Table 5</SelectItem>
                          <SelectItem value="Table 6" className="text-white focus:bg-purple-800 focus:text-white">Table 6</SelectItem>
                          <SelectItem value="Table 7" className="text-white focus:bg-purple-800 focus:text-white">Table 7</SelectItem>
                          <SelectItem value="Table 8" className="text-white focus:bg-purple-800 focus:text-white">Table 8</SelectItem>
                          <SelectItem value="Table 9" className="text-white focus:bg-purple-800 focus:text-white">Table 9</SelectItem>
                          <SelectItem value="Table 10" className="text-white focus:bg-purple-800 focus:text-white">Table 10</SelectItem>
                          <SelectItem value="Takeaway" className="text-white focus:bg-purple-800 focus:text-white">Takeaway</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="orderSource"
                render={({ field }) => (
                  <FormItem className="bg-black p-4 rounded-xl shadow-md border border-purple-800">
                    <FormLabel className="text-sm font-semibold text-white">Order Source</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full mt-2 bg-black border-2 border-purple-600 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                          <SelectValue placeholder="Select order source" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-purple-600 text-white">
                          <SelectItem value="manual" className="text-white focus:bg-purple-800 focus:text-white">Manual / In-Person</SelectItem>
                          <SelectItem value="zomato" className="text-white focus:bg-purple-800 focus:text-white">Zomato</SelectItem>
                          <SelectItem value="swiggy" className="text-white focus:bg-purple-800 focus:text-white">Swiggy</SelectItem>
                          <SelectItem value="whatsapp" className="text-white focus:bg-purple-800 focus:text-white">WhatsApp</SelectItem>
                          <SelectItem value="phone" className="text-white focus:bg-purple-800 focus:text-white">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="bg-black p-4 rounded-xl shadow-md border border-purple-800">
                <FormLabel className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span>Add Menu Items</span>
                </FormLabel>
                
                {/* Search and Category Filters */}
                <div className="space-y-3 mb-3">
                  {/* Search Input */}
                  <div className="flex items-center bg-black bg-opacity-95 border-2 border-purple-600 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
                    <Search className="h-4 w-4 text-purple-400 ml-3" />
                    <Input
                      type="text"
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 bg-transparent text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  {/* Category Filter */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Filter by category:</span>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="w-[180px] bg-black border-2 border-purple-600 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-purple-600 text-white">
                        {categories.map((category) => (
                          <SelectItem key={category} value={category} className="text-white focus:bg-purple-800 focus:text-white">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Menu Item Selector */}
                <div className="flex mt-2">
                  <Select
                    disabled={menuLoading}
                    onValueChange={(value) => addMenuItem(parseInt(value))}
                  >
                    <SelectTrigger className="w-full bg-black border-2 border-purple-600 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                      <SelectValue placeholder="Select menu item" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-black border-purple-600 text-white">
                      {filteredMenuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()} className="text-white focus:bg-purple-800 focus:text-white">
                          <div className="flex justify-between w-full">
                            <span>{item.name}</span>
                            <span className="text-purple-400 font-semibold">₹{item.price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Display filtered items count */}
                <div className="mt-2 text-xs text-purple-400">
                  {filteredMenuItems.length} items found
                </div>
              </div>

              <div className="md:border-l md:pl-4 md:border-neutral-200">
                <NaturalLanguageOrderInput
                  onOrderProcessed={(processedOrder) => {
                    if (!menuItems || !processedOrder.items.length) return;
                    
                    // Map the processed items to selectedItems format
                    const newItems = processedOrder.items.map(item => {
                      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                      if (!menuItem) return null;
                      
                      return {
                        menuItemId: menuItem.id,
                        name: menuItem.name,
                        quantity: item.quantity,
                        price: menuItem.price,
                        notes: item.notes || ""
                      };
                    }).filter(Boolean) as {
                      menuItemId: number;
                      name: string;
                      quantity: number;
                      price: number;
                      notes: string;
                    }[];
                    
                    // Add all new items
                    setSelectedItems([...selectedItems, ...newItems]);
                    
                    // Set the order notes if provided
                    if (processedOrder.notes) {
                      form.setValue("notes", processedOrder.notes);
                    }
                  }}
                />
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="space-y-4 mt-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 text-white flex justify-between items-center rounded-t-xl">
                  <h3 className="font-bold text-white">Your Order Summary</h3>
                  <div className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
                
                <div className="bg-black p-4 rounded-b-xl shadow-md border border-purple-800 -mt-4">
                  <div className="max-h-[300px] overflow-y-auto space-y-3">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="border border-purple-800 rounded-xl p-4 space-y-3 hover:bg-purple-900/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-white">{item.name}</h4>
                            <p className="text-sm text-purple-300">₹{item.price} per item</p>
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 rounded-full"
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
                            className="h-7 w-7 rounded-full border-purple-600 text-purple-400 hover:bg-purple-900 hover:text-white"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mx-3 w-8 text-center font-bold text-white">{item.quantity}</span>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-full border-purple-600 text-purple-400 hover:bg-purple-900 hover:text-white"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="ml-auto font-bold text-purple-400">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        
                        <Input
                          placeholder="Special instructions for this item"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(index, e.target.value)}
                          className="text-sm border-2 border-purple-600 bg-black text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-purple-900/30 rounded-lg flex justify-between items-center border border-purple-600">
                    <span className="font-bold text-purple-300">Total Amount</span>
                    <span className="text-xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      ₹{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any special instructions for the entire order..."
                      className="resize-none mt-2 border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="isUrgent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-red-100 dark:border-red-900">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold text-red-600 dark:text-red-400">Mark as Urgent</FormLabel>
                      <p className="text-xs text-gray-500">
                        Prioritizes this order in the kitchen queue
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="useAIAutomation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-400">
                        <span>Use AI Automation</span>
                        <Sparkles className="h-4 w-4 text-purple-500" />
                      </FormLabel>
                      <p className="text-xs text-gray-500">
                        AI will automatically manage this order's status updates and workflow
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="hidden md:block">
            <Button 
              type="button" 
              variant="outline"
              size="sm"
              className="text-xs text-gray-500 border-gray-300"
              onClick={() => {
                // Create an emergency test order with fixed data
                const testOrderData = {
                  tableNumber: "Table 1",
                  status: "pending",
                  totalAmount: 320,
                  notes: "Debug Test Order",
                  isUrgent: false,
                  orderSource: form.getValues("orderSource") || "manual",
                  useAIAutomation: form.getValues("useAIAutomation"),
                  items: [
                    {
                      menuItemId: 1,
                      quantity: 1,
                      price: 320,
                      notes: ""
                    }
                  ]
                };
                
                console.log("EMERGENCY TEST ORDER:", testOrderData);
                toast({
                  title: "Attempting Emergency Test Order",
                  description: "Submitting a test order to the API..."
                });
                
                // Direct API call to ensure it works
                try {
                  console.log("Making direct emergency test order");
                  createOrderMutation.mutate(testOrderData);
                } catch (error: any) {
                  console.error("Emergency order creation failed:", error);
                  toast({
                    title: "Emergency Order Failed",
                    description: `Error: ${error?.message || "Unknown error"}`,
                    variant: "destructive"
                  });
                }
              }}
            >
              Debug Order
            </Button>
          </div>
          
          <div className="flex space-x-4 ml-auto">
            <Button 
              type="button" 
              variant="outline"
              className="px-6 border-2 font-medium"
              onClick={() => setLocation("/")}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className={`px-8 py-6 font-bold text-lg ${selectedItems.length === 0 ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'}`}
              disabled={createOrderMutation.isPending || selectedItems.length === 0}
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Create Order</>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

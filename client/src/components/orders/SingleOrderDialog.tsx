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
import { Loader2, Plus, Minus, X, Send, AlignLeft, Search } from "lucide-react";
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
      orderSource: "manual_dialog", // Help with identifying order source
      status: "pending",
      totalAmount: totalAmount,
      useAIAutomation: false
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 shadow-lg">
        <DialogHeader className="pb-3 border-b border-gray-200 dark:border-gray-800">
          <DialogTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">Create New Order</DialogTitle>
          <DialogDescription className="text-gray-700 dark:text-gray-300">
            Add delicious menu items to your customer's order.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Left Column - Order Details & Cart */}
          <div className="space-y-5">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="space-y-3">
                <Label htmlFor="tableNumber" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Table Number</Label>
                <Select
                  value={tableNumber}
                  onValueChange={(value) => setTableNumber(value)}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => (
                      <SelectItem key={i} value={`T${i + 1}`}>
                        Table {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Notes</Label>
              <div className="flex mt-2 items-start space-x-2">
                <AlignLeft className="h-5 w-5 mt-2 text-purple-500 flex-shrink-0" />
                <Textarea
                  id="notes"
                  placeholder="Enter any special instructions for the entire order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                />
              </div>
            </div>

            {/* Order Items Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 text-white flex justify-between items-center">
                <h3 className="font-bold text-white">Your Order Summary</h3>
                <div className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
                  {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                </div>
              </div>
              
              <div className="p-3">
                {orderItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="mb-2">👈 Add menu items from the right panel</div>
                    <div className="text-sm">Your order will appear here</div>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-900">
                          <TableHead className="font-bold">Item</TableHead>
                          <TableHead className="text-center font-bold">Qty</TableHead>
                          <TableHead className="text-right font-bold">Price</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <TableCell className="font-medium">{item.menuItemName}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-full border-purple-200 hover:bg-purple-100 hover:text-purple-700 dark:border-purple-800 dark:hover:bg-purple-900"
                                  onClick={() => updateItemQuantity(index, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center font-bold">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-full border-purple-200 hover:bg-purple-100 hover:text-purple-700 dark:border-purple-800 dark:hover:bg-purple-900"
                                  onClick={() => updateItemQuantity(index, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.price * item.quantity)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                onClick={() => removeOrderItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {orderItems.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex justify-between items-center">
                    <span className="font-bold text-purple-900 dark:text-purple-300">Total Amount</span>
                    <span className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Menu Items */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              {/* Search and Category Controls */}
              <div className="mb-4">
                <div className="flex items-center mb-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
                  <Search className="h-4 w-4 text-gray-500 ml-3" />
                  <Input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Menu Category</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoadingMenu ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-2" />
                  <p className="text-sm text-gray-500">Loading menu items...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1" style={{ maxHeight: '450px' }}>
                  {filteredMenuItems.map((menuItem) => {
                    // Check if this item is already in the order
                    const existingItem = orderItems.find(item => item.menuItemId === menuItem.id);
                    const isInOrder = !!existingItem;
                    
                    return (
                      <div
                        key={menuItem.id}
                        onClick={() => menuItem.isAvailable && addOrderItem(menuItem)}
                        className={`
                          relative cursor-pointer rounded-xl p-3 transition-all duration-200
                          ${!menuItem.isAvailable ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : 
                            isInOrder ? 'bg-purple-50 border-2 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700' : 
                            'bg-white hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md'}
                        `}
                      >
                        {isInOrder && (
                          <div className="absolute -top-2 -right-2 bg-purple-500 text-white h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {existingItem.quantity}
                          </div>
                        )}
                        
                        <div className="font-bold text-gray-800 dark:text-gray-200">{menuItem.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{menuItem.description}</div>
                        <div className="mt-2 flex justify-between items-center">
                          <div className="text-sm font-extrabold text-purple-700 dark:text-purple-400">{formatCurrency(menuItem.price)}</div>
                          {menuItem.dietaryInfo && menuItem.dietaryInfo.length > 0 && (
                            <div className="flex space-x-1">
                              {menuItem.dietaryInfo.map((info, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                                  {info}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onClose} className="border-2">
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 px-8"
            onClick={handleSubmit}
            disabled={orderItems.length === 0 || createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
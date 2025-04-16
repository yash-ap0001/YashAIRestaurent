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
import { Loader2, Plus, Minus, X, Send, AlignLeft } from "lucide-react";
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

  // Filter menu items by category
  const filteredMenuItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

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
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order created",
        description: `Order #${data.orderNumber} has been created successfully.`,
      });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
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
      notes: notes || undefined,
    };

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create Single Order</DialogTitle>
          <DialogDescription>
            Quickly create an order with the items below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Left Column - Order Details & Cart */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tableNumber">Table Number</Label>
              <Select
                value={tableNumber}
                onValueChange={(value) => setTableNumber(value)}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="notes">Order Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter any special instructions for the entire order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Order Items List */}
            <div className="border rounded-md p-3 space-y-2">
              <h3 className="font-medium text-sm">Order Items</h3>
              
              {orderItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Add items from the menu to start your order
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.menuItemName}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateItemQuantity(index, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span>{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
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
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeOrderItem(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(totalAmount)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Right Column - Menu Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="category">Filter by Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
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

            {isLoadingMenu ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto" style={{ maxHeight: '400px' }}>
                {filteredMenuItems.map((menuItem) => (
                  <Button
                    key={menuItem.id}
                    variant="outline"
                    className={`h-auto py-2 px-3 justify-start text-left flex flex-col items-start ${!menuItem.isAvailable ? 'opacity-50' : ''}`}
                    disabled={!menuItem.isAvailable}
                    onClick={() => addOrderItem(menuItem)}
                  >
                    <div className="font-medium">{menuItem.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{menuItem.description}</div>
                    <div className="text-sm font-bold mt-1">{formatCurrency(menuItem.price)}</div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-primary text-white hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={orderItems.length === 0 || createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
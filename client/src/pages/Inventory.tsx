import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Package2, PlusCircle, Search, Edit, Trash2, ArrowUpDown, CheckCircle, XCircle, 
  AlertTriangle, RotateCw, Filter
} from "lucide-react";
import { insertInventorySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extend the insert schema with validation
const inventoryFormSchema = insertInventorySchema.extend({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  category: z.string().min(2, {
    message: "Category must be at least 2 characters.",
  }),
  quantity: z.number().min(0, {
    message: "Quantity cannot be negative.",
  }),
  unit: z.string().min(1, {
    message: "Unit is required.",
  }),
  minQuantity: z.number().min(0, {
    message: "Minimum quantity cannot be negative.",
  }),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

// Inventory categories
const INVENTORY_CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Meat",
  "Dairy",
  "Grains",
  "Spices",
  "Beverages",
  "Cleaning",
  "Others"
];

// Units for inventory
const INVENTORY_UNITS = [
  "kg",
  "g",
  "liter",
  "ml",
  "piece",
  "packet",
  "box",
  "bottle",
  "can",
  "other"
];

export default function Inventory() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/inventory'],
  });

  // Form for adding inventory
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: 0,
      unit: "kg",
      minQuantity: 0,
    },
  });

  // Form for editing inventory
  const editForm = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: 0,
      unit: "kg",
      minQuantity: 0,
    },
  });

  // Add inventory mutation
  const addMutation = useMutation({
    mutationFn: async (values: InventoryFormValues) => {
      return apiRequest('POST', '/api/inventory', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: "Inventory Added",
        description: "The inventory item has been added successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add inventory",
        description: "There was an error adding the inventory item.",
      });
    },
  });

  // Update inventory mutation
  const updateMutation = useMutation({
    mutationFn: async (values: InventoryFormValues & { id: number }) => {
      const { id, ...updateData } = values;
      return apiRequest('PATCH', `/api/inventory/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: "Inventory Updated",
        description: "The inventory item has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      setEditItem(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update inventory",
        description: "There was an error updating the inventory item.",
      });
    },
  });

  // Delete inventory mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: "Inventory Deleted",
        description: "The inventory item has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete inventory",
        description: "There was an error deleting the inventory item.",
      });
    },
  });

  // Submit handler for add form
  function onSubmit(values: InventoryFormValues) {
    addMutation.mutate(values);
  }

  // Submit handler for edit form
  function onEditSubmit(values: InventoryFormValues) {
    if (editItem) {
      updateMutation.mutate({ ...values, id: editItem.id });
    }
  }

  // Open edit dialog with item data
  function handleEdit(item: any) {
    setEditItem(item);
    editForm.reset({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity,
    });
    setIsEditDialogOpen(true);
  }

  // Open delete confirmation dialog
  function handleDelete(item: any) {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  }

  // Confirm delete
  function confirmDelete() {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  }

  // Filter inventory items based on search query and category
  const filteredItems = inventoryItems.filter((item: any) => {
    let matches = true;
    
    // Search filter
    if (searchQuery) {
      matches = matches && (
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Category filter
    if (categoryFilter) {
      matches = matches && item.category === categoryFilter;
    }
    
    // Low stock filter
    if (showLowStock) {
      matches = matches && item.quantity <= item.minQuantity;
    }
    
    return matches;
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
          <p className="text-neutral-400">
            Monitor and manage your inventory levels, categories, and low stock alerts
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Inventory Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>
                Add a new item to your inventory. Fill in all the required fields.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Tomatoes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INVENTORY_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INVENTORY_UNITS.map(unit => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        When stock falls below this level, alerts will be triggered.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      "Add Item"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search inventory..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter || ""} onValueChange={(value) => setCategoryFilter(value || null)}>
            <SelectTrigger className="w-full sm:w-48">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{categoryFilter || "All Categories"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {INVENTORY_CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant={showLowStock ? "default" : "outline"}
            className="flex gap-2 w-full sm:w-auto"
            onClick={() => setShowLowStock(!showLowStock)}
          >
            <AlertTriangle className="h-4 w-4" />
            {showLowStock ? "Showing Low Stock" : "Show Low Stock"}
          </Button>
          
          <Button
            variant="outline" 
            className="ml-auto w-full sm:w-auto"
            onClick={() => refetch()}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <TabsContent value="all">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>
                Manage your inventory items, quantities, and reorder levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <RotateCw className="h-8 w-8 animate-spin opacity-70" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package2 className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">No inventory items found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery || categoryFilter || showLowStock
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first inventory item."}
                  </p>
                  {!searchQuery && !categoryFilter && !showLowStock && (
                    <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Inventory Item
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell>
                          {item.quantity <= 0 ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              Out of Stock
                            </Badge>
                          ) : item.quantity <= item.minQuantity ? (
                            <Badge variant="warning" className="gap-1 bg-yellow-500">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-emerald-600 bg-emerald-50">
                              <CheckCircle className="h-3.5 w-3.5" />
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="text-xs text-muted-foreground">
                Showing {filteredItems.length} of {inventoryItems.length} inventory items
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>
                Items that are running low and need to be restocked soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <RotateCw className="h-8 w-8 animate-spin opacity-70" />
                </div>
              ) : (
                <div className="space-y-4">
                  {inventoryItems.filter((item: any) => item.quantity <= item.minQuantity).length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 opacity-70" />
                      <h3 className="mt-4 text-lg font-medium">All items are well-stocked</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        There are no items that are currently below their minimum quantity levels.
                      </p>
                    </div>
                  ) : (
                    inventoryItems
                      .filter((item: any) => item.quantity <= item.minQuantity)
                      .map((item: any) => (
                        <Card key={item.id} className="overflow-hidden">
                          <div className="bg-yellow-500 h-1 w-full"></div>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">{item.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{item.category}</Badge>
                                  {item.quantity <= 0 ? (
                                    <Badge variant="destructive" className="gap-1">
                                      <XCircle className="h-3.5 w-3.5" />
                                      Out of Stock
                                    </Badge>
                                  ) : (
                                    <Badge variant="warning" className="gap-1 bg-yellow-500">
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      Low Stock
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold">
                                  {item.quantity} <span className="text-sm">{item.unit}</span>
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  Min: {item.minQuantity} {item.unit}
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                Update Stock
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {INVENTORY_CATEGORIES.map(category => {
              const categoryItems = inventoryItems.filter((item: any) => item.category === category);
              const lowStockCount = categoryItems.filter((item: any) => item.quantity <= item.minQuantity).length;
              
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span>{category}</span>
                      <Badge variant="outline">{categoryItems.length} items</Badge>
                    </CardTitle>
                    <CardDescription>
                      Inventory items in the {category.toLowerCase()} category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {categoryItems.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        No items in this category
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lowStockCount > 0 && (
                          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-md mb-3">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{lowStockCount} items low on stock</span>
                          </div>
                        )}
                        {categoryItems
                          .sort((a: any, b: any) => a.quantity - b.quantity)
                          .slice(0, 5)
                          .map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                {item.quantity <= item.minQuantity && (
                                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-medium">
                                  {item.quantity} {item.unit}
                                </span>
                              </div>
                            </div>
                          ))}
                        {categoryItems.length > 5 && (
                          <Button 
                            variant="link" 
                            className="w-full text-xs h-8"
                            onClick={() => {
                              setCategoryFilter(category);
                              document.querySelector('[value="all"]')?.click();
                            }}
                          >
                            Show all {categoryItems.length} items
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update the details of your inventory item.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVENTORY_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INVENTORY_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      When stock falls below this level, alerts will be triggered.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Item"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {itemToDelete && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{itemToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Category:</span>
                  <span>{itemToDelete.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Current Quantity:</span>
                  <span>{itemToDelete.quantity} {itemToDelete.unit}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
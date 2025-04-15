import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  MenuSquare, PlusCircle, Search, Edit, Trash2, Filter, RotateCw, 
  CheckCircle, XCircle, ArrowUpDown, Tag, FolderUp, Download
} from "lucide-react";
import { insertMenuItemSchema } from "@shared/schema";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// Extend the insert schema with validation
const menuItemFormSchema = insertMenuItemSchema.extend({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  price: z.number().min(0, {
    message: "Price cannot be negative.",
  }),
  category: z.string().min(2, {
    message: "Category is required.",
  }),
  description: z.string().optional().nullable(),
  isAvailable: z.boolean().default(true),
});

type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

// Menu item categories
const MENU_CATEGORIES = [
  "Starters",
  "Main Course",
  "Desserts",
  "Beverages",
  "Sides",
  "Specials",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Vegan",
  "Snacks",
  "Soups"
];

export default function MenuItems() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editItem, setEditItem] = useState<any | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("availability");
  const [bulkAvailability, setBulkAvailability] = useState<boolean>(true);
  const [bulkCategory, setBulkCategory] = useState<string>("");

  // Fetch menu items
  const { data: menuItems = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/menu-items'],
  });

  // Form for adding menu item
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      description: "",
      isAvailable: true,
    },
  });

  // Form for editing menu item
  const editForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      description: "",
      isAvailable: true,
    },
  });

  // Add menu item mutation
  const addMutation = useMutation({
    mutationFn: async (values: MenuItemFormValues) => {
      return apiRequest('POST', '/api/menu-items', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      toast({
        title: "Menu Item Added",
        description: "The menu item has been added successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add menu item",
        description: "There was an error adding the menu item.",
      });
    },
  });

  // Update menu item mutation
  const updateMutation = useMutation({
    mutationFn: async (values: MenuItemFormValues & { id: number }) => {
      const { id, ...updateData } = values;
      return apiRequest('PATCH', `/api/menu-items/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      toast({
        title: "Menu Item Updated",
        description: "The menu item has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      setEditItem(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update menu item",
        description: "There was an error updating the menu item.",
      });
    },
  });

  // Delete menu item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      toast({
        title: "Menu Item Deleted",
        description: "The menu item has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete menu item",
        description: "There was an error deleting the menu item.",
      });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ 
      itemIds, 
      action, 
      value 
    }: { 
      itemIds: number[], 
      action: string, 
      value: any 
    }) => {
      return apiRequest('POST', '/api/menu-items/bulk-update', {
        itemIds,
        action,
        value
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      toast({
        title: "Menu Items Updated",
        description: `${selectedItems.length} menu items have been updated successfully.`,
      });
      setIsBulkEditDialogOpen(false);
      setSelectedItems([]);
      setBulkAction("availability");
      setBulkAvailability(true);
      setBulkCategory("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update menu items",
        description: "There was an error updating the menu items.",
      });
    },
  });

  // Submit handler for add form
  function onSubmit(values: MenuItemFormValues) {
    addMutation.mutate(values);
  }

  // Submit handler for edit form
  function onEditSubmit(values: MenuItemFormValues) {
    if (editItem) {
      updateMutation.mutate({ ...values, id: editItem.id });
    }
  }

  // Submit handler for bulk edit
  function onBulkEditSubmit() {
    if (selectedItems.length === 0) return;
    
    let value;
    if (bulkAction === "availability") {
      value = bulkAvailability;
    } else if (bulkAction === "category") {
      value = bulkCategory;
    }
    
    bulkUpdateMutation.mutate({
      itemIds: selectedItems,
      action: bulkAction,
      value
    });
  }

  // Open edit dialog with item data
  function handleEdit(item: any) {
    setEditItem(item);
    editForm.reset({
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable,
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

  // Toggle selection for bulk operations
  function toggleSelectItem(id: number) {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  }

  // Select/deselect all items
  function toggleSelectAll() {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item: any) => item.id));
    }
  }

  // Handle sort change
  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // Filter and sort menu items
  const filteredItems = menuItems
    .filter((item: any) => {
      let matches = true;
      
      // Search filter
      if (searchQuery) {
        matches = matches && (
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Category filter
      if (categoryFilter) {
        matches = matches && item.category === categoryFilter;
      }
      
      // Availability filter
      if (availabilityFilter === "available") {
        matches = matches && item.isAvailable;
      } else if (availabilityFilter === "unavailable") {
        matches = matches && !item.isAvailable;
      }
      
      return matches;
    })
    .sort((a: any, b: any) => {
      // Sort based on selected field and direction
      if (sortField === "name") {
        return sortDirection === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === "price") {
        return sortDirection === "asc"
          ? a.price - b.price
          : b.price - a.price;
      } else if (sortField === "category") {
        return sortDirection === "asc"
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      return 0;
    });

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Menu Management</h1>
          <p className="text-neutral-400">
            Manage your restaurant's menu items, categories, and availability
          </p>
        </div>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setIsBulkEditDialogOpen(true)}
              className="gap-2"
            >
              <Tag className="h-4 w-4" />
              Edit {selectedItems.length} Selected
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Menu Item</DialogTitle>
                <DialogDescription>
                  Add a new item to your restaurant menu. Fill in all the required fields.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Butter Chicken" {...field} />
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
                            {MENU_CATEGORIES.map(category => (
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
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (₹)</FormLabel>
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the dish, ingredients, and special notes..."
                            className="resize-none"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the URL of an image for this menu item
                        </FormDescription>
                        {field.value && (
                          <div className="mt-2 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                            <img 
                              src={field.value} 
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '';
                                (e.target as HTMLImageElement).alt = 'Error loading image';
                              }}
                            />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isAvailable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Available</FormLabel>
                          <FormDescription>
                            Mark this item as available on the menu
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
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
                        "Add Menu Item"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="grid" className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className="gap-1">
              <FolderUp className="h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search menu items..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter || ""} onValueChange={(value) => setCategoryFilter(value || null)}>
            <SelectTrigger className="w-full sm:w-44">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{categoryFilter || "All Categories"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MENU_CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>
                  {availabilityFilter === "all" && "All Items"}
                  {availabilityFilter === "available" && "Available Only"}
                  {availabilityFilter === "unavailable" && "Unavailable Only"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="available">Available Only</SelectItem>
              <SelectItem value="unavailable">Unavailable Only</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline" 
            className="ml-auto w-full sm:w-auto"
            onClick={() => refetch()}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <TabsContent value="grid">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <RotateCw className="h-8 w-8 animate-spin opacity-70" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <MenuSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
              <h3 className="mt-4 text-lg font-medium">No menu items found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery || categoryFilter || availabilityFilter !== "all"
                  ? "Try adjusting your filters to find what you're looking for."
                  : "Get started by adding your first menu item."}
              </p>
              {!searchQuery && !categoryFilter && availabilityFilter === "all" && (
                <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Menu Item
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item: any) => (
                <Card key={item.id} className="relative overflow-hidden">
                  <div className="absolute top-2 right-2 z-10">
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={async (checked) => {
                        await updateMutation.mutateAsync({
                          ...item,
                          isAvailable: checked
                        });
                      }}
                    />
                  </div>
                  {selectedItems.includes(item.id) && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-primary">Selected</Badge>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => toggleSelectItem(item.id)}
                  ></div>
                  <div className={`h-1 w-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  
                  {/* Image Display Section */}
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full bg-gray-100">
                        <MenuSquare className="h-12 w-12 text-gray-400" />
                        <p className="text-xs text-gray-500 mt-2">No image available</p>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <span className="text-xl font-semibold text-white">₹{item.price.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="mr-8">{item.name}</CardTitle>
                    </div>
                    <CardDescription>
                      <Badge variant="outline">{item.category}</Badge>
                      {!item.isAvailable && (
                        <Badge variant="destructive" className="ml-2">
                          Out of Stock
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {item.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No description available
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex gap-2 border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>
                Manage all your menu items in a detailed tabular view
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <RotateCw className="h-8 w-8 animate-spin opacity-70" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <MenuSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">No menu items found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery || categoryFilter || availabilityFilter !== "all"
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first menu item."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <div className="flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4"
                            checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                            onChange={toggleSelectAll}
                          />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === "name" && (
                            <ArrowUpDown className={`h-3.5 w-3.5 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("category")}
                      >
                        <div className="flex items-center gap-1">
                          Category
                          {sortField === "category" && (
                            <ArrowUpDown className={`h-3.5 w-3.5 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("price")}
                      >
                        <div className="flex items-center gap-1 justify-end">
                          Price
                          {sortField === "price" && (
                            <ArrowUpDown className={`h-3.5 w-3.5 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => toggleSelectItem(item.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.isAvailable ? (
                            <Badge className="bg-green-500 gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              Out of Stock
                            </Badge>
                          )}
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
                Showing {filteredItems.length} of {menuItems.length} menu items
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-6">
            {MENU_CATEGORIES
              .filter(category => {
                // If there's a category filter active, only show that category
                if (categoryFilter) {
                  return category === categoryFilter;
                }
                // Otherwise check if there are menu items in this category
                return menuItems.some((item: any) => 
                  item.category === category && 
                  (availabilityFilter === "all" || 
                   (availabilityFilter === "available" && item.isAvailable) || 
                   (availabilityFilter === "unavailable" && !item.isAvailable))
                );
              })
              .map(category => {
                const categoryItems = menuItems.filter((item: any) => 
                  item.category === category &&
                  (availabilityFilter === "all" || 
                   (availabilityFilter === "available" && item.isAvailable) || 
                   (availabilityFilter === "unavailable" && !item.isAvailable)) &&
                  (!searchQuery || 
                   item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())))
                );
                
                // Skip empty categories unless it's the specifically filtered category
                if (categoryItems.length === 0 && category !== categoryFilter) return null;
                
                return (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle>{category}</CardTitle>
                        <Badge variant="outline">{categoryItems.length} items</Badge>
                      </div>
                      <CardDescription>
                        {getCategoryDescription(category)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {categoryItems.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No items in this category match your filters</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryItems.map((item: any) => (
                            <div 
                              key={item.id}
                              className="flex justify-between items-center p-3 border rounded-md hover:bg-muted"
                            >
                              <div>
                                <h3 className="font-medium flex items-center">
                                  {item.name}
                                  {!item.isAvailable && (
                                    <XCircle className="h-3.5 w-3.5 ml-2 text-red-500" />
                                  )}
                                </h3>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">₹{item.price.toFixed(2)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              
            {filteredItems.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <MenuSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                <h3 className="mt-4 text-lg font-medium">No menu items found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery || categoryFilter || availabilityFilter !== "all"
                    ? "Try adjusting your filters to find what you're looking for."
                    : "Get started by adding your first menu item."}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update the details of your menu item.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
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
                        {MENU_CATEGORIES.map(category => (
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
              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/image.jpg"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the URL of an image for this menu item
                    </FormDescription>
                    {field.value && (
                      <div className="mt-2 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                        <img 
                          src={field.value} 
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).alt = 'Error loading image';
                          }}
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Available</FormLabel>
                      <FormDescription>
                        Mark this item as available on the menu
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
              Are you sure you want to delete this menu item? This action cannot be undone.
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
                  <span className="font-medium">Price:</span>
                  <span>₹{itemToDelete.price.toFixed(2)}</span>
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

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bulk Edit Menu Items</DialogTitle>
            <DialogDescription>
              Edit {selectedItems.length} menu items at once.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label>Action Type</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="availability">Change Availability</SelectItem>
                  <SelectItem value="category">Change Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {bulkAction === "availability" && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Available</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark these items as available on the menu
                  </p>
                </div>
                <Switch
                  checked={bulkAvailability}
                  onCheckedChange={setBulkAvailability}
                />
              </div>
            )}
            
            {bulkAction === "category" && (
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MENU_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onBulkEditSubmit}
              disabled={bulkUpdateMutation.isPending || 
                (bulkAction === "category" && !bulkCategory)}
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Items"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to get category descriptions
function getCategoryDescription(category: string): string {
  switch (category) {
    case "Starters":
      return "Appetizers and small plates to start your meal";
    case "Main Course":
      return "Primary dishes that form the core of a meal";
    case "Desserts":
      return "Sweet dishes served at the end of a meal";
    case "Beverages":
      return "Drinks and refreshments";
    case "Sides":
      return "Complementary dishes that accompany main courses";
    case "Specials":
      return "Chef's special dishes and seasonal offerings";
    case "Breakfast":
      return "Morning meals and breakfast specialties";
    case "Lunch":
      return "Midday meal options";
    case "Dinner":
      return "Evening meal selections";
    case "Vegan":
      return "Plant-based dishes with no animal products";
    case "Snacks":
      return "Light food items for in-between meals";
    case "Soups":
      return "Warm liquid food dishes and broths";
    default:
      return `Items in the ${category} category`;
  }
}
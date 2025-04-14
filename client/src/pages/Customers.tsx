import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, PlusCircle, Search, Edit, Trash2, RotateCw, 
  Mail, Phone, Calendar, Filter, Heart, Tag, ArrowUpDown
} from "lucide-react";
import { insertCustomerSchema } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extend the insert schema with validation
const customerFormSchema = insertCustomerSchema.extend({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }).optional().or(z.literal("")),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional().or(z.literal("")),
  preferences: z.array(z.string()).optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

// Customer preference tags
const CUSTOMER_PREFERENCES = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Non-Spicy",
  "Extra Spicy",
  "Dairy-Free",
  "Peanut Allergy",
  "Fast Service",
  "VIP",
  "Special Offers",
  "Birthday Special",
  "Regular"
];

export default function Customers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("visitCount");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editItem, setEditItem] = useState<any | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [filterVisits, setFilterVisits] = useState<string>("all");

  // Fetch customers
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Form for adding customer
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      visitCount: 0,
      preferences: [],
    },
  });

  // Form for editing customer
  const editForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      visitCount: 0,
      preferences: [],
    },
  });

  // Add customer mutation
  const addMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      return apiRequest('POST', '/api/customers', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer Added",
        description: "The customer has been added successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add customer",
        description: "There was an error adding the customer.",
      });
    },
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async (values: CustomerFormValues & { id: number }) => {
      const { id, ...updateData } = values;
      return apiRequest('PATCH', `/api/customers/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer Updated",
        description: "The customer information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      setEditItem(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update customer",
        description: "There was an error updating the customer information.",
      });
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer Deleted",
        description: "The customer has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete customer",
        description: "There was an error deleting the customer.",
      });
    },
  });

  // Submit handler for add form
  function onSubmit(values: CustomerFormValues) {
    addMutation.mutate(values);
  }

  // Submit handler for edit form
  function onEditSubmit(values: CustomerFormValues) {
    if (editItem) {
      updateMutation.mutate({ ...values, id: editItem.id });
    }
  }

  // Open edit dialog with item data
  function handleEdit(item: any) {
    setEditItem(item);
    editForm.reset({
      name: item.name,
      phone: item.phone || "",
      email: item.email || "",
      visitCount: item.visitCount,
      preferences: item.preferences || [],
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

  // Handle sort change
  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  // Filter and sort customers
  const filteredCustomers = customers
    .filter((customer: any) => {
      let matches = true;
      
      // Search filter
      if (searchQuery) {
        matches = matches && (
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (customer.phone && customer.phone.includes(searchQuery)) ||
          (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      
      // Visit count filter
      if (filterVisits === "new") {
        matches = matches && customer.visitCount <= 1;
      } else if (filterVisits === "regular") {
        matches = matches && customer.visitCount >= 2 && customer.visitCount <= 10;
      } else if (filterVisits === "loyal") {
        matches = matches && customer.visitCount > 10;
      }
      
      return matches;
    })
    .sort((a: any, b: any) => {
      // Sort based on selected field and direction
      if (sortField === "name") {
        return sortDirection === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === "visitCount") {
        return sortDirection === "asc"
          ? a.visitCount - b.visitCount
          : b.visitCount - a.visitCount;
      } else if (sortField === "lastVisit") {
        return sortDirection === "asc"
          ? new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()
          : new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      }
      return 0;
    });

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Customer Management</h1>
          <p className="text-neutral-400">
            Manage your customer database, preferences, and visit history
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Add a new customer to your database. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferences</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {CUSTOMER_PREFERENCES.map(preference => {
                          const isSelected = field.value?.includes(preference) || false;
                          return (
                            <Badge
                              key={preference}
                              variant={isSelected ? "default" : "outline"}
                              className={`cursor-pointer ${
                                isSelected ? "bg-primary" : ""
                              }`}
                              onClick={() => {
                                const currentPreferences = field.value || [];
                                const updatedPreferences = isSelected
                                  ? currentPreferences.filter(p => p !== preference)
                                  : [...currentPreferences, preference];
                                field.onChange(updatedPreferences);
                              }}
                            >
                              {preference}
                            </Badge>
                          );
                        })}
                      </div>
                      <FormDescription>
                        Select all that apply to this customer.
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
                      "Add Customer"
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
          <TabsTrigger value="all">All Customers</TabsTrigger>
          <TabsTrigger value="loyal">Loyal Customers</TabsTrigger>
          <TabsTrigger value="recent">Recent Visitors</TabsTrigger>
        </TabsList>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={filterVisits} onValueChange={setFilterVisits}>
            <SelectTrigger className="w-full sm:w-48">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>
                  {filterVisits === "all" && "All Visits"}
                  {filterVisits === "new" && "New Customers"}
                  {filterVisits === "regular" && "Regular Customers"}
                  {filterVisits === "loyal" && "Loyal Customers"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visits</SelectItem>
              <SelectItem value="new">New Customers (≤1 visit)</SelectItem>
              <SelectItem value="regular">Regular Customers (2-10 visits)</SelectItem>
              <SelectItem value="loyal">Loyal Customers ({">"} 10 visits)</SelectItem>
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

        <TabsContent value="all">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Customer Database</CardTitle>
              <CardDescription>
                Manage your customer information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <RotateCw className="h-8 w-8 animate-spin opacity-70" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">No customers found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery || filterVisits !== "all"
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first customer."}
                  </p>
                  {!searchQuery && filterVisits === "all" && (
                    <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableHead>Contact</TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("visitCount")}
                      >
                        <div className="flex items-center gap-1">
                          Visits
                          {sortField === "visitCount" && (
                            <ArrowUpDown className={`h-3.5 w-3.5 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("lastVisit")}
                      >
                        <div className="flex items-center gap-1">
                          Last Visit
                          {sortField === "lastVisit" && (
                            <ArrowUpDown className={`h-3.5 w-3.5 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Preferences</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            customer.visitCount > 10 
                              ? "default" 
                              : customer.visitCount > 1 
                                ? "outline"
                                : "secondary"
                          }>
                            {customer.visitCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            {new Date(customer.lastVisit).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {customer.preferences?.length > 0 ? (
                              customer.preferences.slice(0, 3).map((pref: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {pref}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                            {customer.preferences?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{customer.preferences.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer)}
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
                Showing {filteredCustomers.length} of {customers.length} customers
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="loyal">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {customers
              .filter((customer: any) => customer.visitCount > 10)
              .sort((a: any, b: any) => b.visitCount - a.visitCount)
              .map((customer: any) => (
                <Card key={customer.id} className="overflow-hidden">
                  <div className="bg-primary h-1 w-full"></div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle>{customer.name}</CardTitle>
                      <Badge>{customer.visitCount} visits</Badge>
                    </div>
                    <CardDescription>
                      Last visit: {new Date(customer.lastVisit).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Contact Information</h4>
                        <div className="space-y-1 text-sm">
                          {customer.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center">
                              <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-1">Preferences</h4>
                        <div className="flex flex-wrap gap-1">
                          {customer.preferences?.length > 0 ? (
                            customer.preferences.map((pref: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {pref}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">None specified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t px-6 py-3">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Heart className="h-3.5 w-3.5 mr-1.5" />
                      Send Offer
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              
              {customers.filter((customer: any) => customer.visitCount > 10).length === 0 && (
                <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">No loyal customers yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Loyal customers have more than 10 visits to your restaurant.
                  </p>
                </div>
              )}
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent Visitors</CardTitle>
              <CardDescription>
                Customers who visited in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <RotateCw className="h-8 w-8 animate-spin opacity-70" />
                </div>
              ) : (
                <div className="space-y-4">
                  {customers
                    .filter((customer: any) => {
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return new Date(customer.lastVisit) >= thirtyDaysAgo;
                    })
                    .sort((a: any, b: any) => 
                      new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
                    )
                    .slice(0, 5)
                    .map((customer: any) => (
                      <div 
                        key={customer.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{customer.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Visited {new Date(customer.lastVisit).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{customer.visitCount} visits</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                  {customers.filter((customer: any) => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return new Date(customer.lastVisit) >= thirtyDaysAgo;
                  }).length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                      <h3 className="mt-4 text-lg font-medium">No recent visitors</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        There are no customers who visited in the last 30 days.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="outline" className="w-full">
                <Tag className="h-4 w-4 mr-2" />
                Run Customer Outreach Campaign
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="visitCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferences</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {CUSTOMER_PREFERENCES.map(preference => {
                        const isSelected = field.value?.includes(preference) || false;
                        return (
                          <Badge
                            key={preference}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer ${
                              isSelected ? "bg-primary" : ""
                            }`}
                            onClick={() => {
                              const currentPreferences = field.value || [];
                              const updatedPreferences = isSelected
                                ? currentPreferences.filter(p => p !== preference)
                                : [...currentPreferences, preference];
                              field.onChange(updatedPreferences);
                            }}
                          >
                            {preference}
                          </Badge>
                        );
                      })}
                    </div>
                    <FormDescription>
                      Select all that apply to this customer.
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
                    "Update Customer"
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
              Are you sure you want to delete this customer? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {itemToDelete && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{itemToDelete.name}</span>
                </div>
                {itemToDelete.phone && (
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span>{itemToDelete.phone}</span>
                  </div>
                )}
                {itemToDelete.email && (
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span>{itemToDelete.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Visit Count:</span>
                  <span>{itemToDelete.visitCount}</span>
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
                "Delete Customer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
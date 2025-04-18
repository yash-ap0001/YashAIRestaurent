import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BillDetails } from "@/components/billing/BillDetails";
import { Order, Bill } from "@shared/schema";
import { 
  Search, 
  ReceiptText, 
  ClipboardList,
  BarChart3,
  X,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  ArrowUpDown,
  Check,
  Printer
} from "lucide-react";
import { Tabs as TabsComponent, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortField = "orderNumber" | "tableNumber" | "createdAt" | "totalAmount";
type SortOrder = "asc" | "desc";
type FilterOption = "all" | "billed" | "unbilled";

export default function Billing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
  });

  // Function to handle order click
  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setBillDialogOpen(true);
  };

  // Filtering orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = [...orders];
    
    // Filter by status first (completed or ready)
    filtered = filtered.filter(order => 
      order.status === "completed" || order.status === "ready"
    );
    
    // Apply search term
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        (order.orderNumber?.toLowerCase().includes(lowercaseSearch) || false) ||
        (order.tableNumber?.toLowerCase().includes(lowercaseSearch) || false) ||
        (order.notes?.toLowerCase().includes(lowercaseSearch) || false)
      );
    }
    
    // Apply bill filter
    if (filterOption !== 'all') {
      const hasBill = filterOption === 'billed';
      filtered = filtered.filter(order => {
        const orderHasBill = bills.some(bill => bill.orderId === order.id);
        return hasBill ? orderHasBill : !orderHasBill;
      });
    }
    
    // Sort the orders
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'orderNumber':
          comparison = (a.orderNumber || '').localeCompare(b.orderNumber || '');
          break;
        case 'tableNumber':
          comparison = (a.tableNumber || '').localeCompare(b.tableNumber || '');
          break;
        case 'totalAmount':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'createdAt':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [orders, bills, searchTerm, sortField, sortOrder, filterOption]);

  // Calculate stats
  const billedCount = bills.length;
  const pendingBillCount = filteredOrders?.filter(order => 
    !bills.some(bill => bill.orderId === order.id)
  ).length || 0;

  const totalRevenue = bills.reduce((acc, bill) => acc + (bill.total || 0), 0);
  
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />;
  };
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TabsComponent defaultValue="board" className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-2 border-b bg-muted/30">
          <TabsList className="mb-2 md:mb-0">
            <TabsTrigger value="board" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="h-4 w-4 mr-2" />
              Billing Dashboard
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Billing Stats
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap justify-end md:flex-nowrap">
            <div className="relative w-full md:w-auto">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order #, table, notes..."
                className="pl-10 w-full md:w-64 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem 
                  checked={filterOption === 'all'}
                  onCheckedChange={() => setFilterOption('all')}
                >
                  All Orders
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={filterOption === 'billed'}
                  onCheckedChange={() => setFilterOption('billed')}
                >
                  Billed Orders
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={filterOption === 'unbilled'}
                  onCheckedChange={() => setFilterOption('unbilled')}
                >
                  Unbilled Orders
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="50 per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="board" className="flex flex-col h-full pt-0 overflow-hidden">
          <div className="flex-grow overflow-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <Table className="relative">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-1/5">
                      <div 
                        className="flex items-center cursor-pointer" 
                        onClick={() => handleSort('orderNumber')}
                      >
                        Order
                        {renderSortIcon('orderNumber')}
                      </div>
                    </TableHead>
                    <TableHead className="w-1/6">
                      <div 
                        className="flex items-center cursor-pointer" 
                        onClick={() => handleSort('tableNumber')}
                      >
                        Table
                        {renderSortIcon('tableNumber')}
                      </div>
                    </TableHead>
                    <TableHead className="w-1/6">
                      <div 
                        className="flex items-center cursor-pointer" 
                        onClick={() => handleSort('createdAt')}
                      >
                        Date/Time
                        {renderSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead className="w-1/6 text-right">
                      <div 
                        className="flex items-center justify-end cursor-pointer" 
                        onClick={() => handleSort('totalAmount')}
                      >
                        Amount
                        {renderSortIcon('totalAmount')}
                      </div>
                    </TableHead>
                    <TableHead className="w-1/7">Status</TableHead>
                    <TableHead className="w-1/10 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.slice(0, itemsPerPage).map(order => {
                    const hasBill = bills.some(bill => bill.orderId === order.id);
                    
                    return (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrderClick(order.id)}>
                        <TableCell className="font-medium">
                          #{order.orderNumber}
                        </TableCell>
                        <TableCell>
                          {order.tableNumber || "Takeaway"}
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy HH:mm") : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{order.totalAmount?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell>
                          {hasBill ? (
                            <Badge className="bg-gray-600">Already Billed</Badge>
                          ) : (
                            <Badge className="bg-green-600">Ready to Bill</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOrderClick(order.id);
                              }}
                            >
                              <ReceiptText className="h-4 w-4 mr-1" /> View
                            </Button>
                            {hasBill && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Find the bill for this order and open the bill dialog
                                  const bill = bills.find(b => b.orderId === order.id);
                                  if (bill) {
                                    setSelectedOrderId(order.id);
                                    setBillDialogOpen(true);
                                  }
                                }}
                              >
                                <Printer className="h-4 w-4 mr-1" /> Print
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-12 text-muted-foreground">
                  <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">
                    {searchTerm || filterOption !== 'all' ? "No matching orders found" : "No billable orders available"}
                  </p>
                  <p className="text-sm max-w-md mx-auto">
                    {searchTerm || filterOption !== 'all' ? 
                      "Try adjusting your search terms or filters" : 
                      "Orders with 'completed' or 'ready' status will appear here"}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t bg-muted/30 text-sm text-muted-foreground flex justify-between">
            <div>
              Showing {Math.min(filteredOrders.length, itemsPerPage)} of {filteredOrders.length} orders
            </div>
            <div className="flex gap-4">
              <span>Billed: {billedCount}</span>
              <span>Pending: {pendingBillCount}</span>
              <span>Total Revenue: ₹{totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </TabsContent>
        
        {/* Bill Details Dialog */}
        <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-bold text-primary">Bill Details</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogHeader>
            {selectedOrderId ? (
              <BillDetails orderId={selectedOrderId} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No order selected</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <TabsContent value="stats" className="flex-grow h-full overflow-auto">
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 shadow">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold">Today's Bills</h3>
                  <p className="text-3xl font-bold mt-2">{billedCount}</p>
                  <p className="text-sm mt-2 opacity-80">Total bills generated today</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-500 to-green-700 text-white border-0 shadow">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold">Total Revenue</h3>
                  <p className="text-3xl font-bold mt-2">₹{bills.reduce((acc, bill) => acc + (bill.total || 0), 0).toLocaleString()}</p>
                  <p className="text-sm mt-2 opacity-80">Total earnings from all bills</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 shadow">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold">Pending Bills</h3>
                  <p className="text-3xl font-bold mt-2">{pendingBillCount}</p>
                  <p className="text-sm mt-2 opacity-80">Orders ready to be billed</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-primary">Average Bill Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      ₹{bills.length > 0 
                        ? Math.round(bills.reduce((acc, bill) => acc + (bill.total || 0), 0) / bills.length).toLocaleString() 
                        : 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Average amount per bill</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-primary">Billing Conversion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {orders && orders.length > 0 
                        ? Math.round((bills.length / orders.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Orders converted to bills</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </TabsComponent>
    </div>
  );
}

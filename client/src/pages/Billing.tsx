import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BillDetails } from "@/components/billing/BillDetails";
import { Order } from "@shared/schema";
import { Search } from "lucide-react";

export default function Billing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const filteredOrders = orders?.filter(order => 
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const completedOrders = filteredOrders?.filter(order => 
    order.status === "completed" || order.status === "ready"
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Billable Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
              <Input
                type="text"
                placeholder="Search orders by number or table"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {isLoading ? (
              <p className="text-center py-8 text-neutral-500">Loading orders...</p>
            ) : completedOrders && completedOrders.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {completedOrders.map(order => (
                  <div 
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedOrderId === order.id 
                        ? "border-primary-500 bg-primary-50" 
                        : "border-neutral-200 hover:border-primary-300 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium">#{order.orderNumber}</h3>
                        <p className="text-sm text-neutral-500">{order.tableNumber || "Takeaway"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{order.totalAmount.toLocaleString()}</p>
                        <p className="text-xs text-neutral-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-neutral-500">
                {searchTerm ? "No matching orders found" : "No billable orders available"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Bill Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedOrderId ? (
            <BillDetails orderId={selectedOrderId} />
          ) : (
            <div className="text-center py-20 text-neutral-500">
              <p className="text-lg font-medium mb-2">No order selected</p>
              <p className="text-sm">Select an order from the list to view bill details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

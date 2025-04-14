import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Order
} from "@shared/schema";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface RecentOrdersProps {
  className?: string;
}

export function RecentOrders({ className }: RecentOrdersProps) {
  const { data, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900 bg-opacity-40 text-green-400';
      case 'in-progress':
        return 'bg-amber-900 bg-opacity-40 text-amber-400';
      case 'billed':
        return 'bg-purple-900 bg-opacity-40 text-purple-400';
      default:
        return 'bg-neutral-800 text-neutral-400';
    }
  };
  
  const getSourceBadgeClass = (source?: string) => {
    switch (source) {
      case 'manual':
        return 'bg-blue-900 bg-opacity-40 text-blue-400';
      case 'ai_simulator':
        return 'bg-purple-900 bg-opacity-40 text-purple-400';
      case 'whatsapp':
        return 'bg-green-900 bg-opacity-40 text-green-400';
      case 'phone':
        return 'bg-amber-900 bg-opacity-40 text-amber-400';
      default:
        return 'bg-neutral-800 text-neutral-400';
    }
  };

  const formatTimeAgo = (dateString: any) => {
    if (!dateString) return 'Unknown time';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Card className={`bg-neutral-800 border-neutral-700 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="font-medium text-base text-white">Recent Orders</CardTitle>
        <Link href="/orders">
          <Button variant="link" className="text-purple-400 hover:text-purple-300">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-1/4 bg-neutral-700" />
                <Skeleton className="h-4 w-1/4 bg-neutral-700" />
                <Skeleton className="h-4 w-1/4 bg-neutral-700" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-700">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-neutral-800 divide-y divide-neutral-700">
                {data?.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-700">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                      #{order.orderNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-300">
                      {order.tableNumber || 'Takeaway'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-300">
                      {/* This would be a count from order items */}
                      {Math.floor(Math.random() * 6) + 1} items
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-300">
                      ₹{order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {order.orderSource ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSourceBadgeClass(order.orderSource)}`}>
                          {order.orderSource === 'ai_simulator' ? 'AI' :
                           order.orderSource === 'whatsapp' ? 'WhatsApp' :
                           order.orderSource === 'manual' ? 'Manual' :
                           order.orderSource === 'phone' ? 'Phone' :
                           order.orderSource}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-500">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-300">
                      {formatTimeAgo(order.createdAt)}
                    </td>
                  </tr>
                ))}
                {!data?.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-sm text-center text-neutral-400">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

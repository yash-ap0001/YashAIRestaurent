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
        return 'bg-secondary-50 text-secondary-700';
      case 'in-progress':
        return 'bg-warning-50 text-warning-700';
      case 'billed':
        return 'bg-primary-50 text-primary-700';
      default:
        return 'bg-neutral-50 text-neutral-600';
    }
  };

  const formatTimeAgo = (dateString: Date) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="font-medium text-base">Recent Orders</CardTitle>
        <Link href="/orders">
          <Button variant="link" className="text-primary-500 hover:text-primary-600">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {data?.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-800">
                      #{order.orderNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                      {order.tableNumber || 'Takeaway'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                      {/* This would be a count from order items */}
                      {Math.floor(Math.random() * 6) + 1} items
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                      ₹{order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                      {formatTimeAgo(order.createdAt)}
                    </td>
                  </tr>
                ))}
                {!data?.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-center text-neutral-500">
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

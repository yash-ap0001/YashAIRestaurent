import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Receipt, Bell, CreditCard, UserRound, AlertTriangle
} from "lucide-react";
import { Activity } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityProps {
  className?: string;
}

export function RecentActivity({ className }: RecentActivityProps) {
  const { data, isLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      const res = await fetch('/api/activities?limit=5');
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    }
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return (
          <div className="h-8 w-8 rounded-full bg-purple-900 bg-opacity-40 flex items-center justify-center text-purple-300">
            <Receipt className="h-4 w-4" />
          </div>
        );
      case 'inventory_alert':
        return (
          <div className="h-8 w-8 rounded-full bg-amber-900 bg-opacity-40 flex items-center justify-center text-amber-300">
            <Bell className="h-4 w-4" />
          </div>
        );
      case 'bill_created':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-900 bg-opacity-40 flex items-center justify-center text-blue-300">
            <CreditCard className="h-4 w-4" />
          </div>
        );
      case 'customer_created':
        return (
          <div className="h-8 w-8 rounded-full bg-green-900 bg-opacity-40 flex items-center justify-center text-green-300">
            <UserRound className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-red-900 bg-opacity-40 flex items-center justify-center text-red-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
    }
  };

  const formatTimeAgo = (dateString: Date | null) => {
    if (!dateString) return "unknown time";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return "unknown time";
    }
  };

  return (
    <Card className={`bg-neutral-800 border-neutral-700 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="font-medium text-base text-white">Recent Activity</CardTitle>
        <Button variant="link" className="text-purple-400 hover:text-purple-300">
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-4 overflow-hidden">
        {isLoading ? (
          <ul className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <li key={i} className="flex">
                <Skeleton className="h-8 w-8 rounded-full mr-3 bg-neutral-700" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1 bg-neutral-700" />
                  <Skeleton className="h-3 w-1/4 bg-neutral-700" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-4">
            {data?.map((activity) => (
              <li key={activity.id} className="flex">
                <div className="mr-3 flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-white">
                      {activity.type.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                    <span className="font-normal text-neutral-400"> {activity.description}</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{formatTimeAgo(activity.createdAt)}</p>
                </div>
              </li>
            ))}
            
            {(!data || data.length === 0) && (
              <li className="py-4 text-center text-neutral-400">
                No recent activity
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CreditCard, Receipt, HandPlatter, ChefHat, 
  ArrowUpRight, Clock, AlertTriangle 
} from "lucide-react";

interface DashboardStatsProps {
  className?: string;
}

interface DashboardStats {
  todaysSales: number;
  ordersCount: number;
  activeTables: number;
  totalTables: number;
  kitchenQueueCount: number;
  urgentTokensCount: number;
}

export function DashboardStats({ className }: DashboardStatsProps) {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-8 w-1/3 mb-4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Today's Sales Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Today's Sales</p>
              <h3 className="text-2xl font-semibold text-neutral-800 mt-1">₹{data.todaysSales.toLocaleString()}</h3>
            </div>
            <div className="rounded-full bg-primary-50 p-2">
              <CreditCard className="h-5 w-5 text-primary-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-secondary-500 flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1" /> 17.8%
            </span>
            <span className="ml-2 text-neutral-500">vs yesterday</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders Today Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Orders Today</p>
              <h3 className="text-2xl font-semibold text-neutral-800 mt-1">{data.ordersCount}</h3>
            </div>
            <div className="rounded-full bg-accent-50 p-2">
              <Receipt className="h-5 w-5 text-accent-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-secondary-500 flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1" /> 5.4%
            </span>
            <span className="ml-2 text-neutral-500">vs yesterday</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Tables Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Active Tables</p>
              <h3 className="text-2xl font-semibold text-neutral-800 mt-1">{data.activeTables}/{data.totalTables}</h3>
            </div>
            <div className="rounded-full bg-secondary-50 p-2">
              <HandPlatter className="h-5 w-5 text-secondary-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-neutral-800 font-medium">
              {Math.round((data.activeTables / data.totalTables) * 100)}% occupancy
            </span>
            <span className="ml-2 text-neutral-500">at present</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Kitchen Queue Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Kitchen Queue</p>
              <h3 className="text-2xl font-semibold text-neutral-800 mt-1">{data.kitchenQueueCount}</h3>
            </div>
            <div className="rounded-full bg-warning-50 p-2">
              <ChefHat className="h-5 w-5 text-warning-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            {data.urgentTokensCount > 0 ? (
              <span className="text-warning-600 flex items-center font-medium">
                <AlertTriangle className="h-4 w-4 mr-1" /> {data.urgentTokensCount} urgent
              </span>
            ) : (
              <span className="text-secondary-600 flex items-center font-medium">
                <Clock className="h-4 w-4 mr-1" /> On track
              </span>
            )}
            <span className="ml-2 text-neutral-500">tokens</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

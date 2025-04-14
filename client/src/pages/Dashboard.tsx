import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { LiveKitchenStatus } from "@/components/dashboard/LiveKitchenStatus";
import { SalesOverview } from "@/components/dashboard/SalesOverview";
import { TopSellingItems } from "@/components/dashboard/TopSellingItems";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PersonalizedRecommendations } from "@/components/dashboard/PersonalizedRecommendations";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <DashboardStats />
      
      {/* Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentOrders className="lg:col-span-2" />
        <LiveKitchenStatus />
      </div>
      
      {/* Sales Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesOverview className="lg:col-span-2" />
        <TopSellingItems />
      </div>
      
      {/* AI and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivity className="lg:col-span-2" />
        <PersonalizedRecommendations />
      </div>
    </div>
  );
}

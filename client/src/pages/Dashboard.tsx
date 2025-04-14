import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { LiveKitchenStatus } from "@/components/dashboard/LiveKitchenStatus";
import { SalesOverview } from "@/components/dashboard/SalesOverview";
import { TopSellingItems } from "@/components/dashboard/TopSellingItems";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PersonalizedRecommendations } from "@/components/dashboard/PersonalizedRecommendations";
import { LiveOrderTracker } from "@/components/orders/LiveOrderTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Activity, ArrowRight } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <DashboardStats />
      
      {/* Live Order Tracking */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Live Order Tracking</h2>
          <Link href="/live-tracking">
            <Button variant="outline" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <LiveOrderTracker />
        </div>
      </div>
      
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

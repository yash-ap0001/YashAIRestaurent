import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItem } from "@shared/schema";
import { Utensils, Coffee, UtensilsCrossed, GlassWater, IceCream2 } from "lucide-react";

interface TopSellingItemsProps {
  className?: string;
}

// This would normally come from the server with real data
// For demo purposes, we're calculating this from menu items
interface TopSeller {
  menuItem: MenuItem;
  orderCount: number;
  totalSales: number;
}

export function TopSellingItems({ className }: TopSellingItemsProps) {
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  // Generate some mock top sellers based on menu items
  // In a real app, this would be an API endpoint with actual sales data
  const getTopSellers = (): TopSeller[] => {
    if (!menuItems || menuItems.length === 0) return [];
    
    return menuItems.map((item, index) => {
      // Create some mock order counts that decrease by item index
      const orderCount = 50 - (index * 10);
      return {
        menuItem: item,
        orderCount: Math.max(10, orderCount),
        totalSales: item.price * Math.max(10, orderCount)
      };
    }).sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
  };

  const topSellers = getTopSellers();

  // Helper function to get the appropriate icon based on category
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'main course':
        return <Utensils className="h-4 w-4" />;
      case 'appetizer':
        return <UtensilsCrossed className="h-4 w-4" />;
      case 'beverage':
        return <GlassWater className="h-4 w-4" />;
      case 'dessert':
        return <IceCream2 className="h-4 w-4" />;
      default:
        return <Coffee className="h-4 w-4" />;
    }
  };

  // Generate a color for the icon background based on item index
  const getIconBgColor = (index: number) => {
    const colors = [
      'bg-purple-900 bg-opacity-40 text-purple-300',
      'bg-indigo-900 bg-opacity-40 text-indigo-300',
      'bg-blue-900 bg-opacity-40 text-blue-300',
      'bg-amber-900 bg-opacity-40 text-amber-300',
      'bg-green-900 bg-opacity-40 text-green-300'
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className={`bg-neutral-800 border-neutral-700 ${className}`}>
      <CardHeader className="py-3">
        <CardTitle className="font-medium text-base text-white">Top Selling Items</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <ul className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <li key={i} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 rounded-full bg-neutral-700" />
                  <div className="ml-3">
                    <Skeleton className="h-4 w-24 bg-neutral-700" />
                    <Skeleton className="h-3 w-16 mt-1 bg-neutral-700" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16 bg-neutral-700" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-3">
            {topSellers.map((item, index) => (
              <li key={item.menuItem.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full ${getIconBgColor(index)} flex items-center justify-center`}>
                    {getCategoryIcon(item.menuItem.category)}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{item.menuItem.name}</p>
                    <p className="text-xs text-neutral-400">{item.orderCount} orders today</p>
                  </div>
                </div>
                <div className="text-sm font-medium text-purple-300">₹{item.totalSales.toLocaleString()}</div>
              </li>
            ))}

            {(!menuItems || menuItems.length === 0) && (
              <li className="py-4 text-center text-neutral-400">
                No menu items available
              </li>
            )}
          </ul>
        )}
        
        <Link href="/menu-items">
          <Button className="w-full mt-4 border border-purple-700 text-white bg-purple-900 hover:bg-purple-800">
            View All Menu Items
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

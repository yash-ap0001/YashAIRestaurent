import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MenuItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Utensils, Coffee, Star } from "lucide-react";

interface PersonalizedRecommendationsProps {
  className?: string;
  customerId?: number;
}

interface Recommendation {
  menuItem: MenuItem;
  confidence: number;
  reason: string;
}

export function PersonalizedRecommendations({ className, customerId }: PersonalizedRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  const generateRecommendations = async () => {
    if (!menuItems || menuItems.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest({
        url: "/api/ai/menu-recommendations",
        method: "POST",
        body: {
          customerId: customerId || 1,
          pastOrders: true
        }
      });
      
      if (response && Array.isArray(response.recommendations)) {
        setRecommendations(response.recommendations || []);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error("Failed to get recommendations:", err);
      setError("Failed to generate recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-neutral-800 border-neutral-700">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="font-medium text-base text-white">Personalized Recommendations</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-purple-400 hover:text-purple-300"
          onClick={generateRecommendations}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-md bg-neutral-700" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2 bg-neutral-700" />
                  <Skeleton className="h-3 w-full bg-neutral-700" />
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-neutral-800 border border-neutral-700">
                <div className="bg-purple-900 bg-opacity-40 h-10 w-10 rounded-md flex items-center justify-center text-purple-300">
                  {rec.menuItem.category.toLowerCase().includes('dessert') ? 
                    <Coffee className="h-5 w-5" /> : 
                    <Utensils className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium text-white">{rec.menuItem.name}</h4>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-amber-400 mr-1" fill="#fbbf24" />
                      <span className="text-xs text-amber-400">
                        {Math.round(rec.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 px-2 rounded-md bg-neutral-800 border border-neutral-700">
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : (
              <>
                <p className="text-sm text-neutral-300 mb-3">
                  Click "Generate" to get AI-powered dish recommendations based on customer preferences and order history
                </p>
                <Button 
                  onClick={generateRecommendations} 
                  className="bg-purple-900 text-white hover:bg-purple-800 w-full"
                >
                  Generate Recommendations
                </Button>
              </>
            )}
          </div>
        )}
        
        {recommendations.length > 0 && (
          <Link href="/new-order">
            <Button className="w-full mt-4 border border-purple-700 text-white bg-purple-900 hover:bg-purple-800">
              Create Order with Recommendation
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
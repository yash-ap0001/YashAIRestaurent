import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Leaf, Loader2, Heart } from "lucide-react";

const COMMON_DIETARY_RESTRICTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free" },
  { id: "nut-free", label: "Nut-Free" },
  { id: "low-carb", label: "Low-Carb" },
  { id: "keto", label: "Keto" },
  { id: "paleo", label: "Paleo" }
];

interface Recommendation {
  id: number;
  name: string;
  reasoning: string;
}

export function HealthRecommendations() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reasoning, setReasoning] = useState<string>("");

  const healthRecommendationsMutation = useMutation({
    mutationFn: async ({ preferences, restrictions }: { preferences: string, restrictions: string[] }) => {
      const response = await apiRequest("POST", "/api/ai/health-recommendations", {
        preferences,
        restrictions
      });
      return response.json();
    },
    onSuccess: (data) => {
      setRecommendations(data.recommendations || []);
      setReasoning(data.reasoning || "");
      toast({
        title: "Health recommendations generated",
        description: "AI has analyzed menu items based on your preferences"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error generating recommendations",
        description: error.message || "Could not generate health recommendations",
        variant: "destructive"
      });
    }
  });

  const handleRestrictionsChange = (id: string, checked: boolean) => {
    if (checked) {
      setRestrictions([...restrictions, id]);
    } else {
      setRestrictions(restrictions.filter(r => r !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences.trim()) {
      toast({
        title: "Please enter preferences",
        description: "Dietary preferences are required for recommendations",
        variant: "destructive"
      });
      return;
    }
    
    healthRecommendationsMutation.mutate({ preferences, restrictions });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-secondary-500" />
            Health-Conscious Recommendations
          </CardTitle>
          <CardDescription>
            Get AI-powered menu recommendations based on your dietary preferences and restrictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preferences">Dietary Preferences</Label>
              <Textarea
                id="preferences"
                placeholder="Describe your dietary preferences, health goals, or nutritional needs (e.g., high protein, low sodium, heart-healthy, diabetic-friendly)"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="resize-none min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Dietary Restrictions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMMON_DIETARY_RESTRICTIONS.map((restriction) => (
                  <div key={restriction.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={restriction.id}
                      checked={restrictions.includes(restriction.id)}
                      onCheckedChange={(checked) => 
                        handleRestrictionsChange(restriction.id, checked === true)
                      }
                    />
                    <label
                      htmlFor={restriction.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {restriction.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={healthRecommendationsMutation.isPending || !preferences.trim()}
            >
              {healthRecommendationsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating recommendations...
                </>
              ) : (
                <>
                  <Leaf className="mr-2 h-4 w-4" />
                  Generate Health Recommendations
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Menu Items</CardTitle>
            {reasoning && (
              <CardDescription>{reasoning}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-lg">{rec.name}</h3>
                    <Badge variant="secondary" className="bg-secondary-100 text-secondary-800">Recommended</Badge>
                  </div>
                  <p className="mt-2 text-neutral-600 text-sm">{rec.reasoning}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
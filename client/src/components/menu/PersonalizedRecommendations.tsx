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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Star } from "lucide-react";

interface PersonalizedRecommendationsProps {
  customerId?: number;
  className?: string;
}

interface Recommendation {
  id: number;
  name: string;
  reasoning: string;
}

export function PersonalizedRecommendations({ customerId, className }: PersonalizedRecommendationsProps) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reasoning, setReasoning] = useState<string>("");

  const recommendationsMutation = useMutation({
    mutationFn: async ({ customerId, preferences }: { customerId?: number, preferences: string }) => {
      const response = await apiRequest("POST", "/api/ai/menu-recommendations", {
        customerId,
        preferences
      });
      return response.json();
    },
    onSuccess: (data) => {
      setRecommendations(data.recommendations || []);
      setReasoning(data.reasoning || "");
      toast({
        title: "Personalized recommendations generated",
        description: "AI has analyzed your order history and preferences"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error generating recommendations",
        description: error.message || "Could not generate personalized recommendations",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recommendationsMutation.mutate({ customerId, preferences });
  };

  return (
    <div className={className}>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary-50 to-white">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Get AI-powered menu recommendations based on your order history and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Describe any specific preferences for today (optional)"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="resize-none min-h-[80px]"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={recommendationsMutation.isPending}
            >
              {recommendationsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating recommendations...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Personalized Recommendations
                </>
              )}
            </Button>
          </form>

          {recommendations.length > 0 && (
            <div className="mt-6 space-y-4">
              <Separator />
              <div className="pt-2">
                {reasoning && (
                  <p className="text-sm text-neutral-600 mb-4">{reasoning}</p>
                )}
                <div className="grid gap-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                      <div className="shrink-0 mt-1">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">{rec.name}</h4>
                        <p className="text-sm text-neutral-600 mt-1">{rec.reasoning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
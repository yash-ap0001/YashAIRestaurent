import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export default function DietPlan() {
  const [customerPhone, setCustomerPhone] = useState("");
  const [dietGoal, setDietGoal] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [dietPlanResult, setDietPlanResult] = useState<any>(null);
  const { toast } = useToast();

  const createDietPlan = async () => {
    if (!customerPhone) {
      toast({
        title: "Customer phone required",
        description: "Please enter a customer phone number",
        variant: "destructive",
      });
      return;
    }

    if (!dietGoal) {
      toast({
        title: "Diet goal required",
        description: "Please enter a health goal for the diet plan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/ai/create-diet-plan", {
        customerPhone,
        dietGoal,
        durationDays,
      });

      const data = await response.json();
      setDietPlanResult(data);

      if (data.success) {
        toast({
          title: "Diet Plan Created",
          description: data.message,
        });
      } else {
        toast({
          title: "Error Creating Diet Plan",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating diet plan:", error);
      toast({
        title: "Error",
        description: "Failed to create diet plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Create Personalized Diet Plan</h1>
          <p className="text-muted-foreground mb-6">
            Create AI-powered personalized diet plans for customers based on their health goals and dietary preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Diet Plan</CardTitle>
              <CardDescription>
                Fill out the form to generate a personalized diet plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dietGoal">Health Goal</Label>
                <Textarea
                  id="dietGoal"
                  value={dietGoal}
                  onChange={(e) => setDietGoal(e.target.value)}
                  placeholder="e.g., Losing weight, Managing diabetes, Building muscle, Improve digestion"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationDays">Duration (Days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  min={1}
                  max={30}
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={createDietPlan} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Diet Plan...
                  </>
                ) : (
                  "Generate Diet Plan"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className={dietPlanResult ? "" : "hidden md:block"}>
            <CardHeader>
              <CardTitle>Diet Plan Result</CardTitle>
              <CardDescription>
                {dietPlanResult?.success 
                  ? "The personalized diet plan has been created and scheduled"
                  : "Diet plan result will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dietPlanResult ? (
                dietPlanResult.success ? (
                  <Tabs defaultValue="plan">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="plan" className="flex-1">Diet Plan</TabsTrigger>
                      <TabsTrigger value="schedule" className="flex-1">Schedule</TabsTrigger>
                      <TabsTrigger value="order" className="flex-1">Scheduled Order</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="plan" className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">{dietPlanResult.dietPlan?.name}</h3>
                        <p className="text-sm text-muted-foreground">{dietPlanResult.dietPlan?.description}</p>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Health Benefits</h4>
                        <p className="text-sm">{dietPlanResult.dietPlan?.healthBenefits}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Nutritional Summary</h4>
                        <p className="text-sm">{dietPlanResult.dietPlan?.nutritionalSummary}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Tips</h4>
                        <p className="text-sm">{dietPlanResult.dietPlan?.tips}</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="schedule" className="space-y-4">
                      <div className="space-y-4">
                        {dietPlanResult.dietPlan?.schedule?.map((day: any, index: number) => (
                          <Card key={index}>
                            <CardHeader className="py-3">
                              <CardTitle className="text-lg">Day {day.day}</CardTitle>
                            </CardHeader>
                            <CardContent className="py-2">
                              {day.meals.map((meal: any, mealIndex: number) => (
                                <div key={mealIndex} className="mb-3">
                                  <h5 className="font-medium">{meal.mealType}</h5>
                                  <p className="text-sm text-muted-foreground">{meal.notes}</p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="order" className="space-y-4">
                      {dietPlanResult.scheduledOrder ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-sm font-medium">Order ID:</span>
                              <span className="text-sm ml-2">{dietPlanResult.scheduledOrder.id}</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Start Date:</span>
                              <span className="text-sm ml-2">
                                {new Date(dietPlanResult.scheduledOrder.startDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">End Date:</span>
                              <span className="text-sm ml-2">
                                {new Date(dietPlanResult.scheduledOrder.endDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Status:</span>
                              <span className="text-sm ml-2">
                                {dietPlanResult.scheduledOrder.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Special Instructions</h4>
                            <p className="text-sm">{dietPlanResult.scheduledOrder.specialInstructions}</p>
                          </div>
                          
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Health Notes</h4>
                            <p className="text-sm">{dietPlanResult.scheduledOrder.healthNotes}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No scheduled order information available</p>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-destructive font-medium">{dietPlanResult.message}</p>
                    <p className="text-muted-foreground text-sm mt-2">Try with a different customer phone number or check if the customer exists</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Fill out the form and generate a diet plan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
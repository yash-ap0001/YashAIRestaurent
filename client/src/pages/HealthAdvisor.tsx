import { HealthRecommendations } from "@/components/health/HealthRecommendations";

export default function HealthAdvisor() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Health Advisor</h1>
        <p className="text-neutral-500">Get AI-powered health recommendations based on dietary preferences and restrictions</p>
      </div>
      
      <HealthRecommendations />
    </div>
  );
}
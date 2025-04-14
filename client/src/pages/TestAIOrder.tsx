import { AIOrderSimulator } from "@/components/testing/AIOrderSimulator";
import { AICompleteDrivenOrder } from "@/components/testing/AICompleteDrivenOrder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestAIOrder() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">AI Order & WhatsApp Integration Test</h1>
        <p className="text-neutral-400">
          This page lets you test AI-driven ordering in two ways: the standard simulator that lets you control
          each step, or the new fully automated AI system that handles the entire process automatically.
        </p>
      </div>
      
      <Tabs defaultValue="complete-automation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="complete-automation">Fully Automated AI Orders</TabsTrigger>
          <TabsTrigger value="step-by-step">Step-by-Step AI Simulator</TabsTrigger>
        </TabsList>
        
        <TabsContent value="complete-automation" className="mt-4">
          <div className="rounded-lg bg-card p-4 text-card-foreground shadow-md">
            <h2 className="text-lg font-semibold mb-4">Fully Automated AI Order Processing</h2>
            <p className="text-neutral-400 mb-6">
              This new feature allows the AI to handle the entire order process automatically - from
              creation to completion and billing. Simply describe the order in natural language, and
              the AI will take care of everything else without any human intervention.
            </p>
            <AICompleteDrivenOrder />
          </div>
        </TabsContent>
        
        <TabsContent value="step-by-step" className="mt-4">
          <div className="rounded-lg bg-card p-4 text-card-foreground shadow-md">
            <h2 className="text-lg font-semibold mb-4">Step-by-Step AI Order Simulator</h2>
            <p className="text-neutral-400 mb-6">
              This simulator tests the AI-driven process from natural language input to bill generation 
              with WhatsApp integration. After creating an order and bill, you can send the bill with 
              nutritional health tips directly to a WhatsApp number.
            </p>
            <AIOrderSimulator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
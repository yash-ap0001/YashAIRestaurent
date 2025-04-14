import { AIOrderSimulator } from "@/components/testing/AIOrderSimulator";

export default function TestAIOrder() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">AI Order Test Dashboard</h1>
        <p className="text-neutral-400">
          This simulator tests the complete AI-driven order process from natural language input to order creation, 
          kitchen token generation, payment processing, and bill generation.
        </p>
      </div>
      <AIOrderSimulator />
    </div>
  );
}
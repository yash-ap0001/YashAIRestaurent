import { AIOrderSimulator } from "@/components/testing/AIOrderSimulator";

export default function TestAIOrder() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">AI Order & WhatsApp Integration Test</h1>
        <p className="text-neutral-400">
          This simulator tests the complete AI-driven process from natural language input to bill generation 
          with WhatsApp integration. After creating an order and bill, you can send the bill with nutritional 
          health tips directly to a WhatsApp number.
        </p>
      </div>
      <AIOrderSimulator />
    </div>
  );
}
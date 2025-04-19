import { CustomizableOrderBoard } from "@/components/orders/CustomizableOrderBoard";

export default function ColorDemo() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Order Dashboard with Colored Columns</h1>
      <p className="mb-6 text-muted-foreground">
        The dashboard now uses matching colors for both column headers and order cards,
        with professionally chosen color combinations.
      </p>
      
      <CustomizableOrderBoard />
    </div>
  );
}
import { CustomizableOrderBoard } from "@/components/orders/CustomizableOrderBoard";

export default function ColorDemo() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Customizable Order Dashboard</h1>
      <p className="mb-6 text-muted-foreground">
        Click the "Column Colors" button in the top right to customize the colors of each column.
      </p>
      
      <CustomizableOrderBoard />
    </div>
  );
}
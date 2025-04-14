import { OrderForm } from "@/components/orders/OrderForm";

export default function NewOrder() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">New Order</h1>
        <p className="text-neutral-500">
          Create a new order for in-restaurant guests, or enter orders from external platforms 
          like Zomato and Swiggy. Select the order source from the dropdown menu.
        </p>
      </div>
      
      <OrderForm />
    </div>
  );
}

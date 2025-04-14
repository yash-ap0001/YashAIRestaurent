/**
 * Generate a unique order number
 */
export function generateOrderNumber(): string {
  return `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Generate a unique kitchen token number
 */
export function generateTokenNumber(): string {
  return `T${Math.floor(10 + Math.random() * 90)}`;
}

/**
 * Generate a unique bill number
 */
export function generateBillNumber(): string {
  return `BILL-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Formatting functions
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Converts camelCase to Title Case
 */
export function camelCaseToTitleCase(text: string): string {
  const result = text.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Generic error handler function
 */
export function handleError(err: any, context: string): { message: string, details?: any } {
  console.error(`Error in ${context}:`, err);
  
  return {
    message: `An error occurred in ${context}: ${err.message || 'Unknown error'}`,
    details: process.env.NODE_ENV === 'development' ? err : undefined
  };
}
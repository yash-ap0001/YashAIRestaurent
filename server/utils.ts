// Counters for sequential numbering
let orderCounter = 1001; // Start from 1001
let tokenCounter = 1; // Start from 1
let billCounter = 1001; // Start from 1001

/**
 * Generate a sequential order number
 */
export function generateOrderNumber(): string {
  const orderNumber = `ORD-${orderCounter.toString().padStart(4, '0')}`;
  orderCounter++;
  return orderNumber;
}

/**
 * Generate a sequential kitchen token number
 */
export function generateTokenNumber(): string {
  const tokenNumber = `T${tokenCounter.toString().padStart(2, '0')}`;
  tokenCounter++;
  return tokenNumber;
}

/**
 * Generate a sequential bill number
 */
export function generateBillNumber(): string {
  const billNumber = `BILL-${billCounter.toString().padStart(4, '0')}`;
  billCounter++;
  return billNumber;
}

/**
 * Initialize counters based on existing data
 */
export function initializeCounters(
  lastOrderNumber: string | null, 
  lastTokenNumber: string | null, 
  lastBillNumber: string | null
): void {
  if (lastOrderNumber) {
    const orderNum = parseInt(lastOrderNumber.replace('ORD-', ''));
    if (!isNaN(orderNum) && orderNum >= orderCounter) {
      orderCounter = orderNum + 1;
    }
  }
  
  if (lastTokenNumber) {
    const tokenNum = parseInt(lastTokenNumber.replace('T', ''));
    if (!isNaN(tokenNum) && tokenNum >= tokenCounter) {
      tokenCounter = tokenNum + 1;
    }
  }
  
  if (lastBillNumber) {
    const billNum = parseInt(lastBillNumber.replace('BILL-', ''));
    if (!isNaN(billNum) && billNum >= billCounter) {
      billCounter = billNum + 1;
    }
  }
  
  console.log(`Counters initialized: orders=${orderCounter}, tokens=${tokenCounter}, bills=${billCounter}`);
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
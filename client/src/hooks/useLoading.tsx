import { useState, useCallback } from 'react';

// Custom hook for managing loading states
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  
  // Function to wrap async operations with loading state
  const withLoading = useCallback(async (asyncFunction: Promise<any>) => {
    try {
      setIsLoading(true);
      const result = await asyncFunction;
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Simple toggle functions
  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);
  
  return {
    isLoading,
    withLoading,
    startLoading,
    stopLoading
  };
}

export default useLoading;
// Global type definitions

declare global {
  interface Window {
    appSocket: WebSocket | null;
  }
}

export {};
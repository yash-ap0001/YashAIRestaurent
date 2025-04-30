# AI Assistant Components

This directory contains reusable AI assistant components that can be used across different applications.

## Generic AI Assistant

The `GenericAIAssistant.tsx` component is a highly configurable AI assistant that can be used for various applications with minimal customization. It features:

- Voice recognition and speech synthesis
- Custom command processing
- Data fetching and mutation capabilities
- Configurable UI elements
- Conversation history and rich content display

### Example Usage

```tsx
import GenericAIAssistant from '@/components/ai/GenericAIAssistant';
import { BarChart3, Activity, AlertCircle } from 'lucide-react';

// Create a hotel concierge assistant
const HotelConciergeAssistant = () => {
  // Define command patterns for specific actions
  const commandPatterns = [
    {
      pattern: /book a (room|suite) for (\d+) (people|guests)/i,
      action: (matches, speak) => {
        const roomType = matches[1];
        const guests = matches[2];
        // Perform booking action
        speak(`I'll help you book a ${roomType} for ${guests} guests.`);
      }
    },
    {
      pattern: /request (housekeeping|room service|maintenance)/i,
      action: (matches, speak) => {
        const service = matches[1];
        // Create service request
        speak(`I've arranged for ${service} to visit your room shortly.`);
      }
    }
  ];

  return (
    <GenericAIAssistant 
      title="Hotel Concierge"
      description="Your personal assistant during your stay"
      icon={<Activity className="h-6 w-6 text-primary" />}
      buttonText="Ask Concierge"
      dataQueryEndpoint="/api/hotel/guest-services"
      chatEndpoint="/api/ai/concierge"
      voiceEnabled={true}
      welcomeMessage="Welcome to Lakeview Hotel. How may I assist you today?"
      commandPatterns={commandPatterns}
      customCommands={[
        {
          name: "Express Checkout",
          endpoint: "/api/hotel/checkout",
          buttonText: "Express Checkout",
          icon: <AlertCircle className="h-4 w-4" />,
          processFn: (data) => `Your checkout has been processed. Your final bill is $${data.amount}.`
        }
      ]}
    />
  );
};

// Create a restaurant management assistant
const RestaurantManager = () => {
  return (
    <GenericAIAssistant 
      title="Restaurant Manager"
      description="AI-powered insights for your restaurant"
      icon={<BarChart3 className="h-6 w-6 text-primary" />}
      buttonText="Business Insights"
      dataQueryEndpoint="/api/restaurant/analytics"
      chatEndpoint="/api/ai/restaurant-insights"
      maxWidth="3xl"
    />
  );
};
```

### Configuration Options

The GenericAIAssistant component accepts the following configuration options:

| Property | Type | Description |
|----------|------|-------------|
| title | string | Title displayed in the dialog header |
| description | string | Subtitle displayed in the dialog header |
| icon | React.ReactNode | Icon displayed in the button and dialog header |
| buttonText | string | Text displayed on the button that opens the dialog |
| dataQueryEndpoint | string | API endpoint for fetching main data |
| chatEndpoint | string | API endpoint for sending chat requests |
| customCommands | array | Additional command buttons with their respective endpoints |
| voiceEnabled | boolean | Whether voice recognition and speech synthesis are enabled |
| welcomeMessage | string | Initial message displayed when the dialog opens |
| commandPatterns | array | Regular expression patterns for processing commands |
| processQueryResponse | function | Function for processing data query responses |
| processChatResponse | function | Function for processing chat responses |
| maxWidth | string | Maximum width of the dialog |
| buttonVariant | string | Variant of the button that opens the dialog |
| extraDataQueries | array | Additional data queries to fetch when the dialog opens |
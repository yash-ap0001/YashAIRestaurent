/**
 * Admin Operations Training Module
 * 
 * This module contains training data and prompts to enhance the AI assistant's
 * capabilities for handling restaurant administrative operations.
 */

/**
 * Admin operations training data
 * - Contains examples of admin-specific tasks, commands, and relevant data
 */
export const adminOperationsTrainingData = {
  // Financial Management
  financialManagement: [
    {
      task: "Generate daily sales report",
      description: "Create a summary of all sales for the current day, broken down by payment method and item categories.",
      sampleCommand: "Generate today's sales report",
      apiEndpoint: "/api/admin/reports/daily-sales",
      requiredPermission: "admin",
      responseFields: ["totalSales", "itemCategories", "paymentMethods", "topSellingItems", "comparisonToPreviousDay"]
    },
    {
      task: "Analyze profit margins",
      description: "Calculate and display profit margins across different menu categories and items.",
      sampleCommand: "Show me our profit margins for the past month",
      apiEndpoint: "/api/admin/reports/profit-margins",
      requiredPermission: "admin",
      responseFields: ["overallMargin", "categoryMargins", "itemMargins", "suggestions"]
    },
    {
      task: "Review expense breakdown",
      description: "Display a breakdown of all expenses categorized by type (ingredients, labor, utilities, etc.).",
      sampleCommand: "Show expense breakdown for this quarter",
      apiEndpoint: "/api/admin/reports/expenses",
      requiredPermission: "admin",
      responseFields: ["totalExpenses", "categories", "largestExpenses", "comparisonToPrevious"]
    },
    {
      task: "Set budget alerts",
      description: "Configure alerts for when specific expense categories exceed predetermined budgets.",
      sampleCommand: "Set up budget alert for ingredient expenses over $5000 per week",
      apiEndpoint: "/api/admin/settings/budget-alerts",
      requiredPermission: "admin",
      responseFields: ["success", "alertId", "category", "threshold", "frequency"]
    }
  ],
  
  // Staff Management
  staffManagement: [
    {
      task: "View staff schedule",
      description: "Display the current or upcoming staff schedule, showing who is working each shift.",
      sampleCommand: "Show me this week's staff schedule",
      apiEndpoint: "/api/admin/staff/schedule",
      requiredPermission: "admin",
      responseFields: ["currentWeek", "staff", "shifts", "coverage"]
    },
    {
      task: "Manage staff roles",
      description: "Add, modify, or remove staff roles and their associated permissions.",
      sampleCommand: "Update permissions for kitchen manager role",
      apiEndpoint: "/api/admin/staff/roles",
      requiredPermission: "admin",
      responseFields: ["success", "role", "permissions", "affectedUsers"]
    },
    {
      task: "Performance metrics",
      description: "View performance metrics for staff members, such as orders processed or customer feedback.",
      sampleCommand: "Show performance metrics for waitstaff this month",
      apiEndpoint: "/api/admin/staff/performance",
      requiredPermission: "admin",
      responseFields: ["period", "staff", "metrics", "topPerformers", "areasForImprovement"]
    },
    {
      task: "Schedule optimization",
      description: "Generate optimized staff schedules based on historical business volume and staff availability.",
      sampleCommand: "Optimize next week's staff schedule",
      apiEndpoint: "/api/admin/staff/optimize-schedule",
      requiredPermission: "admin",
      responseFields: ["optimizedSchedule", "savingsEstimate", "coverageQuality", "staffHappinessIndex"]
    }
  ],
  
  // Inventory Management
  inventoryManagement: [
    {
      task: "Check inventory levels",
      description: "Display current inventory levels for all ingredients and supplies.",
      sampleCommand: "What's our current inventory status?",
      apiEndpoint: "/api/admin/inventory/levels",
      requiredPermission: "admin",
      responseFields: ["items", "lowStock", "excess", "value"]
    },
    {
      task: "Track ingredient usage",
      description: "Monitor and analyze how quickly different ingredients are being used.",
      sampleCommand: "Show ingredient usage rates for the past two weeks",
      apiEndpoint: "/api/admin/inventory/usage-rates",
      requiredPermission: "admin",
      responseFields: ["period", "ingredients", "usageRates", "anomalies"]
    },
    {
      task: "Generate purchase orders",
      description: "Automatically create purchase orders for items that are low in stock.",
      sampleCommand: "Generate purchase orders for low stock items",
      apiEndpoint: "/api/admin/inventory/purchase-orders",
      requiredPermission: "admin",
      responseFields: ["orders", "totalCost", "vendors", "deliveryEstimates"]
    },
    {
      task: "Manage vendors",
      description: "Add, update, or view vendors who supply ingredients and other items.",
      sampleCommand: "Show all active vendors and their contact information",
      apiEndpoint: "/api/admin/inventory/vendors",
      requiredPermission: "admin",
      responseFields: ["vendors", "products", "performanceMetrics", "contractTerms"]
    }
  ],
  
  // Menu Management
  menuManagement: [
    {
      task: "Update menu items",
      description: "Add, modify, or remove items from the restaurant's menu.",
      sampleCommand: "Update the price of our Butter Chicken to $15.99",
      apiEndpoint: "/api/admin/menu/items",
      requiredPermission: "admin",
      responseFields: ["success", "item", "oldValues", "newValues"]
    },
    {
      task: "Menu performance analysis",
      description: "Analyze how well different menu items are selling and their profitability.",
      sampleCommand: "Show me our top and bottom performing menu items",
      apiEndpoint: "/api/admin/menu/performance",
      requiredPermission: "admin",
      responseFields: ["topItems", "bottomItems", "salesTrends", "profitabilityAnalysis"]
    },
    {
      task: "Special promotions",
      description: "Create and manage special promotions or limited-time menu items.",
      sampleCommand: "Create a weekend special for our new dessert menu",
      apiEndpoint: "/api/admin/menu/promotions",
      requiredPermission: "admin",
      responseFields: ["success", "promotion", "duration", "eligibleItems", "discountType"]
    },
    {
      task: "Menu engineering",
      description: "Get AI-powered suggestions for optimizing your menu layout and pricing.",
      sampleCommand: "Suggest menu engineering improvements based on our data",
      apiEndpoint: "/api/admin/menu/engineering",
      requiredPermission: "admin",
      responseFields: ["suggestions", "pricingOptimizations", "layoutChanges", "categoryRecommendations"]
    }
  ],
  
  // Business Analytics
  businessAnalytics: [
    {
      task: "Customer demographics",
      description: "Analyze and display data about your restaurant's customer demographics.",
      sampleCommand: "Show customer demographics from the past three months",
      apiEndpoint: "/api/admin/analytics/demographics",
      requiredPermission: "admin",
      responseFields: ["ageGroups", "visitFrequency", "spendingPatterns", "preferredItems"]
    },
    {
      task: "Peak hour analysis",
      description: "Identify and analyze peak business hours to optimize staffing and preparation.",
      sampleCommand: "Analyze our peak hours for each day of the week",
      apiEndpoint: "/api/admin/analytics/peak-hours",
      requiredPermission: "admin",
      responseFields: ["weekdayPatterns", "hourlyBreakdown", "staffingRecommendations", "preparationTiming"]
    },
    {
      task: "Sales forecasting",
      description: "Generate sales forecasts based on historical data and trends.",
      sampleCommand: "Forecast sales for the next month",
      apiEndpoint: "/api/admin/analytics/forecasts",
      requiredPermission: "admin",
      responseFields: ["dailyForecasts", "weeklyTotals", "confidenceIntervals", "influencingFactors"]
    },
    {
      task: "Competitive analysis",
      description: "Compare your restaurant's performance to competitors or industry benchmarks.",
      sampleCommand: "How do we compare to similar restaurants in our area?",
      apiEndpoint: "/api/admin/analytics/competitive",
      requiredPermission: "admin",
      responseFields: ["metricComparisons", "strengthAreas", "improvementAreas", "industryTrends"]
    }
  ],
  
  // System Configuration
  systemConfiguration: [
    {
      task: "User management",
      description: "Manage user accounts and access permissions for the restaurant system.",
      sampleCommand: "Create a new user account for our new chef",
      apiEndpoint: "/api/admin/system/users",
      requiredPermission: "admin",
      responseFields: ["success", "user", "permissions", "accessLevel"]
    },
    {
      task: "Configure notifications",
      description: "Set up and manage system notifications for various events.",
      sampleCommand: "Set up email notifications for large orders",
      apiEndpoint: "/api/admin/system/notifications",
      requiredPermission: "admin",
      responseFields: ["success", "notificationType", "triggers", "recipients"]
    },
    {
      task: "Integration management",
      description: "Manage integrations with third-party services like delivery platforms.",
      sampleCommand: "Check status of our Zomato integration",
      apiEndpoint: "/api/admin/system/integrations",
      requiredPermission: "admin",
      responseFields: ["integrations", "status", "configurations", "syncHistory"]
    },
    {
      task: "System backup",
      description: "Create or restore backups of the restaurant management system.",
      sampleCommand: "Create a full system backup",
      apiEndpoint: "/api/admin/system/backup",
      requiredPermission: "admin",
      responseFields: ["success", "backupId", "timestamp", "size", "contents"]
    }
  ]
};

/**
 * Admin-focused AI assistant training prompt
 * - Used to enhance the AI's understanding of restaurant admin operations
 */
export const adminAssistantTrainingPrompt = `
You are an expert AI assistant for restaurant administration. Your role is to help restaurant owners and managers efficiently run their business by providing insights, automating tasks, and offering strategic recommendations.

Here are the main areas of restaurant administration you should be knowledgeable about:

1. Financial Management
   - Sales reporting and analysis
   - Profit margin calculations
   - Expense tracking and categorization
   - Budget planning and monitoring
   - Cash flow management
   - Tax filing assistance

2. Staff Management
   - Scheduling and time tracking
   - Performance monitoring
   - Training coordination
   - Payroll management
   - Staff allocation optimization
   - Compliance with labor laws

3. Inventory Management
   - Stock level monitoring
   - Ingredient usage tracking
   - Automated purchasing
   - Vendor relationship management
   - Waste reduction strategies
   - Cost optimization

4. Menu Management
   - Menu item performance analysis
   - Pricing optimization
   - Special promotion creation
   - Seasonal menu planning
   - Dietary restriction accommodation
   - Menu engineering principles

5. Business Analytics
   - Customer demographics analysis
   - Peak hour identification
   - Sales forecasting
   - Competitive analysis
   - Trend identification
   - Growth opportunity spotting

6. System Configuration
   - User account management
   - Permission settings
   - Integration with third-party services
   - System backup and recovery
   - Notification preferences
   - Customization options

When assisting with restaurant administration tasks:

1. Always prioritize data-driven insights over general advice
2. Provide specific, actionable recommendations whenever possible
3. Be mindful of compliance requirements in the food service industry
4. Consider both short-term operational needs and long-term strategic goals
5. Focus on efficiency improvements that save time and reduce costs
6. Highlight opportunities for increasing customer satisfaction and retention

Your goal is to help restaurant administrators make informed decisions, automate routine tasks, and implement strategies that boost profitability while maintaining quality and customer satisfaction.
`;

interface TrainingExample {
  context: string;
  query: string;
  response: string;
  apiEndpoint: string;
  requiredPermission: string;
}

/**
 * Format the training data into a format suitable for AI model training
 */
export function formatTrainingData() {
  const trainingExamples: TrainingExample[] = [];
  
  // Process each category of operations
  Object.entries(adminOperationsTrainingData).forEach(([category, tasks]) => {
    tasks.forEach(task => {
      // Create example conversations
      trainingExamples.push({
        context: `Restaurant administrator wants to ${task.description}`,
        query: task.sampleCommand,
        response: `I can help you ${task.task.toLowerCase()}. This will provide you with information about ${task.responseFields.join(', ')}. Let me retrieve that for you.`,
        apiEndpoint: task.apiEndpoint,
        requiredPermission: task.requiredPermission
      });
    });
  });
  
  return {
    systemPrompt: adminAssistantTrainingPrompt,
    examples: trainingExamples
  };
}

/**
 * Get admin operations training data for a specific category
 * @param category The category of admin operations to retrieve
 */
export function getAdminOperationsTraining(category?: string) {
  type AdminOperationsKey = keyof typeof adminOperationsTrainingData;
  
  if (category && Object.prototype.hasOwnProperty.call(adminOperationsTrainingData, category)) {
    const categoryKey = category as AdminOperationsKey;
    return {
      category,
      tasks: adminOperationsTrainingData[categoryKey],
      systemPrompt: adminAssistantTrainingPrompt
    };
  }
  
  // Return all categories if no specific one is requested
  return {
    categories: Object.keys(adminOperationsTrainingData),
    systemPrompt: adminAssistantTrainingPrompt,
    allTasks: Object.values(adminOperationsTrainingData).flat()
  };
}
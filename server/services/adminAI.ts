import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Admin AI system prompt
const ADMIN_SYSTEM_PROMPT = `
You are an executive-level Business Advisor AI for restaurant owners and administrators.
Your purpose is to provide high-level strategic insights, financial analysis, and business
intelligence to support executive decision-making.

CAPABILITIES:
- Comprehensive financial analysis including P&L, margin analysis, and cost structure optimization
- Strategic business planning and growth opportunity identification
- Competitive market analysis and positioning strategies
- Staff performance metrics and optimization at management level
- Customer analytics and loyalty program ROI assessment
- Marketing performance analysis and budget optimization

APPROACH:
- Focus on executive-level concerns rather than day-to-day operations
- Prioritize profitability, growth, and strategic positioning in all analyses
- Provide data-driven insights with clear, actionable recommendations
- Consider both short-term performance and long-term strategic implications
- Present information visually when possible using charts and key metrics

ACCESS TO:
- Complete financial data including P&L statements, cash flow, and balance sheets
- Staff performance metrics at department and individual level
- Customer data including demographics, spending patterns, and loyalty metrics
- Inventory and supply chain analytics including vendor performance
- Marketing performance data across all channels
- Competitive intelligence and market trends

CONSTRAINTS:
- Maintain strict confidentiality of sensitive business information
- Acknowledge data limitations when making recommendations
- Do not make absolute predictions about business outcomes
- Focus on evidence-based insights rather than generalized advice

When responding to queries, analyze multiple perspectives and provide strategic options
with their associated benefits, costs, risks, and implementation considerations.
`;

/**
 * Fetches admin dashboard data for AI analysis
 */
export async function fetchAdminDashboardData() {
  try {
    // Get financial metrics
    const financialMetrics = await getFinancialMetrics();
    
    // Get staff performance data
    const staffPerformance = await getStaffPerformanceData();
    
    // Get inventory analytics
    const inventoryAnalytics = await getInventoryAnalytics();
    
    // Get customer analytics
    const customerAnalytics = await getCustomerAnalytics();
    
    // Get marketing performance data
    const marketingPerformance = await getMarketingPerformance();
    
    return {
      financialMetrics,
      staffPerformance,
      inventoryAnalytics,
      customerAnalytics,
      marketingPerformance
    };
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    throw error;
  }
}

/**
 * Get financial metrics from the database
 */
async function getFinancialMetrics() {
  // For now simulate financials with placeholder calculations
  // In a real implementation, this would pull from DB
  const orders = await db.query('SELECT * FROM orders');
  const menuItems = await db.query('SELECT * FROM menu_items');
  
  // Calculate revenue
  const revenue = orders.reduce((total, order) => total + order.total, 0);
  
  // Estimate costs (in a real app would come from actual cost data)
  const foodCost = {
    amount: revenue * 0.32, // 32% food cost
    percentage: 32
  };
  
  const laborCost = {
    amount: revenue * 0.28, // 28% labor cost
    percentage: 28
  };
  
  const otherCosts = {
    amount: revenue * 0.25, // 25% other costs
    percentage: 25
  };
  
  const costs = {
    total: foodCost.amount + laborCost.amount + otherCosts.amount,
    food: foodCost.amount,
    labor: laborCost.amount,
    other: otherCosts.amount,
    fixedPercentage: 40 // 40% of costs are fixed
  };
  
  // Calculate profit
  const profit = revenue - costs.total;
  const profitMargin = (profit / revenue) * 100;
  
  // Create trend data (in a real app would be historical data)
  const revenueTrend = [
    { date: '2025-03-01', value: revenue * 0.85 },
    { date: '2025-03-15', value: revenue * 0.92 },
    { date: '2025-04-01', value: revenue * 0.98 },
    { date: '2025-04-15', value: revenue }
  ];
  
  const profitTrend = [
    { date: '2025-03-01', value: profit * 0.75 },
    { date: '2025-03-15', value: profit * 0.85 },
    { date: '2025-04-01', value: profit * 0.95 },
    { date: '2025-04-15', value: profit }
  ];
  
  return {
    revenue,
    costs,
    profit,
    profitMargin,
    foodCost,
    laborCost,
    otherCosts,
    revenueTrend,
    profitTrend,
    ebitda: profit + (costs.total * 0.05), // Add back depreciation
    totalSeats: 80, // Example value
    topRevenueCategories: [
      { name: 'Main Course', percentage: 45 },
      { name: 'Beverages', percentage: 25 },
      { name: 'Appetizers', percentage: 18 },
      { name: 'Desserts', percentage: 12 }
    ]
  };
}

/**
 * Get staff performance data
 */
async function getStaffPerformanceData() {
  // In a real implementation, this would pull from staff DB
  return {
    departments: [
      {
        name: 'Kitchen',
        headcount: 8,
        productivity: 87, // percentage
        turnover: 15, // percentage annually
        costPerHour: 350 // average
      },
      {
        name: 'Service',
        headcount: 12,
        productivity: 92,
        turnover: 22,
        costPerHour: 250
      },
      {
        name: 'Management',
        headcount: 3,
        productivity: 95,
        turnover: 5,
        costPerHour: 600
      }
    ],
    topPerformers: ['Priya S.', 'Ahmed K.', 'Neha R.'],
    trainingNeeds: ['Inventory management', 'Customer service'],
    overallProductivity: 91,
    overallTurnover: 18
  };
}

/**
 * Get inventory analytics
 */
async function getInventoryAnalytics() {
  // In a real implementation, this would pull from inventory DB
  return {
    categories: [
      { 
        name: 'Perishables', 
        value: 45000, 
        turnoverRate: 7, // days
        wastage: 3.2 // percentage
      },
      { 
        name: 'Dry Goods', 
        value: 85000, 
        turnoverRate: 30,
        wastage: 0.8
      },
      { 
        name: 'Beverages', 
        value: 120000, 
        turnoverRate: 25,
        wastage: 1.1
      }
    ],
    totalValue: 250000,
    overallTurnoverRate: 18, // days
    overallWastage: 1.8, // percentage
    topWastageItems: ['Fresh produce', 'Prepared sauces', 'Bread'],
    stockoutFrequency: 0.5, // percentage of items
    overstock: 1.2, // percentage of items
    vendorPerformance: [
      { name: 'Supplier A', reliability: 98, priceTrend: 'stable' },
      { name: 'Supplier B', reliability: 92, priceTrend: 'increasing' },
      { name: 'Supplier C', reliability: 97, priceTrend: 'decreasing' }
    ]
  };
}

/**
 * Get customer analytics
 */
async function getCustomerAnalytics() {
  // In a real implementation, this would pull from customer DB
  return {
    segments: [
      { 
        name: 'Regular customers', 
        percentage: 38, 
        averageSpend: 1200,
        visitFrequency: 3.2 // times per month
      },
      { 
        name: 'Occasional diners', 
        percentage: 42, 
        averageSpend: 950,
        visitFrequency: 1.1
      },
      { 
        name: 'First-time visitors', 
        percentage: 20, 
        averageSpend: 820,
        visitFrequency: 1
      }
    ],
    demographics: {
      ageGroups: [
        { range: '18-24', percentage: 15 },
        { range: '25-34', percentage: 32 },
        { range: '35-44', percentage: 28 },
        { range: '45-54', percentage: 18 },
        { range: '55+', percentage: 7 }
      ],
      genderSplit: { male: 52, female: 48 },
      incomeLevel: 'Middle to upper-middle'
    },
    satisfaction: {
      overall: 4.2, // out of 5
      food: 4.5,
      service: 4.1,
      ambience: 4.3,
      value: 3.9
    },
    acquisitionChannels: [
      { name: 'Word of mouth', percentage: 45 },
      { name: 'Social media', percentage: 22 },
      { name: 'Search engines', percentage: 18 },
      { name: 'Traditional advertising', percentage: 10 },
      { name: 'Other', percentage: 5 }
    ],
    retentionRate: 68, // percentage
    churnRate: 32 // percentage
  };
}

/**
 * Get marketing performance data
 */
async function getMarketingPerformance() {
  // In a real implementation, this would pull from marketing DB
  return {
    channels: [
      { 
        name: 'Social media', 
        spend: 32000, 
        roi: 3.2, // multiplier
        conversion: 2.8 // percentage
      },
      { 
        name: 'Email campaigns', 
        spend: 15000, 
        roi: 4.5,
        conversion: 3.2
      },
      { 
        name: 'Local partnerships', 
        spend: 25000, 
        roi: 2.8,
        conversion: 1.9
      },
      { 
        name: 'Google ads', 
        spend: 18000, 
        roi: 3.7,
        conversion: 2.2
      }
    ],
    totalSpend: 90000,
    overallRoi: 3.5,
    mostEffectiveChannel: 'Email campaigns',
    leastEffectiveChannel: 'Local partnerships',
    promotions: [
      { name: 'Happy Hour', redemptionRate: 28, profitImpact: 1.8 },
      { name: 'Lunch Specials', redemptionRate: 35, profitImpact: 1.5 },
      { name: 'Weekend Brunch', redemptionRate: 42, profitImpact: 2.1 }
    ],
    competitivePosition: {
      marketShare: 12, // percentage
      pricePositioning: 'Premium',
      brandPerception: 'High quality, modern'
    },
    trends: [
      { name: 'Online ordering', relevance: 'High', adoption: 'Medium' },
      { name: 'Sustainability', relevance: 'Medium', adoption: 'Low' },
      { name: 'Health-conscious options', relevance: 'High', adoption: 'Medium' }
    ]
  };
}

/**
 * Extracts data-driven insights from restaurant data
 */
export async function generateAdminInsights(query: string, adminData: any) {
  try {
    // Format the context with real restaurant data
    const dataContext = JSON.stringify(adminData, null, 2);
    
    // Generate response from AI
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1500,
      system: ADMIN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is current data about my restaurant business:
${dataContext}

My question is: ${query}

Based on the provided data, give me an executive-level analysis that focuses on actionable insights. 
Include relevant metrics, identify trends, and suggest specific strategies appropriate for my business.
Format your response with clear sections and prioritize the most impactful actions I should take.`
        }
      ]
    });

    return {
      response: response.content[0].text,
      chartData: generateChartData(query, adminData)
    };
  } catch (error) {
    console.error('Error generating admin insights:', error);
    throw new Error('Failed to generate business insights. Please try again later.');
  }
}

/**
 * Generate chart data based on the query and admin data
 */
function generateChartData(query: string, adminData: any) {
  const queryLower = query.toLowerCase();
  
  // Financial charts
  if (queryLower.includes('revenue') || queryLower.includes('sales') || queryLower.includes('financial')) {
    return {
      type: 'bar',
      data: {
        labels: adminData.financialMetrics.topRevenueCategories.map((cat: any) => cat.name),
        datasets: [{
          label: 'Revenue by Category (%)',
          data: adminData.financialMetrics.topRevenueCategories.map((cat: any) => cat.percentage)
        }]
      }
    };
  }
  
  // Profit analysis
  if (queryLower.includes('profit') || queryLower.includes('margin')) {
    return {
      type: 'pie',
      data: {
        labels: ['Food Cost', 'Labor Cost', 'Other Costs', 'Profit'],
        datasets: [{
          data: [
            adminData.financialMetrics.foodCost.percentage,
            adminData.financialMetrics.laborCost.percentage,
            adminData.financialMetrics.otherCosts.percentage,
            adminData.financialMetrics.profitMargin
          ]
        }]
      }
    };
  }
  
  // Customer analysis
  if (queryLower.includes('customer') || queryLower.includes('clients')) {
    return {
      type: 'line',
      data: {
        labels: adminData.customerAnalytics.segments.map((seg: any) => seg.name),
        datasets: [{
          label: 'Average Spend (₹)',
          data: adminData.customerAnalytics.segments.map((seg: any) => seg.averageSpend)
        }]
      }
    };
  }
  
  // Staff analysis
  if (queryLower.includes('staff') || queryLower.includes('employee')) {
    return {
      type: 'bar',
      data: {
        labels: adminData.staffPerformance.departments.map((dept: any) => dept.name),
        datasets: [{
          label: 'Productivity (%)',
          data: adminData.staffPerformance.departments.map((dept: any) => dept.productivity)
        }]
      }
    };
  }
  
  // Marketing analysis
  if (queryLower.includes('marketing') || queryLower.includes('promotion')) {
    return {
      type: 'bar',
      data: {
        labels: adminData.marketingPerformance.channels.map((ch: any) => ch.name),
        datasets: [{
          label: 'ROI Multiplier',
          data: adminData.marketingPerformance.channels.map((ch: any) => ch.roi)
        }]
      }
    };
  }
  
  // Default: Business overview
  return {
    type: 'doughnut',
    data: {
      labels: ['Food Cost', 'Labor Cost', 'Other Costs', 'Profit'],
      datasets: [{
        data: [
          adminData.financialMetrics.foodCost.percentage,
          adminData.financialMetrics.laborCost.percentage,
          adminData.financialMetrics.otherCosts.percentage,
          adminData.financialMetrics.profitMargin
        ]
      }]
    }
  };
}

/**
 * Analyze market position and competitive landscape
 */
export function analyzeCompetitivePosition(adminData: any) {
  const { marketingPerformance } = adminData;
  
  return {
    positioning: marketingPerformance.competitivePosition.pricePositioning.toLowerCase(),
    marketShare: marketingPerformance.competitivePosition.marketShare,
    strengths: ['Quality cuisine', 'Service experience', 'Location'],
    gaps: ['Online ordering experience', 'Loyalty program', 'Marketing presence'],
    pricingPosition: marketingPerformance.competitivePosition.pricePositioning.toLowerCase(),
    perceptionComparison: 'above'
  };
}

/**
 * Calculate business health score
 */
export function assessBusinessHealth(adminData: any) {
  // Calculate financial health score (0-100)
  const financialScore = 
    (adminData.financialMetrics.profitMargin > 15 ? 30 : 
     adminData.financialMetrics.profitMargin > 10 ? 20 : 
     adminData.financialMetrics.profitMargin > 5 ? 10 : 0) +
    (adminData.financialMetrics.revenueTrend[3].value > 
     adminData.financialMetrics.revenueTrend[0].value ? 20 : 0) +
    (adminData.inventoryAnalytics.overallWastage < 2 ? 20 : 
     adminData.inventoryAnalytics.overallWastage < 3 ? 10 : 0);
     
  // Calculate operational score (0-100)
  const operationalScore = 
    (adminData.staffPerformance.overallProductivity > 90 ? 30 : 
     adminData.staffPerformance.overallProductivity > 80 ? 20 : 
     adminData.staffPerformance.overallProductivity > 70 ? 10 : 0) +
    (adminData.staffPerformance.overallTurnover < 15 ? 20 : 
     adminData.staffPerformance.overallTurnover < 25 ? 10 : 0) +
    (adminData.inventoryAnalytics.stockoutFrequency < 1 ? 20 : 
     adminData.inventoryAnalytics.stockoutFrequency < 2 ? 10 : 0);
     
  // Calculate customer score (0-100)
  const customerScore = 
    (adminData.customerAnalytics.satisfaction.overall > 4.5 ? 30 : 
     adminData.customerAnalytics.satisfaction.overall > 4.0 ? 20 : 
     adminData.customerAnalytics.satisfaction.overall > 3.5 ? 10 : 0) +
    (adminData.customerAnalytics.retentionRate > 70 ? 30 : 
     adminData.customerAnalytics.retentionRate > 60 ? 20 : 
     adminData.customerAnalytics.retentionRate > 50 ? 10 : 0) +
    (adminData.customerAnalytics.segments[0].percentage > 40 ? 20 : 
     adminData.customerAnalytics.segments[0].percentage > 30 ? 10 : 0);
     
  // Calculate staff score (0-100)
  const staffScore = 
    (adminData.staffPerformance.overallProductivity > 90 ? 30 : 
     adminData.staffPerformance.overallProductivity > 80 ? 20 : 10) +
    (adminData.staffPerformance.overallTurnover < 15 ? 30 : 
     adminData.staffPerformance.overallTurnover < 25 ? 20 : 10) +
    (adminData.staffPerformance.departments[0].productivity > 85 ? 20 : 
     adminData.staffPerformance.departments[0].productivity > 75 ? 10 : 0);
     
  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (financialScore * 0.35) +
    (operationalScore * 0.25) +
    (customerScore * 0.25) +
    (staffScore * 0.15)
  );
  
  return {
    overallScore,
    financialScore,
    operationalScore,
    customerScore,
    staffScore,
    financialAssessment: financialScore > 70 ? 'Strong' : financialScore > 50 ? 'Adequate' : 'Needs improvement',
    operationalAssessment: operationalScore > 70 ? 'Efficient' : operationalScore > 50 ? 'Satisfactory' : 'Needs optimization',
    customerAssessment: customerScore > 70 ? 'Excellent' : customerScore > 50 ? 'Good' : 'Needs attention',
    staffAssessment: staffScore > 70 ? 'High performing' : staffScore > 50 ? 'Adequate' : 'Needs development'
  };
}

/**
 * Generate growth opportunity analysis
 */
export function analyzeGrowthOpportunities(adminData: any) {
  // Calculate potential impact of menu optimization
  const menuOptimizationImpact = 
    adminData.customerAnalytics.satisfaction.food < 4.3 ? 5 : 
    adminData.customerAnalytics.satisfaction.food < 4.5 ? 3 : 1;
    
  // Calculate potential impact of marketing efficiency
  const marketingEfficiencyImpact = 
    adminData.marketingPerformance.overallRoi < 3 ? 4.5 : 
    adminData.marketingPerformance.overallRoi < 4 ? 2.5 : 1;
    
  // Calculate potential impact of operational streamlining
  const operationalImpact = 
    adminData.staffPerformance.overallProductivity < 85 ? 4 : 
    adminData.staffPerformance.overallProductivity < 90 ? 2.5 : 1;
    
  // Calculate potential impact of expansion
  const expansionImpact = 
    adminData.financialMetrics.profitMargin > 15 && 
    adminData.customerAnalytics.satisfaction.overall > 4.3 ? 6 : 3;
  
  return [
    { 
      area: "Menu Optimization", 
      impact: menuOptimizationImpact,
      timeframe: "1-3 months",
      investmentRequired: "Low" 
    },
    { 
      area: "Marketing Efficiency", 
      impact: marketingEfficiencyImpact,
      timeframe: "2-4 months",
      investmentRequired: "Medium" 
    },
    { 
      area: "Operational Streamlining", 
      impact: operationalImpact,
      timeframe: "3-6 months",
      investmentRequired: "Medium" 
    },
    { 
      area: "Expansion/New Location", 
      impact: expansionImpact,
      timeframe: "12-18 months",
      investmentRequired: "High" 
    }
  ].sort((a, b) => b.impact - a.impact);
}
// src/server/api/routers/stock.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
// Yahoo Finance will be imported dynamically to avoid ESM/CJS issues

// Define stock data schema
export const stockDataSchema = z.object({
  prices: z.array(z.number()),
  dates: z.array(z.string()),
  companyName: z.string(),
  symbol: z.string(),
  highest: z.number().optional(),
  lowest: z.number().optional(),
  ohlc: z.object({
    open: z.array(z.number()),
    high: z.array(z.number()),
    low: z.array(z.number()),
    close: z.array(z.number()),
    dates: z.array(z.string()),
  }).optional(),
  volume: z.array(z.number()).optional(),
});

// Define stock quote schema for current price data
export const stockQuoteSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  currentPrice: z.number(),
  change: z.number(),
  percentChange: z.number(),
  high: z.number(),
  low: z.number(),
  open: z.number(),
  previousClose: z.number(),
  isMock: z.boolean().default(false),
});

// Type definition from schema
export type StockData = z.infer<typeof stockDataSchema>;
export type StockQuote = z.infer<typeof stockQuoteSchema>;

// Define top 100 US stocks for dropdown and search
export const top100USStocks = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B" },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "LLY", name: "Eli Lilly and Company" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "UNH", name: "UnitedHealth Group Incorporated" },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "MA", name: "Mastercard Incorporated" },
  { symbol: "PG", name: "Procter & Gamble Company" },
  { symbol: "COST", name: "Costco Wholesale Corporation" },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "MRK", name: "Merck & Co. Inc." },
  { symbol: "ABBV", name: "AbbVie Inc." },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "BAC", name: "Bank of America Corporation" },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "KO", name: "Coca-Cola Company" },
  { symbol: "CSCO", name: "Cisco Systems Inc." },
  { symbol: "TMO", name: "Thermo Fisher Scientific Inc." },
  { symbol: "MCD", name: "McDonald's Corporation" },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "PFE", name: "Pfizer Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices Inc." },
  { symbol: "ABT", name: "Abbott Laboratories" },
  { symbol: "CMCSA", name: "Comcast Corporation" },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "ACN", name: "Accenture plc" },
  { symbol: "TMUS", name: "T-Mobile US Inc." },
  { symbol: "DIS", name: "Walt Disney Company" },
  { symbol: "TXN", name: "Texas Instruments Incorporated" },
  { symbol: "WFC", name: "Wells Fargo & Company" },
  { symbol: "VZ", name: "Verizon Communications Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "NKE", name: "NIKE Inc." },
  { symbol: "INTU", name: "Intuit Inc." },
  { symbol: "QCOM", name: "QUALCOMM Incorporated" },
  { symbol: "PM", name: "Philip Morris International Inc." },
  { symbol: "UPS", name: "United Parcel Service Inc." },
  { symbol: "IBM", name: "International Business Machines Corporation" },
  { symbol: "AMAT", name: "Applied Materials Inc." },
  { symbol: "SPGI", name: "S&P Global Inc." },
  { symbol: "DE", name: "Deere & Company" },
  { symbol: "CAT", name: "Caterpillar Inc." },
  { symbol: "GE", name: "General Electric Company" },
  { symbol: "BKNG", name: "Booking Holdings Inc." },
  { symbol: "NOW", name: "ServiceNow Inc." },
  { symbol: "RTX", name: "Raytheon Technologies Corporation" },
  { symbol: "MS", name: "Morgan Stanley" },
  { symbol: "AXP", name: "American Express Company" },
  { symbol: "HON", name: "Honeywell International Inc." },
  { symbol: "SBUX", name: "Starbucks Corporation" },
  { symbol: "LOW", name: "Lowe's Companies Inc." },
  { symbol: "GS", name: "Goldman Sachs Group Inc." },
  { symbol: "T", name: "AT&T Inc." },
  { symbol: "BLK", name: "BlackRock Inc." },
  { symbol: "PLD", name: "Prologis Inc." },
  { symbol: "MDLZ", name: "Mondelez International Inc." },
  { symbol: "GILD", name: "Gilead Sciences Inc." },
  { symbol: "ADI", name: "Analog Devices Inc." },
  { symbol: "SCHW", name: "Charles Schwab Corporation" },
  { symbol: "LIN", name: "Linde plc" },
  { symbol: "AMT", name: "American Tower Corporation" },
  { symbol: "C", name: "Citigroup Inc." },
  { symbol: "ISRG", name: "Intuitive Surgical Inc." },
  { symbol: "TJX", name: "TJX Companies Inc." },
  { symbol: "SYK", name: "Stryker Corporation" },
  { symbol: "ADP", name: "Automatic Data Processing Inc." },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "REGN", name: "Regeneron Pharmaceuticals Inc." },
  { symbol: "VRTX", name: "Vertex Pharmaceuticals Incorporated" },
  { symbol: "MMM", name: "3M Company" },
  { symbol: "ZTS", name: "Zoetis Inc." },
  { symbol: "PANW", name: "Palo Alto Networks Inc." },
  { symbol: "ELV", name: "Elevance Health Inc." },
  { symbol: "MO", name: "Altria Group Inc." },
  { symbol: "LRCX", name: "Lam Research Corporation" },
  { symbol: "MRNA", name: "Moderna Inc." },
  { symbol: "CVS", name: "CVS Health Corporation" },
  { symbol: "CI", name: "The Cigna Group" },
  { symbol: "PGR", name: "Progressive Corporation" },
  { symbol: "SO", name: "Southern Company" },
  { symbol: "AMGN", name: "Amgen Inc." },
  { symbol: "COP", name: "ConocoPhillips" },
  { symbol: "KLAC", name: "KLA Corporation" },
  { symbol: "CHTR", name: "Charter Communications Inc." },
  { symbol: "UNP", name: "Union Pacific Corporation" },
  { symbol: "DUK", name: "Duke Energy Corporation" },
];

/**
 * Validates and prepares a stock symbol for use with the Yahoo Finance API
 * 
 * @param symbol The stock symbol to validate
 * @returns The valid stock symbol or throws an error if invalid
 */
function validateStockSymbol(symbol: string): string {
  // Check for empty symbol
  if (!symbol || symbol.trim() === '') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Stock symbol is required'
    });
  }
  
  // Clean and format the symbol
  const cleanedSymbol = symbol.trim().toUpperCase();
  
  // Check if it's in our predefined list (preferred)
  const exists = top100USStocks.some(stock => stock.symbol === cleanedSymbol);
  
  // If not in our list, do a basic format check
  if (!exists) {
    // Basic validation: symbol should be 1-5 characters, allowing dots for class shares
    const validFormat = /^[A-Z0-9\.]{1,5}$/.test(cleanedSymbol);
    if (!validFormat) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid stock symbol format: ${symbol}`
      });
    }
    console.warn(`Symbol ${cleanedSymbol} not in predefined list, but accepted for lookup`);
  }
  
  return cleanedSymbol;
}

/**
 * Helper function to fetch historical data from Yahoo Finance
 */
async function fetchYahooHistoricalData(symbol: string, daysAgo: number): Promise<any> {
  try {
    console.log(`Fetching Yahoo Finance historical data for ${symbol} over ${daysAgo} days`);
    
    // Import the library dynamically
    const yahooFinance = await import('yahoo-finance2');
    
    // Format symbol for Yahoo Finance (handle special cases like BRK.B)
    const formattedSymbol = symbol.includes('.') ? symbol.replace('.', '-') : symbol;
    
    // Convert days to period parameter
    let period = "1mo";
    if (daysAgo <= 7) {
      period = "7d";
    } else if (daysAgo <= 30) {
      period = "1mo";
    } else if (daysAgo <= 90) {
      period = "3mo";
    } else {
      period = "6mo";
    }
    
    const queryOptions = {
      period1: new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)),
      period2: new Date(),
      interval: "1d" as "1d"
    };
    
    const result = await yahooFinance.default.historical(formattedSymbol, queryOptions);
    
    if (!result || result.length === 0) {
      throw new Error(`No data returned from Yahoo Finance for ${symbol}`);
    }
    
    return result;
  } catch (error) {
    console.error("Yahoo Finance historical data request failed:", error);
    throw error;
  }
}

/**
 * Helper function to fetch current quote data from Yahoo Finance
 */
async function fetchYahooQuoteData(symbol: string): Promise<any> {
  try {
    console.log(`Fetching Yahoo Finance quote data for ${symbol}`);
    
    // Import the library dynamically
    const yahooFinance = await import('yahoo-finance2');
    
    // Format symbol for Yahoo Finance (handle special cases like BRK.B)
    const formattedSymbol = symbol.includes('.') ? symbol.replace('.', '-') : symbol;
    
    const result = await yahooFinance.default.quote(formattedSymbol);
    
    if (!result) {
      throw new Error(`No quote data returned from Yahoo Finance for ${symbol}`);
    }
    
    return result;
  } catch (error) {
    console.error("Yahoo Finance quote request failed:", error);
    throw error;
  }
}

/**
 * Format Yahoo Finance historical data to match our application's format
 */
function formatYahooHistoricalData(data: any[], symbol: string, companyName: string): StockData {
  // Extract and format data
  const prices = data.map(item => item.close);
  const dates = data.map(item => {
    const date = new Date(item.date);
    return `${date.getMonth()+1}/${date.getDate()}`;
  });
  
  // Calculate highest and lowest prices
  const highest = Math.max(...data.map(item => item.high));
  const lowest = Math.min(...data.map(item => item.low));
  
  return {
    prices,
    dates,
    companyName,
    symbol,
    highest,
    lowest,
    ohlc: {
      open: data.map(item => item.open),
      high: data.map(item => item.high),
      low: data.map(item => item.low),
      close: prices,
      dates
    },
    volume: data.map(item => item.volume)
  };
}

/**
 * Generate mock stock data for testing or when Yahoo Finance API is unavailable
 * 
 * @param symbol - Stock symbol
 * @param companyName - Company name
 * @param daysAgo - Number of days to generate
 * @returns Formatted mock stock data
 */
function generateMockStockData(
  symbol: string, 
  companyName: string, 
  daysAgo: number
): StockData {
  const dates: string[] = [];
  const today = new Date();
  
  // Generate dates from past to present
  for (let i = daysAgo; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends when market is closed
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // Skip Saturday (6) and Sunday (0)
    }
    
    // Format date as "MM/DD"
    dates.push(`${date.getMonth()+1}/${date.getDate()}`);
  }
  
  // Set base price according to the symbol to maintain consistency
  // Hash the symbol to get a consistent starting price
  let basePrice = 100;
  for (let i = 0; i < symbol.length; i++) {
    basePrice += symbol.charCodeAt(i);
  }
  basePrice = (basePrice % 200) + 100; // Between 100 and 300
  
  // Generate prices with random walk algorithm
  const prices: number[] = [];
  let currentPrice = basePrice;
  
  for (let i = 0; i < dates.length; i++) {
    prices.push(parseFloat(currentPrice.toFixed(2)));
    
    // Random daily change (-2% to +2%)
    const change = currentPrice * (Math.random() * 0.04 - 0.02);
    currentPrice = Math.max(currentPrice + change, currentPrice * 0.7);
  }
  
  // Generate OHLC data
  const open = prices.map(p => p * (1 + (Math.random() * 0.02 - 0.01)));
  const high = prices.map((p, i) => Math.max(p, open[i] || p) * (1 + Math.random() * 0.01));
  const low = prices.map((p, i) => Math.min(p, open[i] || p) * (1 - Math.random() * 0.01));
  const volume = prices.map(() => Math.floor(Math.random() * 10000000));
  
  // Calculate highest and lowest prices
  const highest = Math.max(...high);
  const lowest = Math.min(...low);
  
  return {
    prices,
    dates,
    companyName,
    symbol,
    highest: highest,
    lowest: lowest,
    ohlc: {
      open,
      high,
      low,
      close: prices,
      dates
    },
    volume
  };
}

/**
 * Generate a realistic mock stock quote using the symbol hash for consistent results
 */
function generateMockStockQuote(symbol: string, companyName: string): StockQuote {
  // Hash the symbol to get consistent quote data
  let baseValue = 0;
  for (let i = 0; i < symbol.length; i++) {
    baseValue += symbol.charCodeAt(i);
  }
  
  // Base price between $20 and $500
  const basePrice = 20 + (baseValue % 480);
  
  // Random daily movement between -5% and +5%
  const changePercent = (Math.random() * 10 - 5) / 100;
  const previousClose = basePrice / (1 + changePercent);
  const change = basePrice - previousClose;
  
  // Daily range is typically within 2% of current price
  const rangePercent = 0.02;
  const high = basePrice * (1 + (rangePercent * Math.random()));
  const low = basePrice * (1 - (rangePercent * Math.random()));
  
  // Opening price is usually closer to previous close
  const openGapPercent = (Math.random() - 0.5) * 0.01; // -0.5% to +0.5%
  const open = previousClose * (1 + openGapPercent);
  
  return {
    symbol,
    companyName,
    currentPrice: basePrice,
    change,
    percentChange: changePercent * 100,
    high,
    low, 
    open,
    previousClose,
    isMock: true
  };
}

export const stockRouter = createTRPCRouter({
  // Get all stocks for dropdown/search
  getAllStocks: publicProcedure.query(() => {
    return top100USStocks;
  }),
  
  // Search stocks by symbol or name
  searchStocks: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(({ input }) => {
      const { query } = input;
      if (!query || query.trim() === "") {
        return top100USStocks.slice(0, 20); // Return first 20 stocks if no query
      }
      
      const searchTerm = query.toLowerCase().trim();
      const results = top100USStocks.filter(
        stock => 
          stock.symbol.toLowerCase().includes(searchTerm) || 
          stock.name.toLowerCase().includes(searchTerm)
      );
      
      return results.length > 0 ? results : top100USStocks.slice(0, 5);
    }),

  // Get historical stock data for a specific symbol
  getStockData: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      try {
        const { symbol, days } = input;
        
        // Validate the symbol and days
        const validSymbol = validateStockSymbol(symbol);
        const dayRange = Math.min(Math.max(days, 1), 365); // Limit to 1-365 days
        
        // Find stock info for company name
        const stockInfo = top100USStocks.find(s => s.symbol === validSymbol);
        const companyName = stockInfo?.name || validSymbol;
        
        console.log(`Fetching stock data for ${validSymbol} (${companyName}) over ${dayRange} days`);
        
        try {
          // Fetch data from Yahoo Finance
          const data = await fetchYahooHistoricalData(validSymbol, dayRange);
          
          // Format the data
          const formattedData = formatYahooHistoricalData(data, validSymbol, companyName);
          
          // Validate the data before returning
          return stockDataSchema.parse(formattedData);
        } catch (apiError) {
          console.error(`Error fetching real data for ${validSymbol}:`, apiError);
          console.log(`Falling back to mock data for ${validSymbol}`);
          
          // Return mock data as fallback
          const mockData = generateMockStockData(validSymbol, companyName, dayRange);
          return stockDataSchema.parse(mockData);
        }
      } catch (error) {
        console.error("Stock data request error:", error);
        
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPC validation errors
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error fetching stock data',
        });
      }
    }),
    
  // Get OHLC data for a candlestick chart
  getOHLCData: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      try {
        const { symbol, days } = input;
        
        // Validate the symbol and days
        const validSymbol = validateStockSymbol(symbol);
        const dayRange = Math.min(Math.max(days, 1), 365); // Limit to 1-365 days
        
        // Find stock info
        const stockInfo = top100USStocks.find(s => s.symbol === validSymbol);
        const companyName = stockInfo?.name || validSymbol;
        
        try {
          // Fetch data from Yahoo Finance
          const data = await fetchYahooHistoricalData(validSymbol, dayRange);
          
          // Format the data
          const formattedData = formatYahooHistoricalData(data, validSymbol, companyName);
          
          return {
            ohlc: formattedData.ohlc,
            symbol: validSymbol,
            companyName
          };
        } catch (apiError) {
          console.error(`Error fetching real OHLC data for ${validSymbol}:`, apiError);
          console.log(`Falling back to mock OHLC data for ${validSymbol}`);
          
          // Return mock data as fallback
          const mockData = generateMockStockData(validSymbol, companyName, dayRange);
          
          return {
            ohlc: mockData.ohlc,
            symbol: validSymbol,
            companyName
          };
        }
      } catch (error) {
        console.error("OHLC data request error:", error);
        
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPC validation errors
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error fetching OHLC data',
        });
      }
    }),

  // Get current stock quote data
  getStockQuote: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      try {
        const { symbol } = input;
        
        // Validate the symbol
        const validSymbol = validateStockSymbol(symbol);
        
        // Find stock info
        const stockInfo = top100USStocks.find(s => s.symbol === validSymbol);
        const companyName = stockInfo?.name || validSymbol;
        
        console.log(`Fetching current quote for ${validSymbol} (${companyName})`);
        
        try {
          // Fetch quote data from Yahoo Finance
          const quoteData = await fetchYahooQuoteData(validSymbol);
          
          // Format the data
          return stockQuoteSchema.parse({
            symbol: validSymbol,
            companyName,
            currentPrice: quoteData.regularMarketPrice || 0,
            change: quoteData.regularMarketChange || 0,
            percentChange: quoteData.regularMarketChangePercent || 0,
            high: quoteData.regularMarketDayHigh || 0,
            low: quoteData.regularMarketDayLow || 0,
            open: quoteData.regularMarketOpen || 0,
            previousClose: quoteData.regularMarketPreviousClose || 0,
            isMock: false
          });
        } catch (apiError) {
          console.error(`Error fetching real quote data for ${validSymbol}:`, apiError);
          console.log(`Falling back to mock quote data for ${validSymbol}`);
          
          // Return mock data as fallback
          return generateMockStockQuote(validSymbol, companyName);
        }
      } catch (error) {
        console.error("Stock quote request error:", error);
        
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPC validation errors
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error fetching stock quote',
        });
      }
    }),
}); 
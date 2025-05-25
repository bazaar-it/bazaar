/**
 * Interface for Finnhub candle data response
 */
export interface FinnhubCandleResponse {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status ("ok" or "no_data")
  t: number[];  // Timestamps (UNIX)
  v: number[];  // Volume
}

/**
 * Interface for formatted stock data used in the Remotion visualizer
 */
export interface FormattedStockData {
  prices: number[];      // Close prices
  dates: string[];       // Formatted date strings
  companyName: string;
  symbol: string;
  highest: number;       // Highest price in the period
  lowest: number;        // Lowest price in the period
  ohlc: {                // OHLC data for advanced visualizations
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    dates: string[];
  };
  volume: number[];      // Trading volume
}

/**
 * Formats a date consistently across the application
 * 
 * @param date - Date object to format
 * @returns Formatted date string (e.g., "Jan 15, '23")
 */
export function formatDateString(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: '2-digit'
  });
}

/**
 * Formats the raw Finnhub API response for use in the Remotion stock visualizer
 * 
 * @param data - Raw response from Finnhub API
 * @param symbol - Stock symbol (e.g., "AAPL")
 * @param companyName - Company name (e.g., "Apple Inc.")
 * @returns Formatted stock data ready for visualization
 */
export function formatFinnhubData(
  data: FinnhubCandleResponse, 
  symbol: string, 
  companyName: string
): FormattedStockData {
  // Check if we have valid data
  if (!data || data.s !== "ok" || !data.c || data.c.length === 0) {
    throw new Error("Invalid or empty data from Finnhub API");
  }

  try {
    // Format dates from timestamps
    const dates = data.t.map((timestamp) => {
      const date = new Date(timestamp * 1000);
      return formatDateString(date);
    });

    // Calculate highest and lowest prices
    const highest = Math.max(...data.h);
    const lowest = Math.min(...data.l);

    return {
      prices: data.c,
      dates,
      companyName,
      symbol,
      highest,
      lowest,
      ohlc: {
        open: data.o,
        high: data.h,
        low: data.l,
        close: data.c,
        dates
      },
      volume: data.v
    };
  } catch (error) {
    console.error("Error formatting Finnhub data:", error);
    throw new Error(`Failed to format data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to generate Unix timestamps for a date range
 * 
 * @param daysAgo - Number of days in the past to start
 * @returns Object with from and to Unix timestamps
 */
export function getDateRange(daysAgo: number) {
  const now = new Date();
  // Set time to end of day to ensure we get today's data
  now.setHours(23, 59, 59, 999);
  const to = Math.floor(now.getTime() / 1000); // Current time in seconds
  
  // Calculate 'from' date (daysAgo days in the past)
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - daysAgo);
  // Set time to start of day
  fromDate.setHours(0, 0, 0, 0);
  const from = Math.floor(fromDate.getTime() / 1000);
  
  return { from, to };
}

/**
 * Generates a fetch URL for the Finnhub API
 * 
 * @param symbol - Stock symbol
 * @param daysAgo - Number of days of history to fetch
 * @param apiKey - Finnhub API key
 * @returns Complete URL for the Finnhub API request
 */
export function generateFinnhubUrl(symbol: string, daysAgo: number, apiKey: string): string {
  const { from, to } = getDateRange(daysAgo);
  
  return `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
}

/**
 * Generate a realistic random walk for stock price simulation
 * 
 * @param startPrice - Starting price
 * @param days - Number of days to simulate
 * @param volatility - Volatility factor (higher = more movement)
 * @param trend - Overall trend direction (-1 to 1, where 1 is strongly upward)
 * @param hasMarketCrash - Whether to simulate a market crash event
 * @returns Array of simulated prices
 */
function generateRandomWalk(
  startPrice: number, 
  days: number, 
  volatility = 0.015, 
  trend = 0,
  hasMarketCrash = false
): number[] {
  const prices: number[] = [startPrice];
  let currentPrice = startPrice;
  
  // Determine if and where a market event will occur
  const marketEventDay = hasMarketCrash 
    ? Math.floor(days * 0.3 + Math.random() * days * 0.4) // Between 30-70% through the period
    : -1;
  
  for (let i = 1; i <= days; i++) {
    // Check for market event (crash or rally)
    if (i === marketEventDay) {
      // Sudden price change (crash = big negative, rally = big positive)
      const eventMultiplier = hasMarketCrash ? -0.15 : 0.15;
      currentPrice = currentPrice * (1 + eventMultiplier);
      prices.push(parseFloat(currentPrice.toFixed(2)));
      continue;
    }
    
    // Base volatility increases with higher prices (realistic behavior)
    const priceVolatility = volatility * (1 + (currentPrice / startPrice) * 0.2);
    
    // Random component (normal-ish distribution using multiple random values)
    const randomComponent = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * priceVolatility;
    
    // Trend component with slight acceleration/deceleration
    const trendAdjustment = 1 + (i / days) * 0.5; // Trend intensifies over time
    const trendComponent = trend * 0.002 * currentPrice * trendAdjustment;
    
    // Mean reversion component (pulls toward starting price) - stronger when far from start
    const deviation = (currentPrice - startPrice) / startPrice;
    const meanReversion = -deviation * 0.001 * currentPrice;
    
    // Combine all factors
    const change = currentPrice * (randomComponent + trendComponent + meanReversion);
    
    // Calculate new price with a minimum floor
    currentPrice = Math.max(currentPrice + change, currentPrice * 0.5);
    
    // Add some intraday correction occasionally (price tends to reverse after big moves)
    if (Math.abs(randomComponent) > volatility * 2 && Math.random() > 0.7) {
      currentPrice = currentPrice - (change * 0.3); // Partial reversal
    }
    
    prices.push(parseFloat(currentPrice.toFixed(2)));
  }
  
  return prices;
}

/**
 * Mock data generator for testing without API calls
 * 
 * @param symbol - Stock symbol
 * @param companyName - Company name
 * @param daysAgo - Number of days to generate
 * @returns Formatted mock stock data
 */
export function generateMockStockData(
  symbol: string, 
  companyName: string, 
  daysAgo: number
): FormattedStockData {
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
    
    dates.push(formatDateString(date));
  }
  
  // Ensure we have at least one date to prevent errors
  if (dates.length === 0) {
    dates.push(formatDateString(today));
  }
  
  // Set base price according to the symbol to maintain consistency
  // Hash the symbol to get a consistent starting price
  let basePrice = 100;
  for (let i = 0; i < symbol.length; i++) {
    basePrice += symbol.charCodeAt(i);
  }
  basePrice = (basePrice % 200) + 100; // Between 100 and 300
  
  // Determine trend based on symbol hash for consistency
  const symbolSum = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const trend = ((symbolSum % 20) - 10) / 10; // Between -1 and 1
  
  // Determine volatility based on symbol characteristics
  const volatility = 0.01 + (symbolSum % 10) * 0.002; // Between 0.01 and 0.03
  
  // Some stocks occasionally have market crash events
  const hasMarketCrash = (symbolSum % 7 === 0) && (daysAgo > 30);
  
  // Generate stock movement with random walk
  const actualDays = dates.length; // Use actual calendar days (excluding weekends)
  const closePrices = generateRandomWalk(basePrice, actualDays, volatility, trend, hasMarketCrash);
  
  // Generate OHLC data from close prices
  const open: number[] = [];
  const high: number[] = [];
  const low: number[] = [];
  const volume: number[] = [];
  
  // Generate realistic OHLC relationships
  for (let i = 0; i < closePrices.length; i++) {
    const closePrice = closePrices[i] || basePrice; // Use base price as fallback
    const prevClose = i > 0 ? (closePrices[i - 1] || basePrice) : closePrice;
    
    // Open price is biased toward previous close with some overnight gap
    const gapChange = (Math.random() - 0.5) * 0.01 * closePrice; // -0.5% to +0.5% overnight gap
    const openPrice = parseFloat((prevClose + gapChange).toFixed(2));
    
    // High and low create a realistic candle
    // Higher volatility days tend to have wider candles
    const dayVolatility = volatility * (1 + Math.random());
    const highPrice = parseFloat(Math.max(openPrice, closePrice, closePrice * (1 + dayVolatility * 0.7)).toFixed(2));
    const lowPrice = parseFloat(Math.min(openPrice, closePrice, closePrice * (1 - dayVolatility * 0.7)).toFixed(2));
    
    // Volume correlates with price movement and overall price level
    const priceMovement = Math.abs(closePrice - prevClose) / prevClose;
    const baseVolume = 1000000 + (closePrice * 10000); // Higher priced stocks tend to have higher volume
    const volumeMultiplier = 1 + priceMovement * 50; // Higher movement = higher volume
    const dailyVolume = Math.floor(baseVolume * volumeMultiplier * (1 + (Math.random() - 0.5) * 0.5));
    
    open.push(openPrice);
    high.push(highPrice);
    low.push(lowPrice);
    volume.push(dailyVolume);
  }
  
  return {
    prices: closePrices,
    dates,
    companyName,
    symbol,
    highest: Math.max(...high),
    lowest: Math.min(...low),
    ohlc: {
      open,
      high,
      low,
      close: closePrices,
      dates
    },
    volume
  };
} 
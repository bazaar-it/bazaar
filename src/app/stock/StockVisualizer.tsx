"use client";

// src/app/stock/StockVisualizer.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Player } from "@remotion/player";
import { api } from "~/trpc/react";
import { StockGraph } from "~/remotion/components/StockGraph";
import type { StockData, StockQuote } from "~/server/api/routers/stock";
import { useDebounce } from "~/hooks/useDebounce";

export default function StockVisualizer() {
  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeRange, setTimeRange] = useState(30); // 30 days
  
  // Data state
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const [selectedCompanyName, setSelectedCompanyName] = useState("Apple Inc.");
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [quoteData, setQuoteData] = useState<StockQuote | null>(null);
  
  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  console.log("Current selected stock:", selectedStock);
  console.log("Current time range:", timeRange);

  // Search query for stocks
  const { data: searchResults, isLoading: searchLoading } = api.stock.searchStocks.useQuery(
    { query: debouncedSearch },
    {
      enabled: searchQuery.length > 0,
    }
  );

  // Stock data query (disabled by default, manually triggered)
  const stockDataQuery = api.stock.getStockData.useQuery(
    { symbol: selectedStock, days: timeRange },
    {
      enabled: false,
      retry: 1
    }
  );

  // Stock quote query (disabled by default, manually triggered)
  const quoteDataQuery = api.stock.getStockQuote.useQuery(
    { symbol: selectedStock },
    {
      enabled: false,
      retry: 1
    }
  );

  // Function to handle stock selection from dropdown
  const handleStockSelect = (symbol: string, name: string) => {
    console.log(`Stock selected: ${symbol} (${name})`);
    setSelectedStock(symbol);
    setSelectedCompanyName(name);
    setShowDropdown(false);
    setSearchQuery("");
    // Trigger a refresh
    setDataRefreshTrigger(prev => prev + 1);
  };

  // Function to fetch stock data
  const fetchStockData = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log(`Fetching data for ${selectedStock} over ${timeRange} days...`);
    
    try {
      // Fetch stock data
      const stockResult = await stockDataQuery.refetch();
      if (stockResult.data) {
        console.log("Stock data loaded:", stockResult.data);
        setStockData(stockResult.data);
      } else if (stockResult.error) {
        console.error("Stock data fetch error:", stockResult.error);
        setError(`Failed to load stock data: ${stockResult.error.message}`);
      }
      
      // Fetch quote data
      const quoteResult = await quoteDataQuery.refetch();
      if (quoteResult.data) {
        console.log("Quote data loaded:", quoteResult.data);
        setQuoteData(quoteResult.data);
      }
    } catch (err) {
      console.error("Error in data fetch:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedStock, timeRange, stockDataQuery, quoteDataQuery]);

  // Load data on initial render
  useEffect(() => {
    fetchStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when selection changes or refresh is triggered
  useEffect(() => {
    if (dataRefreshTrigger > 0) {
      fetchStockData();
    }
  }, [dataRefreshTrigger, fetchStockData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full p-4">
      {/* Left Panel - Controls */}
      <div className="w-full lg:w-1/3 p-6 bg-gray-50 rounded-lg">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for a Stock
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by ticker or company name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:border-indigo-500 focus:outline-none"
              />
              
              {/* Search Results Dropdown */}
              {showDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {searchLoading ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
                  ) : searchResults && searchResults.length > 0 ? (
                    searchResults.map((stock) => (
                      <div
                        key={stock.symbol}
                        onClick={() => handleStockSelect(stock.symbol, stock.name)}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100 cursor-pointer"
                      >
                        <span className="font-semibold">{stock.symbol}</span> - {stock.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">No stocks found</div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Currently selected: <span className="font-semibold">{selectedStock}</span> - {selectedCompanyName}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90, 180].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setTimeRange(days);
                    // Trigger data refresh when time range changes
                    setDataRefreshTrigger(prev => prev + 1);
                  }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
                    timeRange === days
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                  disabled={loading}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => setDataRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh Data"}
            </button>
            
            {error && (
              <div className="mt-2 text-sm text-red-600">{error}</div>
            )}

            {/* Debug buttons - only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 p-2 bg-gray-100 rounded-md text-xs">
                <div className="font-medium mb-1">Debug:</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => console.log({
                      selectedStock,
                      timeRange,
                      stockData,
                      quoteData,
                    })}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Log State
                  </button>
                  <button 
                    onClick={() => {
                      // Force reset with AAPL
                      setSelectedStock('AAPL');
                      setSelectedCompanyName('Apple Inc.');
                      setTimeout(() => setDataRefreshTrigger(prev => prev + 1), 100);
                    }}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Reset to AAPL
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Stock Quote Summary */}
          {quoteData && (
            <div className="mt-4 bg-white p-4 rounded-md border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-800 text-lg">{quoteData.companyName} ({quoteData.symbol})</h3>
                {quoteData.isMock && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Mock Data</span>}
              </div>
              
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold">${quoteData.currentPrice.toFixed(2)}</span>
                <span className={`text-sm font-medium ${quoteData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {quoteData.change >= 0 ? '+' : ''}{quoteData.change.toFixed(2)} ({quoteData.percentChange.toFixed(2)}%)
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Today's Open</span> 
                  <span className="font-medium">${quoteData.open.toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Previous Close</span> 
                  <span className="font-medium">${quoteData.previousClose.toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Day's High</span> 
                  <span className="font-medium text-green-600">${quoteData.high.toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Day's Low</span> 
                  <span className="font-medium text-red-600">${quoteData.low.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-500 flex justify-between items-center">
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
                <button 
                  onClick={() => quoteDataQuery.refetch()}
                  disabled={quoteDataQuery.isFetching}
                  className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  {quoteDataQuery.isFetching ? "Updating..." : "Refresh"}
                </button>
              </div>
            </div>
          )}
          
          {/* Historical Data Summary */}
          {stockData && stockData.highest !== undefined && stockData.lowest !== undefined && (
            <div className="mt-4 bg-white p-4 rounded-md border border-gray-200">
              <h3 className="font-medium text-gray-800 text-lg mb-3">Historical Data ({timeRange} days)</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Period High</span> 
                  <span className="font-medium text-green-600">${stockData.highest.toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Period Low</span> 
                  <span className="font-medium text-red-600">${stockData.lowest.toFixed(2)}</span>
                </div>
                {stockData.prices && stockData.prices.length > 0 && (
                  <>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 block text-xs">First Trading Day</span> 
                      <span className="font-medium">${stockData.prices[0]?.toFixed(2) ?? '0.00'}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 block text-xs">Latest Close</span> 
                      <span className="font-medium">${stockData.prices[stockData.prices.length - 1]?.toFixed(2) ?? '0.00'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Visualization */}
      <div className="w-full lg:w-2/3 bg-gray-100 rounded-lg overflow-hidden shadow-md flex items-center justify-center">
        <div className="w-full h-0 relative" style={{ paddingBottom: "70%" /* 10:7 aspect ratio - better for stock charts */ }}>
          {stockData ? (
            <>
              {stockData.prices && stockData.prices.length > 0 ? (
                <Player
                  component={StockGraph}
                  inputProps={{
                    prices: stockData.prices,
                    dates: stockData.dates,
                    companyName: stockData.companyName,
                    symbol: stockData.symbol,
                    highest: stockData.highest,
                    lowest: stockData.lowest,
                  }}
                  durationInFrames={180}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  }}
                  controls
                  loop
                  autoPlay={false}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-800 bg-opacity-80 text-white">
                  <svg className="h-12 w-12 text-yellow-400 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                  <h3 className="text-lg font-medium">No data available</h3>
                  <p className="text-sm text-gray-300 mt-2">
                    We couldn't retrieve price data for {stockData.symbol}. Please try a different stock or time range.
                  </p>
                </div>
              )}
              
              {/* Mock data indicator */}
              {quoteData?.isMock && (
                <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full shadow z-20">
                  Using simulation data
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              {loading ? (
                <>
                  <div className="animate-spin h-12 w-12 text-indigo-600 mb-4">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      ></circle>
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Loading stock data...
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Retrieving the latest market information.
                  </p>
                </>
              ) : (
                <>
                  <svg
                    className="h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">
                    Select a stock to visualize
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Search for a company and choose a time range to get started.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
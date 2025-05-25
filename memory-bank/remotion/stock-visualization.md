# Stock Visualization Component

## Overview
The stock visualization component allows users to search for a stock symbol, fetch real-time and historical data, and display it as an animated visualization using Remotion.

## Key Components

### StockVisualizer
- Main UI component located in `src/app/stock/StockVisualizer.tsx`
- Provides search functionality for stocks
- Displays stock information and current price data
- Embeds a Remotion player to render the animated stock graph

### StockGraph
- Remotion component located in `src/remotion/components/StockGraph.tsx`
- Renders an animated line graph showing stock price history
- Includes responsive design with proper aspect ratio preservation
- Features smooth animations and dynamic date label distribution

### Backend API
- Implemented in `src/server/api/routers/stock.ts`
- Provides endpoints for:
  - Searching stocks
  - Fetching historical stock data
  - Fetching current stock quote information
- Integrates with Finnhub API for real-time financial data
- Implements fallback to mock data when API calls fail

## Features

### Data Fetching
- Fetches historical price data for specified time ranges (7, 30, 90, 180 days)
- Gets real-time quote data including current price, daily change, high/low
- Handles API errors gracefully with fallback to realistic mock data

### User Interface
- Responsive layout with left panel for controls and right panel for visualization
- Search functionality with dropdown of top 100 US stocks
- Time range selection buttons
- Current stock quote display with price, change, open, high, low, etc.
- Historical data summary panel

### Visualization
- Animated line graph with smooth drawing effect
- Dynamic scaling to properly display price ranges
- Smart date label distribution to prevent overcrowding
- Proper aspect ratio maintenance for responsive embedding
- Visual indicators for price changes (red/green color coding)

## Implementation Details

### Finnhub API Integration
- API key stored in environment variables (`FINNHUB_API_KEY`)
- Endpoints used:
  - `/stock/candle` for historical OHLC data
  - `/quote` for current stock information

### Error Handling
- Graceful fallback to mock data when API calls fail
- Visual indicators for mock data
- Consistent error messaging to users

### Optimization
- Smart date label distribution based on dataset size
- Cubic bezier interpolation for smooth curve rendering
- Responsive design that maintains aspect ratio
- Efficient data fetching with debounced search

## Recent Improvements
- Added real-time quote data display in the left panel
- Improved aspect ratio handling in the visualization
- Enhanced date label distribution to prevent overcrowding
- Fixed Finnhub API authentication and error handling
- Added visual indicators for mock vs. real data
- Implemented better error handling and user feedback

## Summary
- Stock visualization tool allows users to create animated stock charts using Remotion
- Implements both line charts and candlestick charts using custom SVG implementations
- Fetches data from Finnhub API via tRPC procedures to keep API key secure
- Includes fallback to mock data when API calls fail or for development purposes
- Supports searching from a list of top 100 US stocks by market cap

## Components Architecture

### Frontend (src/app/stock/StockVisualizer.tsx)
- Main interface for interacting with the stock visualization tool
- Uses React with client-side functionality ("use client")
- Features include:
  - Search functionality with dropdown for stock selection
  - Chart type toggle (line chart vs. candlestick)
  - Time range selection (7, 30, 90, 180 days)
  - Responsive layout with controls panel and visualization area
  - Loading states and error handling
  - Stock statistics display

### Backend (src/server/api/routers/stock.ts)
- tRPC router with procedures for stock data operations:
  - `getAllStocks`: Returns the list of top 100 US stocks
  - `searchStocks`: Filters stocks based on search query
  - `getStockData`: Fetches historical price data for line charts
  - `getOHLCData`: Fetches OHLC (Open, High, Low, Close) data for candlestick charts
- API calls to Finnhub are made server-side for security
- Implements error handling with fallback to mock data

### Remotion Components
1. **StockGraph (src/remotion/components/StockGraph.tsx)**
   - Line chart visualization with sophisticated animation technique
   - Features:
     - Dark background with red accents for modern, sleek appearance
     - Advanced cubic bezier interpolation for smooth curves
     - High-resolution interpolation with 30 sub-points between each data point
     - Custom easing function for consistent animation speed
     - Spring-based fade-in effects
     - Animated area fill under the line with gradient
     - Current value indicator that follows the line
     - Grid system with price and date labels
     - Stats panel showing key metrics
     - Drop shadow effects for enhanced visibility

2. **CandlestickChart (src/remotion/components/CandlestickChart.tsx)**
   - Candlestick chart visualization with animated transitions
   - Features:
     - Animated candle appearance
     - Color-coded candles (green for bullish, red for bearish)
     - Price grid and date labels
     - Volume indicators
     - Legend explaining candlestick patterns

### Utilities (src/utils/finnhubDataFormatter.ts)
- Helper functions for working with stock data:
  - `formatFinnhubData`: Transforms raw API responses into visualization-ready format
  - `getDateRange`: Generates Unix timestamps for API date ranges
  - `generateFinnhubUrl`: Creates properly formatted API URLs
  - `generateMockStockData`: Creates realistic mock data for testing

## Animation Techniques

### StockGraph Animation
- **Cubic Bezier Interpolation**: Uses mathematical cubic bezier formulas to create smooth, natural-looking curves between data points
- **High-Resolution Interpolation**: Generates 30 sub-points between each data point for ultra-smooth animation
- **Custom Easing**: Implements a custom easing function that ensures consistent animation speed
- **Spring Physics**: Uses spring physics for fade-in elements, providing natural motion
- **Progressive Reveal**: Line draws progressively with the current value indicator following along
- **Visual Effects**: Includes drop shadows, gradients, and opacity animations

## API Integration

### Finnhub API
- Stock data is fetched from Finnhub API
- Implementation details:
  - API key stored in environment variables (`FINNHUB_API_KEY`)
  - Authentication headers include "X-Finnhub-Secret" for additional security
  - Stock candles endpoint used for historical data
  - Error handling ensures graceful fallbacks

## User Flow
1. User navigates to the `/stock` route
2. User searches for a stock or selects from dropdown
3. User selects chart type (line or candlestick)
4. User chooses time range (7, 30, 90, or 180 days)
5. User clicks "Create Animation" button
6. System fetches data via tRPC procedure
7. Data is formatted and passed to the appropriate Remotion component
8. Animation renders with the requested stock data
9. User can view statistics and interact with the animation (play, pause, scrub)

## Visual Design
- **StockGraph**: Modern dark theme with red accents, providing a sleek, professional look
  - Dark gradient background
  - Red line gradient with glow effect
  - Semi-transparent area fill
  - Contrasting white text for readability
  - Color indicators for performance (green for positive, red for negative)

- **CandlestickChart**: Traditional financial styling
  - Clean white background
  - Color-coded candles (green for bullish, red for bearish)
  - Subtle grid lines for reference
  - Clear labeling of dates and prices

## Current Limitations
- Limited to the top 100 US stocks by market cap
- Only supports daily resolution for historical data
- No option to compare multiple stocks
- Limited technical analysis indicators

## Future Enhancements
- Add technical indicators (moving averages, RSI, MACD)
- Implement stock comparison functionality
- Add more chart types (area, bar, etc.)
- Support for international stocks and cryptocurrencies
- Add more time ranges and data resolutions
- Implement downloadable video exports
- Add social sharing capabilities

## Documentation
- API documentation available in `memory-bank/api-docs/finnhub-integration.md`
- This document serves as the comprehensive overview of the stock visualization feature

## Recent Updates
- May 2023: Updated StockGraph component with advanced animation techniques
  - Implemented cubic bezier interpolation for smoother curves
  - Added high-resolution interpolation with sub-points
  - Updated visual styling with dark theme and red accents
  - Added spring physics for more natural animations
  - Enhanced visual effects with drop shadows and gradients 
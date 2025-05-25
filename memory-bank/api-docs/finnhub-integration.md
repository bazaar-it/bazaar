# Finnhub API Integration

## Summary
- Documents the integration with Finnhub API for stock data visualization
- Used in the experimental stock visualization tool at `/stock`

## Authentication
- Requires a Finnhub API key stored in the environment variable `FINNHUB_API_KEY`
- API key is accessed server-side via tRPC procedures
- API key has been set up in the .env file
- Added header field "X-Finnhub-Secret": "d0kjkchr01qn937l8mr0" for additional authentication

## Endpoints Used

### Stock Candles (Historical Data)
- **Endpoint**: `https://finnhub.io/api/v1/stock/candle`
- **Parameters**:
  - `symbol`: Stock symbol (e.g., 'AAPL')
  - `resolution`: Data resolution (e.g., 'D' for daily)
  - `from`: UNIX timestamp for start date
  - `to`: UNIX timestamp for end date
  - `token`: API key
- **Response**: JSON with stock price data (open, high, low, close, volume)
- **Example**: 
  ```json
  {
    "c": [217.68, 221.03, 219.89],
    "h": [222.49, 221.5, 220.94],
    "l": [217.19, 217.1418, 218.83],
    "o": [221.03, 218.55, 220],
    "s": "ok",
    "t": [1569297600, 1569384000, 1569470400],
    "v": [33463820, 24018876, 20730608]
  }
  ```
  
### Symbol Search
- **Endpoint**: `https://finnhub.io/api/v1/search`
- **Parameters**:
  - `q`: Search query
  - `token`: API key
- **Response**: List of symbols matching the search query
- **Example**:
  ```json
  {
    "count": 4,
    "result": [
      {
        "description": "APPLE INC",
        "displaySymbol": "AAPL",
        "symbol": "AAPL",
        "type": "Common Stock"
      },
      ...
    ]
  }
  ```

## Implementation Notes
- Stock data is fetched server-side via tRPC procedures to secure the API key
- Data is transformed into a format consumable by the Remotion StockGraph component
- For testing/development, mock data can be used to avoid API rate limits
- Added search functionality with the top 100 US stocks
- Implemented debounced search for better user experience
- Added support for longer historical data (up to 180 days)

## Usage in Stock Visualizer
1. User searches for a stock using the search field
2. Dropdown displays matching stocks from the top 100 US stocks list
3. User selects a time range (7, 30, 90, or 180 days)
4. User clicks "Create" to trigger data fetch via tRPC
5. Fetched data is formatted and passed to the StockGraph Remotion component

## Available Stocks
- The system includes the top 100 US stocks by market cap
- Users can search for stocks by ticker symbol or company name
- Search is case-insensitive and supports partial matching

## Updated on 
May 2023 
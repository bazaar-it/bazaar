# Stock Visualization Feature

## Overview
The Stock Visualization feature allows users to create animated visualizations of stock price history. This component uses Yahoo Finance for data retrieval and Remotion for creating interactive animations.

## API Endpoints

### `getStockData`
- **Input**: 
  - `symbol`: Stock ticker symbol (e.g., "AAPL")
  - `days`: Number of days of historical data (default: 30)
- **Output**: Historical stock data including:
  - Prices array
  - Dates array
  - Company name
  - Highest/lowest prices
  - OHLC data (Open, High, Low, Close)

### `getStockQuote`
- **Input**: 
  - `symbol`: Stock ticker symbol
- **Output**: Current stock quote data:
  - Current price
  - Daily change (value and percentage)
  - High/low values
  - Open/previous close values

### `searchStocks`
- **Input**: 
  - `query`: Search term for ticker or company name
- **Output**: Array of matching stock objects with symbols and names

## Data Sources
- **Primary**: Yahoo Finance (yahoo-finance2 package)
- **Fallback**: Mock data generator for testing or when API is unavailable

## Components

### `StockVisualizer`
Main user interface component that allows stock selection and visualization.

### `StockGraph`
Remotion component that renders the animated visualization.

## Error Handling
- Validates stock symbols against a predefined list
- Falls back to mock data when API fails
- Provides visual indication when using mock data 
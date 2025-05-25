import type { Metadata } from "next";
import StockVisualizer from "./StockVisualizer";

export const metadata: Metadata = {
  title: "Stock Visualizer | Bazaar-Vid",
  description: "Visualize stock price data with animated graphs",
};

export default function StockVisualizerPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <header className="bg-black text-white p-4">
        <h1 className="text-2xl font-bold">Stock Visualizer (Experimental)</h1>
        <p className="text-sm opacity-70">
          Select a stock, fetch historical data, and visualize it as an animated graph
        </p>
      </header>
      <div className="flex-grow flex flex-col md:flex-row p-4">
        <StockVisualizer />
      </div>
    </main>
  );
} 
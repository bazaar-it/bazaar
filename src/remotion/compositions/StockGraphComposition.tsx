import React from "react";
import { Composition } from "remotion";
import { StockGraph } from "../components/StockGraph";
import { z } from "zod";

// Define props schema
const StockGraphSchema = z.object({
  prices: z.array(z.number()),
  dates: z.array(z.string()),
  companyName: z.string(),
});

export const StockGraphComposition: React.FC = () => {
  // Example data
  const teslaData = {
    prices: [
      268.46, 270.76, 269.28, 265.43, 263.29, 261.86, 264.10, 266.40,
      267.31, 268.35, 270.11, 271.55, 273.37, 275.50, 277.97, 280.74,
      282.51, 284.95, 285.88, 287.03, 282.16
    ],
    dates: [
      "Apr 1", "Apr 2", "Apr 3", "Apr 4", "Apr 7", "Apr 8", "Apr 9", "Apr 10",
      "Apr 11", "Apr 14", "Apr 15", "Apr 16", "Apr 17", "Apr 21", "Apr 22",
      "Apr 23", "Apr 24", "Apr 25", "Apr 28", "Apr 29", "Apr 30"
    ],
    companyName: "Tesla Inc."
  };

  return (
    <>
      <Composition
        id="StockGraph"
        component={StockGraph}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={teslaData}
        schema={StockGraphSchema}
      />
    </>
  );
}; 
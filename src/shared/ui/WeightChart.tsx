"use dom";

import React from "react";

interface WeightChartProps {
  weightData: number[];
  min: number;
  range: number;
  primaryColor: string;
}

export default function WeightChart({ weightData, min, range, primaryColor }: WeightChartProps) {
  const pts = weightData.map((v, i) => {
    const x = (i / (weightData.length - 1)) * 290 + 5;
    const y = 100 - ((v - min) / range) * 90 + 5;
    return [x, y] as [number, number];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${d} L${pts[pts.length - 1][0]},110 L${pts[0][0]},110 Z`;

  return (
    <svg viewBox="0 0 300 110" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g1)" />
      <path
        d={d}
        fill="none"
        stroke={primaryColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={i === pts.length - 1 ? 4 : 0}
          fill={primaryColor}
        />
      ))}
    </svg>
  );
}

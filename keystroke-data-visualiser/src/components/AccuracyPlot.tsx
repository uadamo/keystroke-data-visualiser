import React, { useEffect, useState } from "react";
import { fetchTaskVectors } from "./Files.tsx";

import "./section.css";
import Plot from "react-plotly.js";

interface PlotComponentProps {
  userKeystrokeData: any[];
}

const AccuracyPerPersonPlot = ({ userKeystrokeData }: PlotComponentProps) => {
  const arrayData = userKeystrokeData.slice(1);
  const keystrokeNrArray = Array.from(
    { length: arrayData.length },
    (_, i) => i + 1
  );
  return (
    <Plot
      data={[
        {
          x: keystrokeNrArray,
          y: arrayData,
          mode: "lines+markers",
          line: { color: "red" },
          marker: { color: "blue" },
        },
      ]}
      layout={{
        width: 1100,
        height: 600,
        title: { text: `Typing accuracy for user ${userKeystrokeData[0]}` },
      }}
    />
  );
};

const AccuracyPlot = () => {
  const [vectors, setVectors] = useState<any[]>([]);
  useEffect(() => {
    fetchTaskVectors({ accuracy: true }).then((result) => setVectors(result));
  }, []);
  return (
    <div className="section">
      <div>
        {vectors.map((vector, i) => (
          <AccuracyPerPersonPlot key={i} userKeystrokeData={vector} />
        ))}
      </div>
      <div></div>
    </div>
  );
};

export default AccuracyPlot;

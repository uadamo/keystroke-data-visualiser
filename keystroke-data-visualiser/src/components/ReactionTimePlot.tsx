import React, { useEffect, useState } from "react";
import { fetchTaskVectors } from "./Files.tsx";
import Plot from "react-plotly.js";
import "./section.css";

interface PlotComponentProps {
  userKeystrokeData: any[];
}

const ReactionTimePerPersonPlot = ({
  userKeystrokeData,
}: PlotComponentProps) => {
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
        title: { text: `Reaction time for user ${userKeystrokeData[0]}` },
      }}
    />
  );
};

const ReactionTimePlot = () => {
  const [vectors, setVectors] = useState<any[]>([]);
  useEffect(() => {
    fetchTaskVectors({ reaction: true }).then((result) => setVectors(result));
  }, []);
  return (
    <div className="section">
      {vectors.map((vector) => (
        <ReactionTimePerPersonPlot key={vector} userKeystrokeData={vector} />
      ))}
    </div>
  );
};

export default ReactionTimePlot;

import React, { useEffect, useState } from "react";
import { fetchTaskVectors } from "./Files.tsx";
import Plot from "react-plotly.js";

import "./section.css";

interface TemporalPlotComponentProps {
  userKeystrokeData: any[];
}

const TemporalPlotComponent = ({
  userKeystrokeData,
}: TemporalPlotComponentProps) => {
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
          type: "scatter",
          mode: "markers",
          marker: { color: "red" },
        },
      ]}
      layout={{
        width: 1200,
        height: 600,
        title: { text: `temporal features for user ${userKeystrokeData[0]}` },
      }}
    />
  );
};

const TemporalPlot = () => {
  const [temporalVectors, setTemporalVectors] = useState<any[]>([]);
  useEffect(() => {
    fetchTaskVectors({ upDown: true }).then((result) =>
      setTemporalVectors(result)
    );
  }, []);
  return (
    <div className="section">
      {temporalVectors.map((vector, i) => (
        <TemporalPlotComponent key={i} userKeystrokeData={vector} />
      ))}
    </div>
  );
};

export default TemporalPlot;

import React, { useEffect, useState } from "react";
import { fetchTaskVectors } from "./Files.tsx";
import Plot from "react-plotly.js";
import "./section.css";

interface PlotComponentProps {
  userKeystrokeData: any[];
}

const SpeedPerPersonPlot = ({ userKeystrokeData }: PlotComponentProps) => {
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
          mode: "markers",
          marker: { color: "green" },
        },
      ]}
      layout={{
        width: 1100,
        height: 600,
        title: { text: `Typing speed for user ${userKeystrokeData[0]}` },
      }}
    />
  );
};

const SpeedPlot = () => {
  const [vectors, setVectors] = useState<any[]>([]);
  useEffect(() => {
    fetchTaskVectors({ typingSpeed: true }).then((result) =>
      setVectors(result)
    );
  }, []);
  return (
    <div className="section">
      {vectors.map((vector, i) => (
        <SpeedPerPersonPlot key={i} userKeystrokeData={vector} />
      ))}
    </div>
  );
};

export default SpeedPlot;

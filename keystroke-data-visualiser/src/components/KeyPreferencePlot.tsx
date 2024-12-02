import React, { useEffect, useState } from "react";
import { fetchTaskVectors } from "./Files.tsx";
import Plot from "react-plotly.js";

import "./section.css";

const KeyPreferencePlot = () => {
  const [vectors, setVectors] = useState<any[]>([]);
  useEffect(() => {
    fetchTaskVectors({ keyPreference: true }).then((result) =>
      setVectors(result)
    );
  }, []);
  return <div className="section">KeyPreferencePlot</div>;
};

export default KeyPreferencePlot;

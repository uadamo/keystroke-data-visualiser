import React, { useEffect, useState } from "react";

import "./section.css";
import { UserProfile } from "../types/Users";
import Plot from "react-plotly.js";

interface UserPieChartProps {
  userVectors: UserProfile[];
}

const UserGenderPieChart = ({ userVectors }: UserPieChartProps) => {
  const numberOfWomen = userVectors.filter(
    (user) => user.gender === "female"
  ).length;
  const numberOfMen = userVectors.filter(
    (user) => user.gender === "male"
  ).length;

  return (
    <Plot
      data={[
        {
          values: [numberOfWomen, numberOfMen],
          labels: ["women", "men"],
          type: "pie",
        },
      ]}
      layout={{
        width: 1200,
        height: 600,
        title: { text: "Gender distribution" },
      }}
    />
  );
};

const UserAgePieChart = ({ userVectors }: UserPieChartProps) => {
  const youngest = userVectors.filter((user) => +user.age <= 25).length;
  const middle = userVectors.filter(
    (user) => +user.age > 25 && +user.age <= 35
  ).length;
  const oldest = userVectors.filter((user) => +user.age > 35).length;

  return (
    <Plot
      data={[
        {
          values: [youngest, middle, oldest],
          labels: [
            "Under 25 years old",
            "25-35 years old",
            "Over 35 years old",
          ],
          type: "pie",
        },
      ]}
      layout={{
        width: 1100,
        height: 600,
        title: { text: "Age distribution" },
      }}
    />
  );
};

// other ideas

// mens vs womens accuracy, speed, etc

const DatabaseStatsPlot = () => {
  const [userVectors, setUserVectors] = useState<UserProfile[]>([]);
  // useEffect(() => {
  //   fetchUsers().then((result) => setUserVectors(result!));
  // }, []);

  return (
    <div className="section">
      <UserGenderPieChart userVectors={userVectors} />
      <UserAgePieChart userVectors={userVectors} />
    </div>
  );
};

export default DatabaseStatsPlot;

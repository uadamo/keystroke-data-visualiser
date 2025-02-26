import React, { Component } from "react";
import logo from "./logo.svg";
import { Routes, Route } from "react-router-dom";
import { Home } from "./components/Home.tsx";
import Features from "./components/Features.tsx";
import "./App.css";
import NavBar from "./Navbar.tsx";
import DatabaseStatsPlot from "./components/DatabaseStatsPlot.tsx";
import TemploralPlot from "./components/TemporalPlot.tsx";
import AccuracyPlot from "./components/AccuracyPlot.tsx";
import KeyPreferencePlot from "./components/KeyPreferencePlot.tsx";
import ReactionTimePlot from "./components/ReactionTimePlot.tsx";
import SpeedPlot from "./components/SpeedPlot.tsx";

class App extends Component {
  render() {
    return (
      <>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Home />} />
        </Routes>
      </>
    );
  }
}

export default App;

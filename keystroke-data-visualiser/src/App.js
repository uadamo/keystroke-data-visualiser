import React, { Component } from "react";
import logo from "./logo.svg";
import { Routes, Route } from "react-router-dom";
import Home from "./components/Home.tsx";
import Files from "./components/Files.tsx";
import Features from "./components/Features.tsx";
import "./App.css";
import NavBar from "./Navbar.tsx";

class App extends Component {
  render() {
    return (
      <>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Home />} />
          <Route path="/files" element={<Files />} />
          <Route path="/features" element={<Features />} />
        </Routes>
      </>
    );
  }
}

export default App;

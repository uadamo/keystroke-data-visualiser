import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

const NavBar = () => {
  return (
    <div className="navbar">
      <NavLink className="navbar-item" to="/stats">
        Stats
      </NavLink>
      <NavLink className="navbar-item" to="/features">
        Features
      </NavLink>
      <NavLink className="navbar-item" to="/files">
        Files
      </NavLink>
    </div>
  );
};

export default NavBar;

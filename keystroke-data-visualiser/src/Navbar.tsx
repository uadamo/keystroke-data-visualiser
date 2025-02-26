import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

const NavBar = () => {
  return (
    <div className="navbar">
      <NavLink className="navbar-item" to="/">
        Stats
      </NavLink>
    </div>
  );
};

export default NavBar;

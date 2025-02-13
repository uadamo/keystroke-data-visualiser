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
      <NavLink className={"navbar-item"} to="/database-stats">
        Database Stats Plot
      </NavLink>
      <NavLink className={"navbar-item"} to="/temporal-plot">
        Temporal plot
      </NavLink>
      <NavLink className={"navbar-item"} to="/accuracy-plot">
        Accuracy plot
      </NavLink>
      <NavLink className={"navbar-item"} to="/key-preference-plot">
        Key preference plot
      </NavLink>
      <NavLink className={"navbar-item"} to="/reaction-time-plot">
        Reaction time plot
      </NavLink>
      <NavLink className={"navbar-item"} to="/speed-plot">
        Speed plot
      </NavLink>
    </div>
  );
};

export default NavBar;

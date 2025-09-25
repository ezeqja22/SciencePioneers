// src/LandingPage.jsx
import React from "react";
import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to Science Pioneers</h1>
      <p>Please Signup or Login</p>
      <div>
        <Link to="/signup">
          <button style={{ margin: "10px", padding: "10px 20px" }}>Signup</button>
        </Link>
        <Link to="/login">
          <button style={{ margin: "10px", padding: "10px 20px" }}>Login</button>
        </Link>
      </div>
    </div>
  );
}

export default LandingPage;

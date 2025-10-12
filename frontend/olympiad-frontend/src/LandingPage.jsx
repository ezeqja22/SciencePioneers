// src/LandingPage.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFeatureSettings } from "./hooks/useFeatureSettings";

function LandingPage() {
  const navigate = useNavigate();
  const { checkFeatureEnabled, showFeatureDisabledAlert } = useFeatureSettings();

  const handleSignupClick = () => {
    if (checkFeatureEnabled('registration_enabled')) {
      navigate('/signup');
    } else {
      showFeatureDisabledAlert('Registration');
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to Science Pioneers</h1>
      <p>Please Signup or Login</p>
      <div>
        <button 
          onClick={handleSignupClick}
          style={{ margin: "10px", padding: "10px 20px", cursor: "pointer" }}
        >
          Signup
        </button>
        <Link to="/login">
          <button style={{ margin: "10px", padding: "10px 20px" }}>Login</button>
        </Link>
      </div>
    </div>
  );
}

export default LandingPage;

import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // Add email state
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from location state
  const redirectTo = location.state?.redirectTo || "/homepage";

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Clear any existing token first
      localStorage.removeItem("token");
      
      const response = await axios.post("http://127.0.0.1:8000/auth/register", { // Correct endpoint
        username,
        email, // Send email
        password,
      });
      
      // Redirect to verification page with email, username, and redirect path
      navigate("/verify-email", { 
        state: { 
          email: email, 
          username: username,
          redirectTo: redirectTo
        } 
      });
    } catch (err) {
      alert("Signup failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Signup</h2>
      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <br /><br />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br /><br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br /><br />
        <button type="submit">Signup</button>
      </form>
    </div>
  );
}

export default Signup;
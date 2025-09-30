import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://127.0.0.1:8000/auth/login", {
        email,
        password,
      });

      // Save JWT token to localStorage
      localStorage.setItem("token", response.data.token);

      alert("Login successful!");
      // Replace history entry to prevent back navigation to login
      navigate("/feed", { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      
      // Check if it's an email verification error
      if (err.response?.status === 403 && errorMessage.includes("Email not verified")) {
        // Redirect to verification page
        navigate("/verify-email", { 
          state: { 
            email: email,
            fromLogin: true 
          } 
        });
      } else {
        alert("Login failed: " + errorMessage);
      }
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
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
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;

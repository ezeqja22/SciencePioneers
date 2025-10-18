import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from location state
  const redirectTo = location.state?.redirectTo || "/homepage";

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('Environment variable:', process.env.REACT_APP_API_URL);
      console.log('Full URL will be:', `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/login`);
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/login`, {
        email,
        password,
      });

      // Save JWT token to localStorage
      localStorage.setItem("token", response.data.token);

      alert("Login successful!");
      // Replace history entry to prevent back navigation to login
      // If maintenance mode is enabled, redirect to homepage (maintenance screen will show)
      navigate("/homepage", { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      
      // Check if it's a maintenance mode error
      if (err.response?.status === 503) {
        alert("🔧 Site is currently under maintenance. Please try again later.");
      }
      // Check if it's an email verification error
      else if (err.response?.status === 403 && errorMessage.includes("Email not verified")) {
        // Redirect to verification page
        navigate("/verify-email", { 
          state: { 
            email: email,
            fromLogin: true 
          } 
        });
      } 
      // Check if it's a banned user error
      else if (err.response?.status === 403 && errorMessage.includes("Account has been banned")) {
        alert("🚫 " + errorMessage);
      } 
      // Check if it's a deactivated user error
      else if (err.response?.status === 403 && errorMessage.includes("Account has been deactivated")) {
        alert("⚠️ " + errorMessage);
      } 
      // Check if it's a network error
      else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        alert("🌐 Unable to connect to the server. Please check your internet connection and try again.");
      }
      else {
        alert("Login failed: " + errorMessage);
      }
    }
  };

  return (
    <Layout>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "60vh" 
      }}>
        <Card style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ textAlign: "center", marginBottom: spacing.xl }}>
            <h1 style={{
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.primary,
              marginBottom: spacing.sm
            }}>
              Welcome Back
            </h1>
            <p style={{
              color: colors.gray[600],
              fontSize: typography.fontSize.base,
              margin: 0
            }}>
              Sign in to your Olimpiada account
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: "block",
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.dark,
                fontSize: typography.fontSize.base
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: spacing.md,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                  fontFamily: typography.fontFamily,
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                  "&:focus": {
                    outline: "none",
                    borderColor: colors.primary
                  }
                }}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = colors.gray[300]}
              />
            </div>

            <div style={{ marginBottom: spacing.xl }}>
              <label style={{
                display: "block",
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.dark,
                fontSize: typography.fontSize.base
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: spacing.md,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                  fontFamily: typography.fontFamily,
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = colors.gray[300]}
              />
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              style={{ width: "100%", marginBottom: spacing.lg }}
            >
              Sign In
            </Button>
          </form>

          <div style={{
            textAlign: "center",
            paddingTop: spacing.lg,
            borderTop: `1px solid ${colors.gray[200]}`
          }}>
            <p style={{
              margin: `0 0 ${spacing.sm} 0`,
              color: colors.gray[600],
              fontSize: typography.fontSize.base
            }}>
              Don't have an account?
            </p>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate("/signup", { state: { redirectTo } })}
            >
              Create Account
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default Login;

import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // Add email state
  const [password, setPassword] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from location state
  const redirectTo = location.state?.redirectTo || "/homepage";

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Clear any existing token first
      localStorage.removeItem("token");
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/register`, { // Correct endpoint
        username,
        email, // Send email
        password,
        email_notifications: emailNotifications,
        marketing_emails: marketingEmails,
      });
      
      // Check if we received a token (automatic login)
      if (response.data.access_token) {
        // Store the token for automatic login
        localStorage.setItem("token", response.data.access_token);
        
        // Redirect to verification page with email, username, redirect path, and token
        navigate("/verify-email", { 
          state: { 
            email: email, 
            username: username,
            redirectTo: redirectTo,
            token: response.data.access_token
          } 
        });
      } else {
        // Fallback: redirect to verification page without token
        navigate("/verify-email", { 
          state: { 
            email: email, 
            username: username,
            redirectTo: redirectTo
          } 
        });
      }
    } catch (err) {
      alert("Signup failed: " + (err.response?.data?.detail || err.message));
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
              Join Olimpiada
            </h1>
            <p style={{
              color: colors.gray[600],
              fontSize: typography.fontSize.base,
              margin: 0
            }}>
              Create your account to start solving problems
            </p>
          </div>

          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: "block",
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.dark,
                fontSize: typography.fontSize.base
              }}>
                Username
              </label>
              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                  transition: "border-color 0.2s ease"
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
                placeholder="Create a password"
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

            {/* Notification Preferences */}
            <div style={{ marginBottom: spacing.lg }}>
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.dark,
                marginBottom: spacing.md
              }}>
                Notification Preferences
              </h3>
              
              <div style={{ marginBottom: spacing.md }}>
                <label style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: spacing.sm,
                  cursor: "pointer",
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  transition: "background-color 0.2s ease"
                }}>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    style={{
                      marginTop: "2px",
                      transform: "scale(1.2)",
                      accentColor: colors.primary
                    }}
                  />
                  <div>
                    <div style={{
                      fontWeight: typography.fontWeight.medium,
                      color: colors.dark,
                      fontSize: typography.fontSize.base,
                      marginBottom: spacing.xs
                    }}>
                      Email Notifications
                    </div>
                    <div style={{
                      color: colors.gray[600],
                      fontSize: typography.fontSize.sm,
                      lineHeight: 1.4
                    }}>
                      Get notified via email when someone likes, comments, or follows you (You can change this later in Settings)
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ marginBottom: spacing.md }}>
                <label style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: spacing.sm,
                  cursor: "pointer",
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  transition: "background-color 0.2s ease"
                }}>
                  <input
                    type="checkbox"
                    checked={marketingEmails}
                    onChange={(e) => setMarketingEmails(e.target.checked)}
                    style={{
                      marginTop: "2px",
                      transform: "scale(1.2)",
                      accentColor: colors.primary
                    }}
                  />
                  <div>
                    <div style={{
                      fontWeight: typography.fontWeight.medium,
                      color: colors.dark,
                      fontSize: typography.fontSize.base,
                      marginBottom: spacing.xs
                    }}>
                      Marketing Updates
                    </div>
                    <div style={{
                      color: colors.gray[600],
                      fontSize: typography.fontSize.sm,
                      lineHeight: 1.4
                    }}>
                      Receive occasional updates about new features and improvements (You can change this later in Settings)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              style={{ width: "100%", marginBottom: spacing.lg }}
            >
              Create Account
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
              Already have an account?
            </p>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate("/login", { state: { redirectTo } })}
            >
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default Signup;
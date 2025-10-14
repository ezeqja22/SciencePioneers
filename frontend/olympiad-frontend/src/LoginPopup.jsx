import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function LoginPopup({ isOpen, onClose, redirectTo }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/login`, {
                email: email,
                password: password
            });

            // Save JWT token to localStorage
            localStorage.setItem("token", response.data.token);

            // Close popup
            onClose();

            // Redirect to homepage (maintenance screen will show if maintenance mode is enabled)
            navigate("/homepage");
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message;
            
            // Check if it's a maintenance mode error
            if (err.response?.status === 503) {
                setError("Site is currently under maintenance. Please try again later.");
            }
            // Check if it's an email verification error
            else if (err.response?.status === 403 && errorMessage.includes("Email not verified")) {
                setError("Please verify your email before logging in. Check your email for verification code.");
            } 
            // Check if it's a network error
            else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
                setError("Unable to connect to the server. Please check your internet connection and try again.");
            }
            else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignupClick = () => {
        onClose();
        navigate("/signup", { state: { redirectTo } });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000
        }}>
            <div style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "2rem",
                width: "400px",
                maxWidth: "90vw",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}>
                {/* Header */}
                <div style={{
                    textAlign: "center",
                    marginBottom: "1.5rem"
                }}>
                    <h2 style={{
                        margin: "0 0 0.5rem 0",
                        color: "#1a4d3a",
                        fontSize: "1.5rem",
                        fontWeight: "600"
                    }}>
                        Welcome Back
                    </h2>
                    <p style={{
                        margin: 0,
                        color: "#666",
                        fontSize: "0.9rem"
                    }}>
                        Sign in to access all features
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "500",
                            color: "#333"
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                fontSize: "1rem",
                                boxSizing: "border-box"
                            }}
                            placeholder="Enter your email"
                        />
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "500",
                            color: "#333"
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                fontSize: "1rem",
                                boxSizing: "border-box"
                            }}
                            placeholder="Enter your password"
                        />
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: "#f8d7da",
                            color: "#721c24",
                            padding: "0.75rem",
                            borderRadius: "6px",
                            marginBottom: "1rem",
                            fontSize: "0.9rem"
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            backgroundColor: loading ? "#ccc" : "#1a4d3a",
                            color: "white",
                            border: "none",
                            padding: "0.75rem",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            fontWeight: "500",
                            cursor: loading ? "not-allowed" : "pointer",
                            marginBottom: "1rem",
                            transition: "background-color 0.2s"
                        }}
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                {/* Signup Link */}
                <div style={{
                    textAlign: "center",
                    paddingTop: "1rem",
                    borderTop: "1px solid #eee"
                }}>
                    <p style={{
                        margin: "0 0 0.5rem 0",
                        color: "#666",
                        fontSize: "0.9rem"
                    }}>
                        Don't have an account?
                    </p>
                    <button
                        onClick={handleSignupClick}
                        style={{
                            backgroundColor: "transparent",
                            color: "#1a4d3a",
                            border: "none",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                            cursor: "pointer",
                            textDecoration: "underline"
                        }}
                    >
                        Sign up here
                    </button>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        backgroundColor: "transparent",
                        border: "none",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        color: "#666"
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
}

export default LoginPopup;

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate("/login");
        }
    }, [token, navigate]);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (!newPassword || !confirmPassword) {
            setError("All fields are required");
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }
        
        setLoading(true);
        setError("");
        
        try {
            await axios.post("${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/reset-password", {
                token: token,
                new_password: newPassword
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            setSuccess(true);
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate("/login");
            }, 3000);
            
        } catch (error) {
            console.error("Error resetting password:", error);
            setError(error.response?.data?.detail || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Layout>
                <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    minHeight: "60vh",
                    padding: spacing.lg
                }}>
                    <Card style={{ maxWidth: "500px", textAlign: "center" }}>
                        <div style={{ fontSize: "64px", marginBottom: "20px" }}>✅</div>
                        <h1 style={{ 
                            color: colors.success, 
                            marginBottom: "20px",
                            fontSize: typography.fontSize.xxl,
                            fontWeight: typography.fontWeight.bold
                        }}>
                            Password Reset Successful!
                        </h1>
                        <p style={{ 
                            color: colors.gray[600], 
                            marginBottom: "30px",
                            fontSize: typography.fontSize.lg,
                            lineHeight: 1.6
                        }}>
                            Your password has been successfully reset. You will be redirected to the login page shortly.
                        </p>
                        <Button
                            onClick={() => navigate("/login")}
                            style={{
                                backgroundColor: colors.primary,
                                color: colors.white,
                                border: `1px solid ${colors.primary}`,
                                padding: `${spacing.md} ${spacing.lg}`,
                                borderRadius: borderRadius.md,
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.medium,
                                cursor: "pointer"
                            }}
                        >
                            Go to Login
                        </Button>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                minHeight: "60vh",
                padding: spacing.lg
            }}>
                <Card style={{ maxWidth: "500px" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔒</div>
                        <h1 style={{ 
                            color: colors.primary, 
                            marginBottom: "20px",
                            fontSize: typography.fontSize.xxl,
                            fontWeight: typography.fontWeight.bold
                        }}>
                            Reset Password
                        </h1>
                        <p style={{ 
                            color: colors.gray[600], 
                            marginBottom: "30px",
                            fontSize: typography.fontSize.base,
                            lineHeight: 1.6
                        }}>
                            Enter your new password below.
                        </p>
                        
                        <form onSubmit={handleResetPassword}>
                            <div style={{ marginBottom: spacing.lg, textAlign: "left" }}>
                                <label style={{ 
                                    display: "block", 
                                    marginBottom: spacing.sm,
                                    fontWeight: typography.fontWeight.medium,
                                    color: colors.gray[700]
                                }}>
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter your new password"
                                    style={{
                                        width: "100%",
                                        padding: spacing.md,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: "none",
                                        transition: "border-color 0.2s ease"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = colors.primary}
                                    onBlur={(e) => e.target.style.borderColor = colors.gray[300]}
                                />
                            </div>
                            
                            <div style={{ marginBottom: spacing.lg, textAlign: "left" }}>
                                <label style={{ 
                                    display: "block", 
                                    marginBottom: spacing.sm,
                                    fontWeight: typography.fontWeight.medium,
                                    color: colors.gray[700]
                                }}>
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your new password"
                                    style={{
                                        width: "100%",
                                        padding: spacing.md,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: "none",
                                        transition: "border-color 0.2s ease"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = colors.primary}
                                    onBlur={(e) => e.target.style.borderColor = colors.gray[300]}
                                />
                            </div>
                            
                            {error && (
                                <div style={{ 
                                    color: colors.danger, 
                                    marginBottom: spacing.md,
                                    fontSize: typography.fontSize.sm,
                                    textAlign: "center"
                                }}>
                                    {error}
                                </div>
                            )}
                            
                            <Button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    backgroundColor: colors.primary,
                                    color: colors.white,
                                    border: `1px solid ${colors.primary}`,
                                    padding: `${spacing.md} ${spacing.lg}`,
                                    borderRadius: borderRadius.md,
                                    fontSize: typography.fontSize.base,
                                    fontWeight: typography.fontWeight.medium,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {loading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>
        </Layout>
    );
}

export default ResetPassword;

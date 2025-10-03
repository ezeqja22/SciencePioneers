import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import BackButton from "./components/BackButton";
import Switch from "./components/Switch";
import { colors, spacing, typography, borderRadius } from "./designSystem";

function Settings() {
    const [currentUser, setCurrentUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    
    // Notification preferences state
    const [notificationPrefs, setNotificationPrefs] = useState(null);
    const [prefsLoading, setPrefsLoading] = useState(false);
    const [prefsError, setPrefsError] = useState("");
    const [prefsSuccess, setPrefsSuccess] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        fetchCurrentUser();
        fetchNotificationPreferences();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/login");
                return;
            }

            const response = await axios.get("http://127.0.0.1:8000/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
            navigate("/login");
        }
    };

    const fetchNotificationPreferences = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get("http://127.0.0.1:8000/auth/notification-preferences", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotificationPrefs(response.data);
        } catch (error) {
            console.error("Error fetching notification preferences:", error);
            setPrefsError("Failed to load notification preferences");
        }
    };

    const updateNotificationPreferences = async (updatedPrefs) => {
        try {
            setPrefsLoading(true);
            setPrefsError("");
            setPrefsSuccess(false);

            const token = localStorage.getItem("token");
            const response = await axios.put("http://127.0.0.1:8000/auth/notification-preferences", updatedPrefs, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNotificationPrefs(response.data);
            setPrefsSuccess(true);
            setTimeout(() => setPrefsSuccess(false), 3000);
        } catch (error) {
            console.error("Error updating notification preferences:", error);
            setPrefsError("Failed to update notification preferences");
        } finally {
            setPrefsLoading(false);
        }
    };

    const handlePreferenceChange = (field, value) => {
        if (!notificationPrefs) return;
        
        const updatedPrefs = {
            ...notificationPrefs,
            [field]: value
        };
        
        setNotificationPrefs(updatedPrefs);
        updateNotificationPreferences(updatedPrefs);
    };

    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
    };

    const confirmDeleteAccount = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setError("No authentication token found. Please log in again.");
            return;
        }

        setLoading(true);
        setError("");
        
        try {
            const response = await axios.post("http://127.0.0.1:8000/auth/delete-account-request", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                setShowDeleteModal(false);
                setShowVerificationModal(true);
            }
        } catch (err) {
            console.error("Delete account request error:", err);
            if (err.response?.data?.detail) {
                const errorDetail = err.response.data.detail;
                setError(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
            } else {
                setError("Failed to send verification code. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerification = async (e) => {
        e.preventDefault();
        if (!verificationCode.trim()) {
            setError("Please enter the verification code");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            setError("No authentication token found. Please log in again.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await axios.post("http://127.0.0.1:8000/auth/delete-account", {
                verification_code: verificationCode
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 200) {
                setSuccess(true);
                // Clear token and redirect to homepage
                localStorage.removeItem("token");
                setTimeout(() => {
                    navigate("/homepage");
                }, 3000);
            }
        } catch (err) {
            console.error("Account deletion error:", err);
            if (err.response?.data?.detail) {
                const errorDetail = err.response.data.detail;
                setError(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
            } else {
                setError("Account deletion failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setShowVerificationModal(false);
        setVerificationCode("");
        setError("");
    };

    if (success) {
        return (
            <Layout>
                <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    minHeight: "60vh" 
                }}>
                    <Card>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
                            <h2 style={{ color: colors.danger, marginBottom: "20px" }}>Account Deleted</h2>
                            <p style={{ color: colors.gray[600], marginBottom: "20px" }}>
                                Your account has been successfully deleted. All your content will remain but will be attributed to "[deleted user]".
                            </p>
                            <p style={{ color: colors.gray[500], fontSize: "14px" }}>
                                Redirecting to homepage...
                            </p>
                        </div>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: spacing.xl }}>
                <BackButton />
                
                <div style={{ marginBottom: spacing.xl }}>
                    <h1 style={{ 
                        fontSize: typography.fontSize["3xl"], 
                        fontWeight: typography.fontWeight.bold,
                        color: colors.dark,
                        marginBottom: spacing.sm
                    }}>
                        Settings
                    </h1>
                    <p style={{ 
                        color: colors.gray[600], 
                        fontSize: typography.fontSize.lg 
                    }}>
                        Manage your account preferences and security settings.
                    </p>
                </div>

                <Card>
                    <div style={{ marginBottom: spacing.xl }}>
                        <h2 style={{ 
                            fontSize: typography.fontSize.xl, 
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.dark,
                            marginBottom: spacing.md
                        }}>
                            Account Information
                        </h2>
                        
                        <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "auto 1fr", 
                            gap: spacing.md,
                            marginBottom: spacing.lg
                        }}>
                            <strong style={{ color: colors.gray[700] }}>Username:</strong>
                            <span style={{ color: colors.dark }}>{currentUser?.username}</span>
                            
                            <strong style={{ color: colors.gray[700] }}>Email:</strong>
                            <span style={{ color: colors.dark }}>{currentUser?.email}</span>
                            
                            <strong style={{ color: colors.gray[700] }}>Member since:</strong>
                            <span style={{ color: colors.dark }}>
                                {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : "Unknown"}
                            </span>
                        </div>
                    </div>

                    {/* Notification Preferences Section */}
                    <div style={{ 
                        borderTop: `1px solid ${colors.gray[300]}`, 
                        paddingTop: spacing.xl,
                        marginBottom: spacing.xl
                    }}>
                        <h2 style={{ 
                            fontSize: typography.fontSize.xl, 
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.dark,
                            marginBottom: spacing.md
                        }}>
                            Notification Preferences
                        </h2>
                        
                        {prefsError && (
                            <div style={{
                                backgroundColor: colors.error + "20",
                                color: colors.error,
                                padding: spacing.md,
                                borderRadius: borderRadius.md,
                                marginBottom: spacing.md,
                                border: `1px solid ${colors.error}40`
                            }}>
                                {prefsError}
                            </div>
                        )}
                        
                        {prefsSuccess && (
                            <div style={{
                                backgroundColor: colors.success + "20",
                                color: colors.success,
                                padding: spacing.md,
                                borderRadius: borderRadius.md,
                                marginBottom: spacing.md,
                                border: `1px solid ${colors.success}40`
                            }}>
                                ✅ Notification preferences updated successfully!
                            </div>
                        )}

                        {notificationPrefs ? (
                            <div>
                                {/* Email Notifications */}
                                <div style={{ marginBottom: spacing.xl }}>
                                    <h3 style={{
                                        fontSize: typography.fontSize.lg,
                                        fontWeight: typography.fontWeight.semibold,
                                        color: colors.dark,
                                        marginBottom: spacing.md
                                    }}>
                                        📧 Email Notifications
                                    </h3>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: spacing.md,
                                            backgroundColor: colors.gray[50],
                                            borderRadius: borderRadius.md,
                                            cursor: "pointer"
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: typography.fontWeight.medium,
                                                    color: colors.dark,
                                                    marginBottom: spacing.xs
                                                }}>
                                                    Likes & Comments
                                                </div>
                                                <div style={{
                                                    color: colors.gray[600],
                                                    fontSize: typography.fontSize.sm
                                                }}>
                                                    Get notified when someone likes or comments on your problems
                                                </div>
                                            </div>
                                            <Switch
                                                checked={notificationPrefs.email_likes}
                                                onChange={(e) => handlePreferenceChange('email_likes', e.target.checked)}
                                                size="md"
                                            />
                                        </label>

                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: spacing.md,
                                            backgroundColor: colors.gray[50],
                                            borderRadius: borderRadius.md,
                                            cursor: "pointer"
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: typography.fontWeight.medium,
                                                    color: colors.dark,
                                                    marginBottom: spacing.xs
                                                }}>
                                                    Follows
                                                </div>
                                                <div style={{
                                                    color: colors.gray[600],
                                                    fontSize: typography.fontSize.sm
                                                }}>
                                                    Get notified when someone follows you
                                                </div>
                                            </div>
                                            <Switch
                                                checked={notificationPrefs.email_follows}
                                                onChange={(e) => handlePreferenceChange('email_follows', e.target.checked)}
                                                size="md"
                                            />
                                        </label>

                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: spacing.md,
                                            backgroundColor: colors.gray[50],
                                            borderRadius: borderRadius.md,
                                            cursor: "pointer"
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: typography.fontWeight.medium,
                                                    color: colors.dark,
                                                    marginBottom: spacing.xs
                                                }}>
                                                    Marketing Updates
                                                </div>
                                                <div style={{
                                                    color: colors.gray[600],
                                                    fontSize: typography.fontSize.sm
                                                }}>
                                                    Receive occasional updates about new features and improvements
                                                </div>
                                            </div>
                                            <Switch
                                                checked={notificationPrefs.email_marketing}
                                                onChange={(e) => handlePreferenceChange('email_marketing', e.target.checked)}
                                                size="md"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* In-App Notifications */}
                                <div>
                                    <h3 style={{
                                        fontSize: typography.fontSize.lg,
                                        fontWeight: typography.fontWeight.semibold,
                                        color: colors.dark,
                                        marginBottom: spacing.md
                                    }}>
                                        🔔 In-App Notifications
                                    </h3>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: spacing.md,
                                            backgroundColor: colors.gray[50],
                                            borderRadius: borderRadius.md,
                                            cursor: "pointer"
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: typography.fontWeight.medium,
                                                    color: colors.dark,
                                                    marginBottom: spacing.xs
                                                }}>
                                                    Likes & Comments
                                                </div>
                                                <div style={{
                                                    color: colors.gray[600],
                                                    fontSize: typography.fontSize.sm
                                                }}>
                                                    Show notifications in the bell icon when someone likes or comments
                                                </div>
                                            </div>
                                            <Switch
                                                checked={notificationPrefs.in_app_likes}
                                                onChange={(e) => handlePreferenceChange('in_app_likes', e.target.checked)}
                                                size="md"
                                            />
                                        </label>

                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: spacing.md,
                                            backgroundColor: colors.gray[50],
                                            borderRadius: borderRadius.md,
                                            cursor: "pointer"
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: typography.fontWeight.medium,
                                                    color: colors.dark,
                                                    marginBottom: spacing.xs
                                                }}>
                                                    Follows
                                                </div>
                                                <div style={{
                                                    color: colors.gray[600],
                                                    fontSize: typography.fontSize.sm
                                                }}>
                                                    Show notifications in the bell icon when someone follows you
                                                </div>
                                            </div>
                                            <Switch
                                                checked={notificationPrefs.in_app_follows}
                                                onChange={(e) => handlePreferenceChange('in_app_follows', e.target.checked)}
                                                size="md"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                textAlign: "center",
                                padding: spacing.xl,
                                color: colors.gray[600]
                            }}>
                                {prefsLoading ? "Loading preferences..." : "Failed to load notification preferences"}
                            </div>
                        )}
                    </div>

                    <div style={{ 
                        borderTop: `1px solid ${colors.gray[300]}`, 
                        paddingTop: spacing.xl 
                    }}>
                        <h2 style={{ 
                            fontSize: typography.fontSize.xl, 
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.danger,
                            marginBottom: spacing.md
                        }}>
                            Danger Zone
                        </h2>
                        
                        <p style={{ 
                            color: colors.gray[600], 
                            marginBottom: spacing.lg,
                            lineHeight: 1.6
                        }}>
                            Once you delete your account, there is no going back. Your username will be changed to "[deleted user]" 
                            but your problems, comments, and other contributions will remain on the platform.
                        </p>

                        <Button
                            variant="danger"
                            onClick={handleDeleteAccount}
                            style={{
                                backgroundColor: colors.danger,
                                color: colors.white,
                                border: `1px solid ${colors.danger}`,
                                padding: `${spacing.md} ${spacing.lg}`,
                                borderRadius: borderRadius.md,
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.medium,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            🗑️ Delete Account
                        </Button>
                    </div>
                </Card>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000
                    }}>
                        <Card style={{ maxWidth: "500px", margin: spacing.lg }}>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
                                <h2 style={{ 
                                    color: colors.danger, 
                                    marginBottom: "20px",
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: typography.fontWeight.semibold
                                }}>
                                    Delete Account
                                </h2>
                                <p style={{ 
                                    color: colors.gray[600], 
                                    marginBottom: "30px",
                                    lineHeight: 1.6
                                }}>
                                    Are you sure you want to delete your account? This action cannot be undone.
                                    A verification code will be sent to your email to confirm this action.
                                </p>
                                
                                <div style={{ 
                                    display: "flex", 
                                    gap: spacing.md, 
                                    justifyContent: "center" 
                                }}>
                                    <Button
                                        variant="secondary"
                                        onClick={cancelDelete}
                                        style={{
                                            backgroundColor: colors.gray[200],
                                            color: colors.gray[700],
                                            border: `1px solid ${colors.gray[300]}`,
                                            padding: `${spacing.md} ${spacing.lg}`,
                                            borderRadius: borderRadius.md
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={confirmDeleteAccount}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: colors.danger,
                                            color: colors.white,
                                            border: `1px solid ${colors.danger}`,
                                            padding: `${spacing.md} ${spacing.lg}`,
                                            borderRadius: borderRadius.md,
                                            opacity: loading ? 0.6 : 1,
                                            cursor: loading ? "not-allowed" : "pointer"
                                        }}
                                    >
                                        {loading ? "Sending..." : "Yes, Delete Account"}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Verification Modal */}
                {showVerificationModal && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000
                    }}>
                        <Card style={{ maxWidth: "500px", margin: spacing.lg }}>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "48px", marginBottom: "20px" }}>📧</div>
                                <h2 style={{ 
                                    color: colors.danger, 
                                    marginBottom: "20px",
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: typography.fontWeight.semibold
                                }}>
                                    Verify Account Deletion
                                </h2>
                                <p style={{ 
                                    color: colors.gray[600], 
                                    marginBottom: "30px",
                                    lineHeight: 1.6
                                }}>
                                    We've sent a verification code to your email address. 
                                    Please enter the code below to confirm account deletion.
                                </p>
                                
                                {error && (
                                    <div style={{
                                        backgroundColor: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        color: colors.danger,
                                        padding: spacing.md,
                                        borderRadius: borderRadius.md,
                                        marginBottom: spacing.md,
                                        fontSize: typography.fontSize.sm
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleVerification}>
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: spacing.lg }}>
                                        <input
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            placeholder="Enter verification code"
                                            style={{
                                                width: "200px",
                                                padding: spacing.md,
                                                border: `1px solid ${colors.gray[300]}`,
                                                borderRadius: borderRadius.md,
                                                fontSize: typography.fontSize.base,
                                                textAlign: "center",
                                                letterSpacing: "2px"
                                            }}
                                            maxLength={6}
                                        />
                                    </div>
                                    
                                    <div style={{ 
                                        display: "flex", 
                                        gap: spacing.md, 
                                        justifyContent: "center" 
                                    }}>
                                        <Button
                                            variant="secondary"
                                            onClick={cancelDelete}
                                            style={{
                                                backgroundColor: colors.gray[200],
                                                color: colors.gray[700],
                                                border: `1px solid ${colors.gray[300]}`,
                                                padding: `${spacing.md} ${spacing.lg}`,
                                                borderRadius: borderRadius.md
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="danger"
                                            disabled={loading || !verificationCode.trim()}
                                            style={{
                                                backgroundColor: colors.danger,
                                                color: colors.white,
                                                border: `1px solid ${colors.danger}`,
                                                padding: `${spacing.md} ${spacing.lg}`,
                                                borderRadius: borderRadius.md,
                                                opacity: (loading || !verificationCode.trim()) ? 0.6 : 1,
                                                cursor: (loading || !verificationCode.trim()) ? "not-allowed" : "pointer"
                                            }}
                                        >
                                            {loading ? "Deleting..." : "Delete Account"}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default Settings;

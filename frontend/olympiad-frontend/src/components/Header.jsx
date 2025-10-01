import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { colors, spacing, typography, shadows } from "../designSystem";

function Header({ showHomeButton = false }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const navigate = useNavigate();

    // Subjects list
    const subjects = [
        "Mathematics",
        "Physics", 
        "Chemistry",
        "Biology",
        "Computer Science",
        "Engineering",
        "Other"
    ];

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem("token");
        if (token) {
            fetchCurrentUser();
        }
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://127.0.0.1:8000/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
            setCurrentUser(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        setCurrentUser(null);
        navigate("/homepage", { replace: true });
    };

    const handleSubjectClick = (subject) => {
        navigate(`/subject/${subject.toLowerCase().replace(/\s+/g, '-')}`);
        setShowSubjectDropdown(false);
    };

    return (
        <header style={{
            backgroundColor: colors.primary,
            color: colors.white,
            padding: `${spacing.md} ${spacing.xl}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: shadows.md,
            position: "sticky",
            top: 0,
            zIndex: 1000
        }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                <Link to="/homepage" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: colors.secondary,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: typography.fontWeight.bold,
                        fontSize: typography.fontSize.lg,
                        cursor: "pointer",
                        transition: "transform 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                    onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                    >
                        SP
                    </div>
                </Link>
                <Link to="/homepage" style={{ textDecoration: "none", color: "inherit" }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: typography.fontSize["2xl"],
                        fontWeight: typography.fontWeight.bold,
                        cursor: "pointer"
                    }}>
                        SciencePioneers
                    </h1>
                </Link>
            </div>

            {/* Navigation */}
            <nav style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                {/* Home Button (if requested) */}
                {showHomeButton && (
                    <Link to="/homepage" style={{ 
                        color: colors.white, 
                        textDecoration: "none", 
                        fontWeight: typography.fontWeight.medium,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderRadius: "6px",
                        transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        🏠 Home
                    </Link>
                )}

                {/* Feed Link */}
                <Link to="/feed" style={{ 
                    color: colors.white, 
                    textDecoration: "none", 
                    fontWeight: typography.fontWeight.medium,
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: "6px",
                    transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                    Feed
                </Link>

                {/* Subject Dropdown */}
                <div style={{ position: "relative" }}>
                    <button
                        onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                        style={{
                            backgroundColor: "transparent",
                            color: colors.white,
                            border: "none",
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: typography.fontWeight.medium,
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        Subject
                        <span style={{ fontSize: typography.fontSize.xs }}>▼</span>
                    </button>
                    
                    {showSubjectDropdown && (
                        <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.gray[300]}`,
                            borderRadius: "6px",
                            boxShadow: shadows.lg,
                            zIndex: 1000,
                            minWidth: "200px",
                            marginTop: spacing.xs
                        }}>
                            {subjects.map((subject) => (
                                <button
                                    key={subject}
                                    onClick={() => handleSubjectClick(subject)}
                                    style={{
                                        width: "100%",
                                        padding: `${spacing.md} ${spacing.md}`,
                                        border: "none",
                                        backgroundColor: "transparent",
                                        color: colors.dark,
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: typography.fontSize.base,
                                        transition: "background-color 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                >
                                    {subject}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Forums Link */}
                <Link to="/forums" style={{ 
                    color: colors.white, 
                    textDecoration: "none", 
                    fontWeight: typography.fontWeight.medium,
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: "6px",
                    transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                    Forums
                </Link>

                {/* Authentication Section */}
                {!currentUser ? (
                    <div style={{ display: "flex", gap: spacing.sm }}>
                        <Link to="/login" style={{ 
                            color: colors.white, 
                            textDecoration: "none", 
                            fontWeight: typography.fontWeight.medium,
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: "6px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            Login
                        </Link>
                        <Link to="/signup" style={{ 
                            backgroundColor: colors.accent,
                            color: colors.white, 
                            textDecoration: "none", 
                            fontWeight: typography.fontWeight.medium,
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: "6px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#218838"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = colors.accent}
                        >
                            Signup
                        </Link>
                    </div>
                ) : (
                    /* User Dropdown */
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: spacing.sm,
                                backgroundColor: "transparent",
                                border: "none",
                                color: colors.white,
                                cursor: "pointer",
                                padding: `${spacing.sm} ${spacing.md}`,
                                borderRadius: "6px",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            {currentUser.profile_picture ? (
                                <img
                                    src={`http://127.0.0.1:8000/auth/serve-image/${currentUser.profile_picture}`}
                                    alt="Profile"
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        objectFit: "cover"
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: "32px",
                                    height: "32px",
                                    backgroundColor: colors.secondary,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.bold
                                }}>
                                    {currentUser.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium }}>
                                {currentUser.username}
                            </span>
                            <span style={{ fontSize: typography.fontSize.xs }}>▼</span>
                        </button>

                        {showUserDropdown && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                backgroundColor: colors.white,
                                border: `1px solid ${colors.gray[300]}`,
                                borderRadius: "6px",
                                boxShadow: shadows.lg,
                                zIndex: 1000,
                                minWidth: "200px",
                                marginTop: spacing.xs
                            }}>
                                <Link to="/profile" style={{ textDecoration: "none" }}>
                                    <div style={{
                                        padding: `${spacing.md} ${spacing.md}`,
                                        color: colors.dark,
                                        cursor: "pointer",
                                        transition: "background-color 0.2s",
                                        borderBottom: `1px solid ${colors.gray[200]}`
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                    My Profile
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        width: "100%",
                                        padding: `${spacing.md} ${spacing.md}`,
                                        border: "none",
                                        backgroundColor: "transparent",
                                        color: colors.danger,
                                        cursor: "pointer",
                                        fontSize: typography.fontSize.base,
                                        transition: "background-color 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </nav>
        </header>
    );
}

export default Header;

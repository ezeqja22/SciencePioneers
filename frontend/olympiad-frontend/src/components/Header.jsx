import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { colors, spacing, typography, shadows, borderRadius } from "../designSystem";
import { getUserInitial } from "../utils";
import NotificationBell from "./NotificationBell";

function Header({ showHomeButton = false }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [myForums, setMyForums] = useState([]);
    const [loadingForums, setLoadingForums] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
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

    useEffect(() => {
        // Handle responsive behavior
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        handleResize(); // Set initial value
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
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

    const fetchMyForums = async () => {
        if (!currentUser) return;
        
        setLoadingForums(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://127.0.0.1:8000/auth/forums/my-forums", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyForums(response.data);
        } catch (error) {
            console.error("Error fetching my forums:", error);
            setMyForums([]);
        } finally {
            setLoadingForums(false);
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

    const handleHamburgerClick = () => {
        if (!showHamburgerMenu) {
            fetchMyForums();
        }
        setShowHamburgerMenu(!showHamburgerMenu);
    };

    const handleForumClick = (forumId) => {
        navigate(`/forum/${forumId}`);
        setShowHamburgerMenu(false);
    };

    const handleMenuClose = () => {
        setShowHamburgerMenu(false);
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
            {/* Logo and Hamburger Menu */}
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                {/* Hamburger Menu Button */}
                {currentUser && (
                    <button
                        onClick={handleHamburgerClick}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: colors.white,
                            cursor: "pointer",
                            padding: spacing.sm,
                            borderRadius: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        <div style={{
                            width: "20px",
                            height: "2px",
                            backgroundColor: colors.white,
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "20px",
                            height: "2px",
                            backgroundColor: colors.white,
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "20px",
                            height: "2px",
                            backgroundColor: colors.white,
                            transition: "all 0.3s ease"
                        }} />
                    </button>
                )}
                
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
                    /* Authenticated User Section */
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                        {/* Notification Bell */}
                        <NotificationBell />
                        
                        {/* User Dropdown */}
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
                                    {getUserInitial(currentUser.username)}
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
                                <Link to="/settings" style={{ textDecoration: "none" }}>
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
                                    ⚙️ Settings
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
                    </div>
                )}
            </nav>
            
            {/* Hamburger Menu Overlay */}
            {showHamburgerMenu && (
                <div
                    onClick={handleMenuClose}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: 999
                    }}
                />
            )}
            
            {/* Sliding Menu */}
            <div style={{
                position: "fixed",
                top: 0,
                left: showHamburgerMenu ? "0" : (isMobile ? "-100%" : "-100%"),
                width: isMobile ? "100%" : "25%",
                height: "100vh",
                backgroundColor: colors.white,
                boxShadow: shadows.xl,
                zIndex: 1000,
                transition: "left 0.3s ease-in-out",
                overflowY: "auto",
                padding: spacing.lg
            }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: spacing.lg,
                    paddingBottom: spacing.md,
                    borderBottom: `1px solid ${colors.gray[200]}`
                }}>
                    <button
                        onClick={handleMenuClose}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: colors.gray[600],
                            cursor: "pointer",
                            padding: spacing.sm,
                            borderRadius: borderRadius.sm,
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: colors.gray[600],
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: colors.gray[600],
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: colors.gray[600],
                            transition: "all 0.3s ease"
                        }} />
                    </button>
                    <h3 style={{
                        margin: 0,
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.dark
                    }}>
                        My Forums
                    </h3>
                </div>
                
                {loadingForums ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: spacing.xl,
                        color: colors.gray[500]
                    }}>
                        Loading forums...
                    </div>
                ) : myForums.length === 0 ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: spacing.xl,
                        color: colors.gray[500],
                        textAlign: "center"
                    }}>
                        No forums found.<br />
                        Join or create a forum to see it here.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
                        {myForums.map((forum) => (
                            <button
                                key={forum.id}
                                onClick={() => handleForumClick(forum.id)}
                                style={{
                                    width: "100%",
                                    padding: spacing.md,
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: borderRadius.md,
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: typography.fontSize.base,
                                    color: colors.dark,
                                    transition: "background-color 0.2s",
                                    borderBottom: `1px solid ${colors.gray[100]}`
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[50]}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                                <div style={{
                                    fontWeight: typography.fontWeight.medium,
                                    marginBottom: spacing.xs
                                }}>
                                    {forum.title}
                                </div>
                                {forum.description && (
                                    <div style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.gray[600],
                                        lineHeight: 1.4
                                    }}>
                                        {forum.description.length > 60 
                                            ? `${forum.description.substring(0, 60)}...` 
                                            : forum.description
                                        }
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;

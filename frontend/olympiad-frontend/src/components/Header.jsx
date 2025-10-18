import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { colors, spacing, typography, shadows, borderRadius } from "../designSystem";
import { getUserInitial } from "../utils";
import NotificationBell from "./NotificationBell";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { useFeatureSettings } from "../hooks/useFeatureSettings";

function Header({ showHomeButton = false }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [myForums, setMyForums] = useState([]);
    const [loadingForums, setLoadingForums] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [pinnedForums, setPinnedForums] = useState([]);
    const navigate = useNavigate();
    
    // Site settings
    const { siteSettings, loading: settingsLoading } = useSiteSettings();
    
    // Feature settings
    const { checkFeatureEnabled, showFeatureDisabledAlert } = useFeatureSettings();
    
    // Update document title, favicon, and theme when site settings change
    useEffect(() => {
        if (siteSettings.site_name) {
            document.title = siteSettings.site_name;
        }
        
        if (siteSettings.site_favicon) {
            // Update favicon
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = siteSettings.site_favicon;
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        
        // Apply theme
        if (siteSettings.site_theme) {
            document.documentElement.setAttribute('data-theme', siteSettings.site_theme);
            document.body.className = `theme-${siteSettings.site_theme}`;
        }
    }, [siteSettings.site_name, siteSettings.site_favicon, siteSettings.site_theme]);

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
        
        // Load pinned forums from localStorage
        const savedPinnedForums = localStorage.getItem('pinnedForums');
        if (savedPinnedForums) {
            setPinnedForums(JSON.parse(savedPinnedForums));
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
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
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
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/my-forums`, {
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
        // Check if forums are enabled
        if (!checkFeatureEnabled('forums_enabled')) {
            showFeatureDisabledAlert('Forums');
            return;
        }
        navigate(`/forum/${forumId}`);
        setShowHamburgerMenu(false);
    };

    const handleMenuClose = () => {
        setShowHamburgerMenu(false);
    };

    const handlePinToggle = (forumId, e) => {
        e.stopPropagation(); // Prevent forum click
        
        setPinnedForums(prev => {
            const isPinned = prev.includes(forumId);
            let newPinnedForums;
            
            if (isPinned) {
                // Unpin the forum
                newPinnedForums = prev.filter(id => id !== forumId);
            } else {
                // Pin the forum
                newPinnedForums = [...prev, forumId];
            }
            
            // Save to localStorage
            localStorage.setItem('pinnedForums', JSON.stringify(newPinnedForums));
            return newPinnedForums;
        });
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
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                        {/* Site Logo */}
                        {siteSettings.site_logo && (
                            <img 
                                src={siteSettings.site_logo} 
                                alt={siteSettings.site_name}
                                style={{
                                    height: "32px",
                                    width: "auto",
                                    maxWidth: "200px",
                                    objectFit: "contain"
                                }}
                                onError={(e) => {
                                    console.error('Failed to load site logo:', siteSettings.site_logo);
                                    e.target.style.display = 'none';
                                }}
                            />
                        )}
                        
                        {/* Site Name */}
                        <h1 style={{
                            margin: 0,
                            fontSize: typography.fontSize["2xl"],
                            fontWeight: typography.fontWeight.bold,
                            cursor: "pointer"
                        }}>
                            {siteSettings.site_name || 'SciencePioneers'}
                        </h1>
                    </div>
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
                        Home
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
                <span 
                    onClick={() => {
                        if (checkFeatureEnabled('forums_enabled')) {
                            navigate('/forums');
                        } else {
                            showFeatureDisabledAlert('Forums');
                        }
                    }}
                    style={{ 
                        color: colors.white, 
                        textDecoration: "none", 
                        fontWeight: typography.fontWeight.medium,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderRadius: "6px",
                        transition: "background-color 0.2s",
                        cursor: "pointer"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                    Forums
                </span>

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
                        <span 
                            onClick={() => {
                                if (checkFeatureEnabled('registration_enabled')) {
                                    navigate('/signup');
                                } else {
                                    showFeatureDisabledAlert('Registration');
                                }
                            }}
                            style={{ 
                                backgroundColor: colors.accent,
                                color: colors.white, 
                                textDecoration: "none", 
                                fontWeight: typography.fontWeight.medium,
                                padding: `${spacing.sm} ${spacing.md}`,
                                borderRadius: "6px",
                                transition: "background-color 0.2s",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#218838"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = colors.accent}
                        >
                            Signup
                        </span>
                    </div>
                ) : (
                    /* Authenticated User Section */
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                        {/* Notification Bell */}
                        <NotificationBell />
                        
                        {/* Removed WebSocket Status Indicator */}
                        
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
                                    src={currentUser.profile_picture}
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
                                    Settings
                                    </div>
                                </Link>
                                {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                                    <Link to="/admin" style={{ textDecoration: "none" }}>
                                        <div style={{
                                            padding: `${spacing.md} ${spacing.md}`,
                                            color: colors.primary,
                                            cursor: "pointer",
                                            transition: "background-color 0.2s",
                                            borderBottom: `1px solid ${colors.gray[200]}`,
                                            fontWeight: typography.fontWeight.medium
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                        Admin Panel
                                        </div>
                                    </Link>
                                )}
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
                {checkFeatureEnabled('forums_enabled') ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: spacing.lg,
                        paddingBottom: spacing.md,
                        borderBottom: `1px solid ${colors.gray[200]}`,
                        backgroundColor: colors.primary,
                        margin: `-${spacing.lg} -${spacing.lg} ${spacing.lg} -${spacing.lg}`,
                        padding: spacing.lg,
                        borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
                        position: "relative"
                    }}>
                        <button
                            onClick={handleMenuClose}
                            style={{
                                backgroundColor: "transparent",
                                border: "none",
                                color: colors.white,
                                cursor: "pointer",
                                padding: spacing.sm,
                                borderRadius: borderRadius.sm,
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                transition: "background-color 0.2s",
                                position: "absolute",
                                left: spacing.lg
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: colors.white,
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: colors.white,
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: colors.white,
                                transition: "all 0.3s ease"
                            }} />
                        </button>
                        <h3 style={{
                            margin: 0,
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.bold,
                            color: colors.white
                        }}>
                            My Forums
                        </h3>
                    </div>
                ) : (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: spacing.lg,
                        paddingBottom: spacing.md,
                        borderBottom: `1px solid ${colors.gray[200]}`,
                        backgroundColor: colors.primary,
                        margin: `-${spacing.lg} -${spacing.lg} ${spacing.lg} -${spacing.lg}`,
                        padding: spacing.lg,
                        borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
                        position: "relative"
                    }}>
                        <button
                            onClick={handleMenuClose}
                            style={{
                                backgroundColor: "transparent",
                                border: "none",
                                color: colors.white,
                                cursor: "pointer",
                                padding: spacing.sm,
                                borderRadius: borderRadius.sm,
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                transition: "background-color 0.2s",
                                position: "absolute",
                                left: spacing.lg
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: colors.white,
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: colors.white,
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: colors.white,
                                transition: "all 0.3s ease"
                            }} />
                        </button>
                        <h3 style={{
                            margin: 0,
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.bold,
                            color: colors.white
                        }}>
                            Forums Disabled
                        </h3>
                    </div>
                )}
                
                {checkFeatureEnabled('forums_enabled') && (
                    <>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {myForums
                            .sort((a, b) => {
                                const aPinned = pinnedForums.includes(a.id);
                                const bPinned = pinnedForums.includes(b.id);
                                
                                if (aPinned && !bPinned) return -1;
                                if (!aPinned && bPinned) return 1;
                                return 0;
                            })
                            .map((forum) => {
                            // Get icon based on subject
                            const getForumIcon = (subject) => {
                                const subjectLower = subject?.toLowerCase() || '';
                                if (subjectLower.includes('biology') || subjectLower.includes('chemistry')) return '🔬';
                                if (subjectLower.includes('mathematics') || subjectLower.includes('math')) return '📐';
                                if (subjectLower.includes('physics')) return '⚛️';
                                if (subjectLower.includes('computer') || subjectLower.includes('engineering')) return '💻';
                                if (subjectLower.includes('education') || subjectLower.includes('academic')) return '🏫';
                                return '📚';
                            };

                            return (
                                <button
                                    key={forum.id}
                                    onClick={() => handleForumClick(forum.id)}
                                    style={{
                                        width: "100%",
                                        padding: spacing.md,
                                        backgroundColor: "transparent",
                                        border: "none",
                                        borderRadius: borderRadius.lg,
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: typography.fontSize.base,
                                        color: colors.dark,
                                        transition: "all 0.2s ease",
                                        borderBottom: `1px solid ${colors.gray[100]}`,
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: spacing.sm,
                                        position: "relative",
                                        overflow: "hidden"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = "#e8f5e8";
                                        e.target.style.transform = "scale(1.02)";
                                        e.target.style.boxShadow = "0 4px 12px rgba(26, 77, 58, 0.15)";
                                        e.target.style.borderColor = colors.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = "transparent";
                                        e.target.style.transform = "scale(1)";
                                        e.target.style.boxShadow = "none";
                                        e.target.style.borderColor = colors.gray[100];
                                    }}
                                >
                                    {/* Forum Icon */}
                                    <div style={{
                                        fontSize: "20px",
                                        marginTop: "2px",
                                        flexShrink: 0,
                                        pointerEvents: "none"
                                    }}>
                                        {getForumIcon(forum.subject)}
                                    </div>
                                    
                                    {/* Forum Content */}
                                    <div style={{ 
                                        flex: 1, 
                                        minWidth: 0,
                                        pointerEvents: "none"
                                    }}>
                                        <div style={{
                                            fontWeight: typography.fontWeight.semibold,
                                            marginBottom: spacing.xs,
                                            fontSize: typography.fontSize.base,
                                            color: colors.dark,
                                            lineHeight: 1.3
                                        }}>
                                            {forum.title}
                                        </div>
                                        {forum.description && (
                                            <div style={{
                                                fontSize: typography.fontSize.sm,
                                                color: colors.gray[600],
                                                lineHeight: 1.4,
                                                marginBottom: spacing.xs
                                            }}>
                                                {forum.description.length > 50 
                                                    ? `${forum.description.substring(0, 50)}...` 
                                                    : forum.description
                                                }
                                            </div>
                                        )}
                                        
                                        {/* Subject Badge */}
                                        {forum.subject && (
                                            <div style={{
                                                display: "inline-block",
                                                backgroundColor: colors.primary + "20",
                                                color: colors.primary,
                                                padding: `${spacing.xs} ${spacing.sm}`,
                                                borderRadius: borderRadius.sm,
                                                fontSize: typography.fontSize.xs,
                                                fontWeight: typography.fontWeight.medium,
                                                marginTop: spacing.xs
                                            }}>
                                                {forum.subject}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Pin Button/Icon */}
                                    {pinnedForums.includes(forum.id) ? (
                                        // Pinned: Show pushpin emoji
                                        <button
                                            onClick={(e) => handlePinToggle(forum.id, e)}
                                            style={{
                                                backgroundColor: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                padding: spacing.xs,
                                                borderRadius: borderRadius.sm,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "16px",
                                                color: colors.primary,
                                                transition: "all 0.2s ease",
                                                flexShrink: 0,
                                                marginTop: "2px"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = colors.gray[100];
                                                e.target.style.transform = "scale(1.1)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = "transparent";
                                                e.target.style.transform = "scale(1)";
                                            }}
                                            title="Unpin forum"
                                        >
                                            📌
                                        </button>
                                    ) : (
                                        // Unpinned: Show "Pin" button
                                        <button
                                            onClick={(e) => handlePinToggle(forum.id, e)}
                                            style={{
                                                backgroundColor: "transparent",
                                                border: `1px solid ${colors.gray[300]}`,
                                                cursor: "pointer",
                                                padding: `${spacing.xs} ${spacing.sm}`,
                                                borderRadius: borderRadius.sm,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: typography.fontSize.xs,
                                                fontWeight: typography.fontWeight.medium,
                                                color: colors.gray[500],
                                                transition: "all 0.2s ease",
                                                flexShrink: 0,
                                                marginTop: "2px",
                                                minWidth: "40px",
                                                height: "24px"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = colors.gray[100];
                                                e.target.style.borderColor = colors.primary;
                                                e.target.style.color = colors.primary;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = "transparent";
                                                e.target.style.borderColor = colors.gray[300];
                                                e.target.style.color = colors.gray[500];
                                            }}
                                            title="Pin forum"
                                        >
                                            Pin
                                        </button>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
                    </>
                )}
            </div>
        </header>
    );
}

export default Header;

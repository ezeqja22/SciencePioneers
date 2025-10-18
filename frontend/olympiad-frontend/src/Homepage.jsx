import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { colors } from "./designSystem";
import { getUserInitial } from "./utils";
import NotificationBell from "./components/NotificationBell";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { useFeatureSettings } from "./hooks/useFeatureSettings";

function Homepage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [myForums, setMyForums] = useState([]);
    const [loadingForums, setLoadingForums] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [pinnedForums, setPinnedForums] = useState(() => {
        const saved = localStorage.getItem('pinnedForums');
        return saved ? JSON.parse(saved) : [];
    });
    const navigate = useNavigate();
    
    // Site settings
    const { siteSettings, loading: settingsLoading, error: settingsError } = useSiteSettings();
    
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

    // Show notifications disabled alert only once after login
    useEffect(() => {
        if (currentUser && !settingsLoading) {
            // Check if we've already shown the notification alert for this session
            const notificationAlertShown = sessionStorage.getItem('notificationAlertShown');
            if (!notificationAlertShown && !checkFeatureEnabled('notifications_enabled')) {
                setTimeout(() => {
                    alert('Notifications are temporarily disabled');
                    sessionStorage.setItem('notificationAlertShown', 'true');
                }, 1000);
            }
        }
    }, [currentUser, settingsLoading, checkFeatureEnabled]);

    // Actual subjects from the system
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
        // Check if user is authenticated, but don't redirect
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
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
            // Don't redirect on error, just clear the user state
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

    const togglePin = (forumId) => {
        const newPinnedForums = pinnedForums.includes(forumId)
            ? pinnedForums.filter(id => id !== forumId)
            : [...pinnedForums, forumId];
        
        setPinnedForums(newPinnedForums);
        localStorage.setItem('pinnedForums', JSON.stringify(newPinnedForums));
    };

    const getSortedForums = () => {
        const pinned = myForums.filter(forum => pinnedForums.includes(forum.id));
        const unpinned = myForums.filter(forum => !pinnedForums.includes(forum.id));
        return [...pinned, ...unpinned];
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

    return (
        <div style={{ 
            minHeight: "100vh", 
            backgroundColor: "#f8f9fa",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: "#1a4d3a", // Dark green
                color: "white",
                padding: "1rem 2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}>
                {/* Logo and Hamburger Menu */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Hamburger Menu Button */}
                    {currentUser && (
                        <button
                            onClick={handleHamburgerClick}
                            style={{
                                backgroundColor: "transparent",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                padding: "8px",
                                borderRadius: "4px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            <div style={{
                                width: "20px",
                                height: "2px",
                                backgroundColor: "white",
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "20px",
                                height: "2px",
                                backgroundColor: "white",
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "20px",
                                height: "2px",
                                backgroundColor: "white",
                                transition: "all 0.3s ease"
                            }} />
                        </button>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Site Logo */}
                        {siteSettings.site_logo && (
                            <img 
                                src={siteSettings.site_logo} 
                                alt={siteSettings.site_name}
                                style={{
                                    height: "28px",
                                    width: "auto",
                                    maxWidth: "150px",
                                    objectFit: "contain"
                                }}
                                onError={(e) => {
                                    console.error('Failed to load site logo:', siteSettings.site_logo);
                                    e.target.style.display = 'none';
                                }}
                            />
                        )}
                        
                        {/* Site Name */}
                        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
                            {siteSettings.site_name || 'Olimpiada'}
                        </h1>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                    <Link to="/feed" style={{ 
                        color: "white", 
                        textDecoration: "none", 
                        fontWeight: "500",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#2d7a5f"}
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
                                color: "white",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#2d7a5f"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            Subject
                            <span style={{ fontSize: "12px" }}>▼</span>
                        </button>
                        
                        {showSubjectDropdown && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                left: "0",
                                backgroundColor: "white",
                                border: "1px solid #e9ecef",
                                borderRadius: "8px",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                zIndex: 1000,
                                minWidth: "200px",
                                marginTop: "5px"
                            }}>
                                {subjects.map((subject) => (
                                    <button
                                        key={subject}
                                        onClick={() => handleSubjectClick(subject)}
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            border: "none",
                                            backgroundColor: "transparent",
                                            color: "#333",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            transition: "background-color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                        {subject}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link to="/forums" style={{ 
                        color: "white", 
                        textDecoration: "none", 
                        fontWeight: "500",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#2d7a5f"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        Forums
                    </Link>

                    {/* Authentication Buttons */}
                    {!currentUser ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Link to="/login" style={{ 
                                color: "white", 
                                textDecoration: "none", 
                                fontWeight: "500",
                                padding: "8px 16px",
                                borderRadius: "6px",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#2d7a5f"}
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
                                    backgroundColor: "#28a745",
                                    color: "white", 
                                    textDecoration: "none", 
                                    fontWeight: "500",
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    transition: "background-color 0.2s",
                                    cursor: "pointer"
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#218838"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#28a745"}
                            >
                                Signup
                            </span>
                        </div>
                    ) : (
                        /* Authenticated User Section */
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {/* Notification Bell */}
                            <NotificationBell />
                            
                            {/* User Dropdown */}
                            <div style={{ position: "relative" }}>
                            <button
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    transition: "background-color 0.2s"
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#2d7a5f"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                                <div style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    backgroundColor: colors.secondary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    backgroundImage: currentUser.profile_picture ? 
                                        `url(${currentUser.profile_picture})` : "none",
                                    backgroundSize: "cover",
                                    backgroundPosition: "center"
                                }}>
                                    {!currentUser.profile_picture && getUserInitial(currentUser.username)}
                                </div>
                                <span style={{ fontSize: "14px", fontWeight: "500" }}>
                                    {currentUser.username}
                                </span>
                                <span style={{ fontSize: "12px" }}>▼</span>
                            </button>

                            {showUserDropdown && (
                                <div style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: "0",
                                    backgroundColor: "white",
                                    border: "1px solid #e9ecef",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                    zIndex: 1000,
                                    minWidth: "160px",
                                    marginTop: "5px"
                                }}>
                                    <Link to="/profile" style={{ textDecoration: "none" }}>
                                        <button style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            border: "none",
                                            backgroundColor: "transparent",
                                            color: "#333",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            transition: "background-color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                            My Profile
                                        </button>
                                    </Link>
                                    <Link to="/settings" style={{ textDecoration: "none" }}>
                                        <button style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            border: "none",
                                            backgroundColor: "transparent",
                                            color: "#333",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            transition: "background-color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                             Settings
                                        </button>
                                    </Link>
                                    {/* Admin Panel Link - Only show for admins and moderators */}
                                    {currentUser && ['admin', 'moderator'].includes(currentUser.role) && (
                                        <Link to="/admin" style={{ textDecoration: "none" }}>
                                            <button style={{
                                                width: "100%",
                                                padding: "12px 16px",
                                                border: "none",
                                                backgroundColor: "transparent",
                                                color: "#667eea",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontWeight: "500",
                                                transition: "background-color 0.2s"
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                                 Admin Panel
                                            </button>
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            border: "none",
                                            backgroundColor: "transparent",
                                            color: "#dc3545",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            transition: "background-color 0.2s",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                        <img
                                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760802149/LOG_OUT_RED_d1wwc3.svg"
                                            alt="Logout"
                                            style={{
                                                height: "16px",
                                                width: "16px",
                                                objectFit: "contain"
                                            }}
                                        />
                                        Logout
                                    </button>
                                </div>
                            )}
                            </div>
                        </div>
                    )}
                </nav>
            </header>

            {/* Main Content */}
            <main style={{ padding: "0" }}>
                {/* Hero Section */}
                <section style={{
                    backgroundColor: "#1a4d3a",
                    color: "white",
                    padding: "4rem 2rem",
                    textAlign: "center",
                    background: "linear-gradient(135deg, #1a4d3a 0%, #2d7a5f 100%)"
                }}>
                    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                        <h1 style={{ 
                            fontSize: "3rem", 
                            fontWeight: "700", 
                            marginBottom: "1.5rem",
                            lineHeight: "1.2"
                        }}>
                            Welcome to {siteSettings.site_name || 'Olimpiada'}
                        </h1>
                        <p style={{ 
                            fontSize: "1.25rem", 
                            marginBottom: "2rem", 
                            opacity: "0.9",
                            lineHeight: "1.6"
                        }}>
                            {siteSettings.site_description || "Master the art of problem-solving through challenging olympiad problems. Join a community of passionate learners and sharpen your analytical skills."}
                        </p>
                        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <Link to="/feed">
                                <button style={{
                                    backgroundColor: "rgba(118, 75, 162)",
                                    color: "white",
                                    border: "2px solid white",
                                    padding: "12px 24px",
                                    borderRadius: "8px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    minWidth: "140px",
                                    height: "48px"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "rgba(118, 75, 162)";
                                    e.target.style.transform = "translateY(-2px)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "rgba(118, 75, 162)";
                                    e.target.style.transform = "translateY(0)";
                                }}
                                >
                                    Explore Problems
                                </button>
                            </Link>
                            <Link to="/create-problem?from=/homepage">
                                <button style={{
                                    backgroundColor: "transparent",
                                    color: "white",
                                    border: "2px solid white",
                                    padding: "12px 24px",
                                    borderRadius: "8px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    minWidth: "140px",
                                    height: "48px"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = "translateY(-2px)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                }}
                                >
                                    Create Problem
                                </button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section style={{ 
                    padding: "4rem 2rem", 
                    backgroundColor: "white",
                    maxWidth: "1200px",
                    margin: "0 auto"
                }}>
                    <h2 style={{ 
                        textAlign: "center", 
                        fontSize: "2.5rem", 
                        fontWeight: "600", 
                        marginBottom: "3rem",
                        color: "#1a4d3a"
                    }}>
                        Why Choose {siteSettings.site_name || 'Olimpiada'}?
                    </h2>
                    <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
                        gap: "2rem" 
                    }}>
                        <div style={{ 
                            textAlign: "center", 
                            padding: "2rem",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef"
                        }}>
                            <div style={{
                                fontSize: "3rem",
                                marginBottom: "1rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <img 
                                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811441/numratore_xpudpv.svg"
                                    style={{
                                        height: "3rem",
                                        width: "3rem",
                                        objectFit: "contain"
                                    }}
                                />
                            </div>
                            <h3 style={{ 
                                fontSize: "1.5rem", 
                                fontWeight: "600", 
                                marginBottom: "1rem",
                                color: "#1a4d3a"
                            }}>
                                Mathematical Excellence
                            </h3>
                            <p style={{ 
                                color: "#666", 
                                lineHeight: "1.6",
                                fontSize: "1rem"
                            }}>
                                Solve complex mathematical problems with our advanced LaTeX rendering 
                                and visual math editor tools.
                            </p>
                        </div>
                        
                        <div style={{ 
                            textAlign: "center", 
                            padding: "2rem",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef"
                        }}>
                            <div style={{
                                fontSize: "3rem",
                                marginBottom: "1rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <img 
                                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760812222/Comunity_lejla_1_kpxiv0.svg"
                                    style={{
                                        height: "3rem",
                                        width: "3rem",
                                        objectFit: "contain"
                                    }}
                                />
                            </div>
                            <h3 style={{ 
                                fontSize: "1.5rem", 
                                fontWeight: "600", 
                                marginBottom: "1rem",
                                color: "#1a4d3a"
                            }}>
                                Community Learning
                            </h3>
                            <p style={{ 
                                color: "#666", 
                                lineHeight: "1.6",
                                fontSize: "1rem"
                            }}>
                                Connect with fellow problem-solvers, share solutions, and learn 
                                from the community's collective knowledge.
                            </p>
                        </div>
                        
                        <div style={{ 
                            textAlign: "center", 
                            padding: "2rem",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef"
                        }}>
                            <div style={{
                                fontSize: "3rem",
                                marginBottom: "1rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <img 
                                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811741/trofeu_px38ap.svg"
                                    style={{
                                        height: "3rem",
                                        width: "3rem",
                                        objectFit: "contain"
                                    }}
                                />
                            </div>
                            <h3 style={{ 
                                fontSize: "1.5rem", 
                                fontWeight: "600", 
                                marginBottom: "1rem",
                                color: "#1a4d3a"
                            }}>
                                Olympiad Focus
                            </h3>
                            <p style={{ 
                                color: "#666", 
                                lineHeight: "1.6",
                                fontSize: "1rem"
                            }}>
                                Practice with olympiad-style problems across multiple subjects 
                                and difficulty levels to prepare for competitions.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Click outside to close dropdowns */}
            {(showSubjectDropdown || showUserDropdown) && (
                <div 
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                    onClick={() => {
                        setShowSubjectDropdown(false);
                        setShowUserDropdown(false);
                    }}
                />
            )}
            
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
                backgroundColor: "white",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                zIndex: 1000,
                transition: "left 0.3s ease-in-out",
                overflowY: "auto",
                padding: "1.5rem"
            }}>
                {checkFeatureEnabled('forums_enabled') ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                        paddingBottom: "0.75rem",
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: "#1a4d3a",
                        margin: "-1.5rem -1.5rem 1.5rem -1.5rem",
                        padding: "1.5rem",
                        borderRadius: "12px 12px 0 0",
                        position: "relative"
                    }}>
                    <button
                        onClick={handleMenuClose}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            padding: "8px",
                            borderRadius: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                            transition: "background-color 0.2s",
                            position: "absolute",
                            left: "1.5rem"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: "white",
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: "white",
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: "white",
                            transition: "all 0.3s ease"
                        }} />
                    </button>
                    <h3 style={{
                        margin: 0,
                        fontSize: "1.125rem",
                        fontWeight: "bold",
                        color: "white"
                    }}>
                        My Forums
                    </h3>
                </div>
                ) : (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                        paddingBottom: "0.75rem",
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: "#1a4d3a",
                        margin: "-1.5rem -1.5rem 1.5rem -1.5rem",
                        padding: "1.5rem",
                        borderRadius: "12px 12px 0 0",
                        position: "relative"
                    }}>
                        <button
                            onClick={handleMenuClose}
                            style={{
                                backgroundColor: "transparent",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                padding: "8px",
                                borderRadius: "4px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                transition: "background-color 0.2s",
                                position: "absolute",
                                left: "1.5rem"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: "white",
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: "white",
                                transition: "all 0.3s ease"
                            }} />
                            <div style={{
                                width: "16px",
                                height: "2px",
                                backgroundColor: "white",
                                transition: "all 0.3s ease"
                            }} />
                        </button>
                        <h3 style={{
                            margin: 0,
                            fontSize: "1.125rem",
                            fontWeight: "bold",
                            color: "white"
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
                        padding: "2rem",
                        color: "#6b7280"
                    }}>
                        Loading forums...
                    </div>
                ) : myForums.length === 0 ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "2rem",
                        color: "#6b7280",
                        textAlign: "center"
                    }}>
                        No forums found.<br />
                        Join or create a forum to see it here.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {getSortedForums().map((forum) => {
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
                                        padding: "16px",
                                        backgroundColor: "transparent",
                                        border: "none",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: "14px",
                                        color: "#1f2937",
                                        transition: "all 0.2s ease",
                                        borderBottom: "1px solid #f3f4f6",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        position: "relative",
                                        overflow: "hidden"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = "#e8f5e8";
                                        e.target.style.transform = "scale(1.02)";
                                        e.target.style.boxShadow = "0 4px 12px rgba(26, 77, 58, 0.15)";
                                        e.target.style.borderColor = "#1a4d3a";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = "transparent";
                                        e.target.style.transform = "scale(1)";
                                        e.target.style.boxShadow = "none";
                                        e.target.style.borderColor = "#f3f4f6";
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
                                            fontWeight: "600",
                                            marginBottom: "4px",
                                            fontSize: "14px",
                                            color: "#1f2937",
                                            lineHeight: 1.3
                                        }}>
                                            {forum.title}
                                        </div>
                                        {forum.description && (
                                            <div style={{
                                                fontSize: "12px",
                                                color: "#6b7280",
                                                lineHeight: 1.4,
                                                marginBottom: "8px"
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
                                                backgroundColor: "#1a4d3a20",
                                                color: "#1a4d3a",
                                                padding: "4px 8px",
                                                borderRadius: "6px",
                                                fontSize: "11px",
                                                fontWeight: "500",
                                                marginTop: "4px"
                                            }}>
                                                {forum.subject}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Pin Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePin(forum.id);
                                        }}
                                        style={{
                                            position: "absolute",
                                            right: "12px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: "4px",
                                            borderRadius: "4px",
                                            transition: "all 0.2s ease",
                                            fontSize: "14px",
                                            color: pinnedForums.includes(forum.id) ? "#1a4d3a" : "#9ca3af",
                                            pointerEvents: "auto"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = "#f3f4f6";
                                            e.target.style.color = "#1a4d3a";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = "transparent";
                                            e.target.style.color = pinnedForums.includes(forum.id) ? "#1a4d3a" : "#9ca3af";
                                        }}
                                    >
                                        {pinnedForums.includes(forum.id) ? (
                                            <img 
                                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811441/Pin_Icon_Green_ly3fxo.svg" 
                                                alt="Pin"
                                                style={{
                                                    height: "14px",
                                                    width: "14px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                        ) : "Pin"}
                                    </button>
                                </button>
                            );
                        })}
                    </div>
                )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Homepage;

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { colors } from "./designSystem";
import { getUserInitial } from "./utils";
import NotificationBell from "./components/NotificationBell";

function Homepage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [myForums, setMyForums] = useState([]);
    const [loadingForums, setLoadingForums] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();

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
            const response = await axios.get("http://127.0.0.1:8000/auth/me", {
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
                    <div style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#2d7a5f", // Lighter green
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        fontWeight: "bold"
                    }}>
                        SP
                    </div>
                    <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
                        SciencePioneers
                    </h1>
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
                            <Link to="/signup" style={{ 
                                backgroundColor: "#28a745",
                                color: "white", 
                                textDecoration: "none", 
                                fontWeight: "500",
                                padding: "8px 16px",
                                borderRadius: "6px",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#218838"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "#28a745"}
                            >
                                Signup
                            </Link>
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
                                        `url(http://127.0.0.1:8000/auth/serve-image/${currentUser.profile_picture.split('/').pop()})` : "none",
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
                                            ⚙️ Settings
                                        </button>
                                    </Link>
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
                                            transition: "background-color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
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
                            Welcome to SciencePioneers
                        </h1>
                        <p style={{ 
                            fontSize: "1.25rem", 
                            marginBottom: "2rem", 
                            opacity: "0.9",
                            lineHeight: "1.6"
                        }}>
                            Master the art of problem-solving through challenging olympiad problems. 
                            Join a community of passionate learners and sharpen your analytical skills.
                        </p>
                        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <Link to="/feed">
                                <button style={{
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    padding: "12px 24px",
                                    borderRadius: "8px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: "0 4px 15px rgba(40, 167, 69, 0.3)"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#218838";
                                    e.target.style.transform = "translateY(-2px)";
                                    e.target.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "#28a745";
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "0 4px 15px rgba(40, 167, 69, 0.3)";
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
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "white";
                                    e.target.style.color = "#1a4d3a";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "transparent";
                                    e.target.style.color = "white";
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
                        Why Choose SciencePioneers?
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
                                marginBottom: "1rem"
                            }}>🧮</div>
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
                                marginBottom: "1rem"
                            }}>👥</div>
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
                                marginBottom: "1rem"
                            }}>🏆</div>
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
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                    paddingBottom: "0.75rem",
                    borderBottom: "1px solid #e5e7eb"
                }}>
                    <button
                        onClick={handleMenuClose}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#6b7280",
                            cursor: "pointer",
                            padding: "8px",
                            borderRadius: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: "#6b7280",
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: "#6b7280",
                            transition: "all 0.3s ease"
                        }} />
                        <div style={{
                            width: "16px",
                            height: "2px",
                            backgroundColor: "#6b7280",
                            transition: "all 0.3s ease"
                        }} />
                    </button>
                    <h3 style={{
                        margin: 0,
                        fontSize: "1.125rem",
                        fontWeight: "bold",
                        color: "#1f2937"
                    }}>
                        My Forums
                    </h3>
                </div>
                
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
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {myForums.map((forum) => (
                            <button
                                key={forum.id}
                                onClick={() => handleForumClick(forum.id)}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "14px",
                                    color: "#1f2937",
                                    transition: "background-color 0.2s",
                                    borderBottom: "1px solid #f3f4f6"
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                                <div style={{
                                    fontWeight: "500",
                                    marginBottom: "4px"
                                }}>
                                    {forum.title}
                                </div>
                                {forum.description && (
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
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
        </div>
    );
}

export default Homepage;

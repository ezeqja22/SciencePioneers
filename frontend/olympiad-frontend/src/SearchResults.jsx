import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SearchBar from './SearchBar';
import Layout from './components/Layout';
import Card from './components/Card';
import Button from './components/Button';
import BackButton from './components/BackButton';
import FollowButton from './components/FollowButton';
import { colors, spacing, typography, borderRadius } from './designSystem';
import { getUserInitial, getDisplayName } from './utils';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render math content
const renderMathContent = (text) => {
    if (!text) return '';
    
    // Check if text contains LaTeX patterns or math symbols
    const latexPattern = /\\[a-zA-Z]+|\\[^a-zA-Z]|\$\$|\\\(|\\\)|\\\[|\\\]|\^|\_|\{|\}|\[|\]|∫|∑|∏|√|α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω|∞|±|∓|×|÷|≤|≥|≠|≈|≡|∈|∉|⊂|⊃|∪|∩|∅|∇|∂|∆|Ω|Φ|Ψ|Λ|Σ|Π|Θ|Ξ|Γ|Δ/;
    if (!latexPattern.test(text)) {
        return text;
    }
    
    try {
        // If text contains LaTeX, render it with InlineMath
        return <InlineMath math={text} />;
    } catch (error) {
        // If KaTeX fails, return plain text
        return text;
    }
};

const SearchResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchResults, setSearchResults] = useState({ users: [], problems: [] });
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [followStatus, setFollowStatus] = useState({});
    const [voteData, setVoteData] = useState({});
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'users', 'problems'
    
    // Get category from URL parameters
    const category = new URLSearchParams(location.search).get('category') || 'all';
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [searchInput, setSearchInput] = useState('');

    const query = new URLSearchParams(location.search).get('q') || '';
    
    // Extract all search parameters for advanced search
    const searchParams = new URLSearchParams(location.search);
    const subjects = searchParams.get('subjects') || '';
    const level = searchParams.get('level') || '';
    const year = searchParams.get('year') || '';
    const tags = searchParams.get('tags') || '';

    // Update search input when query changes
    useEffect(() => {
        setSearchInput(query);
    }, [query]);

    // Set active tab based on category parameter
    useEffect(() => {
        if (category === 'users') {
            setActiveTab('users');
        } else if (category === 'problems') {
            setActiveTab('problems');
        } else {
            setActiveTab('all');
        }
    }, [category]);

    useEffect(() => {
        // Always fetch results, even without query (for advanced search)
        fetchSearchResults();
        fetchCurrentUser();
    }, [query, currentPage, activeTab, subjects, level, year, tags]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    };

    const fetchSearchResults = async () => {
        // Allow search even without query for advanced filtering
        
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            
            // Check if we have advanced search parameters
            const urlParams = new URLSearchParams(location.search);
            const hasAdvancedParams = urlParams.get('subjects') || urlParams.get('level') || 
                                    urlParams.get('year') || urlParams.get('tags');
            
            let endpoint;
            if (hasAdvancedParams) {
                // Use advanced search endpoint
                const params = new URLSearchParams();
                if (query && query.trim()) params.append('q', query.trim());
                if (urlParams.get('category')) params.append('category', urlParams.get('category'));
                if (urlParams.get('subjects')) params.append('subjects', urlParams.get('subjects'));
                if (urlParams.get('level')) params.append('level', urlParams.get('level'));
                if (urlParams.get('year')) params.append('year', urlParams.get('year'));
                if (urlParams.get('tags')) params.append('tags', urlParams.get('tags'));
                params.append('page', currentPage);
                params.append('limit', '10');
                
                endpoint = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/search/advanced?${params.toString()}`;
            } else {
                // Use regular combined search
                endpoint = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/search/combined?q=${encodeURIComponent(query)}`;
            }

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });


            if (hasAdvancedParams) {
                // Advanced search results - always show problems
                setSearchResults(response.data);
                setTotalPages(response.data.total_pages || 1);
                setTotalResults(response.data.total_problems || 0);
                // Fetch vote data for problems
                if (response.data.problems && response.data.problems.length > 0) {
                    await fetchVoteData(response.data.problems);
                }
            } else if (activeTab === 'all' || (activeTab === 'users' && currentPage === 1) || (activeTab === 'problems' && currentPage === 1)) {
                // Use combined search results
                setSearchResults(response.data);
                setTotalPages(1); // Combined search doesn't use pagination
                setTotalResults((response.data.users ? response.data.users.length : 0) + (response.data.problems ? response.data.problems.length : 0));
                // Fetch vote data for problems
                if (response.data.problems && response.data.problems.length > 0) {
                    await fetchVoteData(response.data.problems);
                }
            } else {
                // Use individual endpoint results for pagination
                if (activeTab === 'users') {
                    setSearchResults({ users: response.data.users, problems: [] });
                    setTotalPages(response.data.total_pages);
                    setTotalResults(response.data.total);
                } else {
                    setSearchResults({ users: [], problems: response.data.problems });
                    setTotalPages(response.data.total_pages);
                    setTotalResults(response.data.total);
                    // Fetch vote data for problems
                    if (response.data.problems && response.data.problems.length > 0) {
                        await fetchVoteData(response.data.problems);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching search results:", error);
            console.error("Error response:", error.response?.data);
            console.error("Error status:", error.response?.status);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (userId) => {
        try {
            const token = localStorage.getItem("token");
            const isFollowing = followStatus[userId];
            
            if (isFollowing) {
                await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${userId}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            // Update follow status
            setFollowStatus(prev => ({
                ...prev,
                [userId]: !isFollowing
            }));
            
            // Refresh search results to update follower counts
            fetchSearchResults();
        } catch (error) {
            console.error("Error following/unfollowing user:", error);
            alert("Error following/unfollowing user");
        }
    };

    const handleFollowUser = async (userId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setFollowStatus(prev => ({
                ...prev,
                [userId]: true
            }));
            
            fetchSearchResults();
        } catch (error) {
            console.error("Error following user:", error);
            alert("Error following user");
        }
    };

    const handleUnfollowUser = async (userId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setFollowStatus(prev => ({
                ...prev,
                [userId]: false
            }));
            
            fetchSearchResults();
        } catch (error) {
            console.error("Error unfollowing user:", error);
            alert("Error unfollowing user");
        }
    };

    const fetchVoteData = async (problemsList) => {
        try {
            const token = localStorage.getItem("token");
            const votePromises = problemsList.map(async (problem) => {
                const problemId = problem.id;
                try {
                    const response = await axios.get(
                        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/votes`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                    return { problemId, voteData: response.data };
                } catch (error) {
                    console.error(`Error fetching vote data for problem ${problemId}:`, error);
                    return { problemId, voteData: { like_count: 0, dislike_count: 0, user_vote: null } };
                }
            });
            
            const voteResults = await Promise.all(votePromises);
            const voteDataMap = {};
            voteResults.forEach(({ problemId, voteData }) => {
                voteDataMap[problemId] = voteData;
            });
            setVoteData(voteDataMap);
        } catch (error) {
            console.error("Error fetching vote data:", error);
        }
    };

    const handleVote = async (problemId, voteType) => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/vote`,
                { vote_type: voteType },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            // Update vote data for this specific problem
            setVoteData(prev => ({
                ...prev,
                [problemId]: response.data
            }));
        } catch (error) {
            console.error("Error voting:", error);
            alert("Error voting on problem");
        }
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
        
        // Don't refetch when switching tabs - we already have the data from combined search
        // The data will be filtered by the activeTab in the render logic
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/homepage", { replace: true });
    };

    if (loading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <h2>Searching...</h2>
            </div>
        );
    }

    return (
        <Layout showHomeButton={true}>
            {/* Back Button */}
            <div style={{ marginBottom: spacing.md }}>
                <BackButton fallbackPath="/feed" />
            </div>
            
            <div style={{ marginBottom: spacing.xl }}>
                <h1 style={{
                    fontSize: typography.fontSize["3xl"],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.primary,
                    marginBottom: spacing.sm,
                    textAlign: "center"
                }}>
                    Search Results for "{query}"
                </h1>
                <p style={{ 
                    color: colors.gray[600], 
                    margin: `0 0 ${spacing.lg} 0`,
                    textAlign: "center",
                    fontSize: typography.fontSize.base
                }}>
                    {totalResults} result{totalResults !== 1 ? 's' : ''} found
                </p>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: "30px" }}>
                <SearchBar 
                placeholder="Search users and problems..." 
                initialQuery={query}
                showAdvanced={true}
            />
                <p style={{ color: "#666", fontSize: "14px", margin: "8px 0 0 0" }}>
                    Modify your search or try a new keyword
                </p>
            </div>

            {/* Tabs */}
            <div style={{ 
                display: "flex", 
                gap: "8px", 
                marginBottom: "30px",
                backgroundColor: "#f8f9fa",
                padding: "6px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
                <button
                    onClick={() => handleTabChange('all')}
                    style={{
                        padding: "12px 24px",
                        backgroundColor: activeTab === 'all' ? colors.primary : "transparent",
                        color: activeTab === 'all' ? "white" : colors.gray[600],
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                        boxShadow: activeTab === 'all' ? "0 2px 8px rgba(26, 77, 58, 0.3)" : "none"
                    }}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'all') {
                            e.target.style.backgroundColor = colors.gray[200];
                            e.target.style.color = colors.gray[800];
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'all') {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = colors.gray[600];
                        }
                    }}
                >
                    All Results
                </button>
                <button
                    onClick={() => handleTabChange('users')}
                    style={{
                        padding: "12px 24px",
                        backgroundColor: activeTab === 'users' ? colors.primary : "transparent",
                        color: activeTab === 'users' ? "white" : colors.gray[600],
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                        boxShadow: activeTab === 'users' ? "0 2px 8px rgba(26, 77, 58, 0.3)" : "none"
                    }}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'users') {
                            e.target.style.backgroundColor = colors.gray[200];
                            e.target.style.color = colors.gray[800];
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'users') {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = colors.gray[600];
                        }
                    }}
                >
                    Users ({searchResults.users ? searchResults.users.length : 0})
                </button>
                <button
                    onClick={() => handleTabChange('problems')}
                    style={{
                        padding: "12px 24px",
                        backgroundColor: activeTab === 'problems' ? colors.primary : "transparent",
                        color: activeTab === 'problems' ? "white" : colors.gray[600],
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                        boxShadow: activeTab === 'problems' ? "0 2px 8px rgba(26, 77, 58, 0.3)" : "none"
                    }}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'problems') {
                            e.target.style.backgroundColor = colors.gray[200];
                            e.target.style.color = colors.gray[800];
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'problems') {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = colors.gray[600];
                        }
                    }}
                >
                    Problems ({searchResults.problems ? searchResults.problems.length : 0})
                </button>
            </div>

            {/* Users Section */}
            {(activeTab === 'all' || activeTab === 'users') && searchResults.users && searchResults.users.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                    <h2 style={{ marginBottom: "20px", color: "#333" }}>Users</h2>
                    <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
                        gap: "20px" 
                    }}>
                        {searchResults.users.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => {
                                    // If it's the current user, go to personal profile, otherwise public profile
                                    if (currentUser && currentUser.id === user.id) {
                                        navigate('/profile');
                                    } else {
                                        navigate(`/user/${user.username}`);
                                    }
                                }}
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: "10px",
                                    padding: "20px",
                                    cursor: "pointer",
                                    backgroundColor: "white",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                    transition: "transform 0.2s, box-shadow 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
                                    <div style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "50%",
                                        backgroundColor: "#007bff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white",
                                        fontSize: "20px",
                                        fontWeight: "bold",
                                        backgroundImage: user.profile_picture ? `url(${user.profile_picture})` : "none",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}>
                                        {!user.profile_picture && getUserInitial(user.username)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>{getDisplayName(user.username)}</h3>
                                        <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                                            {user.follower_count} follower{user.follower_count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    {currentUser && currentUser.id !== user.id && (
                                        <FollowButton
                                            isFollowing={user.is_following}
                                            onFollow={() => handleFollowUser(user.id)}
                                            onUnfollow={() => handleUnfollowUser(user.id)}
                                            size="sm"
                                            isDeletedUser={user.username.startsWith('__deleted_user_')}
                                        />
                                    )}
                                </div>
                                {user.bio && (
                                    <p style={{ 
                                        margin: "0", 
                                        color: "#555", 
                                        fontSize: "14px", 
                                        lineHeight: "1.4",
                                        maxHeight: "60px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>
                                        {user.bio}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Problems Section */}
            {(activeTab === 'all' || activeTab === 'problems') && searchResults.problems && searchResults.problems.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                    <h2 style={{ marginBottom: "20px", color: "#333" }}>Problems</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {searchResults.problems.map((problem) => (
                            <div
                                key={problem.id}
                                onClick={() => navigate(`/problem/${problem.id}?from=search&q=${encodeURIComponent(query)}&searchTab=${activeTab}`)}
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: "10px",
                                    padding: "20px",
                                    cursor: "pointer",
                                    backgroundColor: "white",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                    transition: "transform 0.2s, box-shadow 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
                                    <div style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "50%",
                                        backgroundColor: "#007bff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white",
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                        backgroundImage: problem.author.profile_picture ? `url(${problem.author.profile_picture})` : "none",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}>
                                        {!problem.author.profile_picture && getUserInitial(problem.author.username)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>{renderMathContent(problem.title)}</h3>
                                        <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                                            by {getDisplayName(problem.author.username)} • {new Date(problem.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                
                                <p style={{ 
                                    margin: "0 0 15px 0", 
                                    color: "#555", 
                                    fontSize: "14px",
                                    maxHeight: "60px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "pre-wrap"
                                }}>
                                    {renderMathContent(problem.description)}
                                </p>
                                
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                    <span style={{ 
                                        padding: "6px 12px", 
                                        backgroundColor: "#e0e7ff", 
                                        color: "#3730a3", 
                                        borderRadius: "16px", 
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        marginRight: "8px",
                                        boxShadow: "0 2px 6px rgba(30, 64, 175, 0.2)",
                                        transition: "all 0.2s ease"
                                    }}>
                                        {problem.subject}
                                    </span>
                                    {problem.level && (
                                        <span style={{ 
                                            padding: "6px 12px", 
                                            backgroundColor: "#fef3c7", 
                                            color: "#92400e", 
                                            borderRadius: "16px", 
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            marginRight: "8px",
                                            boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
                                            transition: "all 0.2s ease"
                                        }}>
                                            {problem.level}
                                        </span>
                                    )}
                                    {problem.year && (
                                        <span style={{ 
                                            padding: "6px 12px", 
                                            backgroundColor: "#dcfce7", 
                                            color: "#166534", 
                                            borderRadius: "16px", 
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            marginRight: "8px",
                                            boxShadow: "0 2px 6px rgba(26, 77, 58, 0.2)",
                                            transition: "all 0.2s ease"
                                        }}>
                                            Year: {problem.year}
                                        </span>
                                    )}
                                    {problem.tags && problem.tags.trim() && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                            {problem.tags.split(",").map((tag, index) => {
                                                const trimmedTag = tag.trim();
                                                if (!trimmedTag) return null;
                                                return (
                                                    <span
                                                        key={index}
                                                        style={{
                                                            backgroundColor: colors.tertiary,
                                                            color: "white",
                                                            padding: "6px 12px",
                                                            borderRadius: "16px",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            whiteSpace: "nowrap",
                                                            boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
                                                            transition: "all 0.2s ease"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.transform = "translateY(-1px)";
                                                            e.target.style.boxShadow = "0 4px 12px rgba(124, 58, 237, 0.4)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.transform = "translateY(0)";
                                                            e.target.style.boxShadow = "0 2px 8px rgba(124, 58, 237, 0.3)";
                                                        }}
                                                    >
                                                        {trimmedTag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVote(problem.id, "like");
                                            }}
                                            style={{
                                                backgroundColor: voteData[problem.id]?.user_vote === "like" ? "#e8f5e8" : "#f8f9fa",
                                                border: `1px solid ${voteData[problem.id]?.user_vote === "like" ? "#4CAF50" : "#dee2e6"}`,
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                color: voteData[problem.id]?.user_vote === "like" ? "#4CAF50" : "#666",
                                                fontWeight: voteData[problem.id]?.user_vote === "like" ? "bold" : "500",
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                transition: "all 0.2s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                            onMouseEnter={(e) => {
                                                if (voteData[problem.id]?.user_vote !== "like") {
                                                    e.target.style.backgroundColor = "#e9ecef";
                                                    e.target.style.borderColor = "#adb5bd";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (voteData[problem.id]?.user_vote !== "like") {
                                                    e.target.style.backgroundColor = "#f8f9fa";
                                                    e.target.style.borderColor = "#dee2e6";
                                                }
                                            }}
                                        >
                                            <img 
                                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795079/Like_Icon_hf3gef.svg" 
                                                alt="Like"
                                                style={{
                                                    height: "14px",
                                                    width: "14px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                            {voteData[problem.id]?.like_count || 0}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVote(problem.id, "dislike");
                                            }}
                                            style={{
                                                backgroundColor: voteData[problem.id]?.user_vote === "dislike" ? "#ffebee" : "#f8f9fa",
                                                border: `1px solid ${voteData[problem.id]?.user_vote === "dislike" ? "#f44336" : "#dee2e6"}`,
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                color: voteData[problem.id]?.user_vote === "dislike" ? "#f44336" : "#666",
                                                fontWeight: voteData[problem.id]?.user_vote === "dislike" ? "bold" : "500",
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                transition: "all 0.2s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                            onMouseEnter={(e) => {
                                                if (voteData[problem.id]?.user_vote !== "dislike") {
                                                    e.target.style.backgroundColor = "#e9ecef";
                                                    e.target.style.borderColor = "#adb5bd";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (voteData[problem.id]?.user_vote !== "dislike") {
                                                    e.target.style.backgroundColor = "#f8f9fa";
                                                    e.target.style.borderColor = "#dee2e6";
                                                }
                                            }}
                                        >
                                            <img 
                                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795077/Dislike_icon_vdy4ss.svg" 
                                                alt="Dislike"
                                                style={{
                                                    height: "14px",
                                                    width: "14px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                            {voteData[problem.id]?.dislike_count || 0}
                                        </button>
                                        <span style={{ color: "#666", fontSize: "12px" }}>
                                             {problem.comment_count} comments
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No Results */}
            {(!searchResults.users || searchResults.users.length === 0) && (!searchResults.problems || searchResults.problems.length === 0) && (
                <div style={{ textAlign: "center", padding: "40px" }}>
                    <h3 style={{ color: "#666" }}>No results found for "{query}"</h3>
                    <p style={{ color: "#999" }}>Try searching with different keywords</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    gap: "10px",
                    marginTop: "40px"
                }}>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: currentPage === 1 ? "#ccc" : "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: currentPage === 1 ? "not-allowed" : "pointer"
                        }}
                    >
                        Previous
                    </button>
                    
                    <span style={{ padding: "0 20px", color: "#666" }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: currentPage === totalPages ? "#ccc" : "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                        }}
                    >
                        Next
                    </button>
                </div>
            )}
        </Layout>
    );
};

export default SearchResults;

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SearchBar from './SearchBar';

const SearchResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchResults, setSearchResults] = useState({ users: [], problems: [] });
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [followStatus, setFollowStatus] = useState({});
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'users', 'problems'
    
    // Get category from URL parameters
    const category = new URLSearchParams(location.search).get('category') || 'all';
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [searchInput, setSearchInput] = useState('');

    const query = new URLSearchParams(location.search).get('q') || '';

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
    }, [query, currentPage, activeTab]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://127.0.0.1:8000/auth/me", {
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
            const hasAdvancedParams = urlParams.get('subject') || urlParams.get('level') || 
                                    urlParams.get('year') || urlParams.get('tags');
            
            let endpoint;
            if (hasAdvancedParams) {
                // Use advanced search endpoint
                const params = new URLSearchParams();
                if (query && query.trim()) params.append('q', query.trim());
                if (urlParams.get('category')) params.append('category', urlParams.get('category'));
                if (urlParams.get('subject')) params.append('subject', urlParams.get('subject'));
                if (urlParams.get('level')) params.append('level', urlParams.get('level'));
                if (urlParams.get('year')) params.append('year', urlParams.get('year'));
                if (urlParams.get('tags')) params.append('tags', urlParams.get('tags'));
                params.append('page', currentPage);
                params.append('limit', '10');
                
                endpoint = `http://127.0.0.1:8000/auth/search/advanced?${params.toString()}`;
                console.log("Using advanced search endpoint:", endpoint);
            } else {
                // Use regular combined search
                endpoint = `http://127.0.0.1:8000/auth/search/combined?q=${encodeURIComponent(query)}`;
                console.log("Using combined search endpoint:", endpoint);
            }

            console.log("Searching with endpoint:", endpoint);
            console.log("Active tab:", activeTab);
            console.log("Query:", query);
            console.log("Current page:", currentPage);

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Search response:", response.data);

            if (hasAdvancedParams) {
                // Advanced search results - always show problems
                setSearchResults(response.data);
                setTotalPages(response.data.total_pages || 1);
                setTotalResults(response.data.total_problems || 0);
                console.log("Advanced search results set:", response.data);
            } else if (activeTab === 'all' || (activeTab === 'users' && currentPage === 1) || (activeTab === 'problems' && currentPage === 1)) {
                // Use combined search results
                setSearchResults(response.data);
                setTotalPages(1); // Combined search doesn't use pagination
                setTotalResults((response.data.users ? response.data.users.length : 0) + (response.data.problems ? response.data.problems.length : 0));
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
                await axios.delete(`http://127.0.0.1:8000/auth/follow/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`http://127.0.0.1:8000/auth/follow/${userId}`, {}, {
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
        navigate("/", { replace: true });
    };

    if (loading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <h2>Searching...</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <div>
                    <h1>Search Results for "{query}"</h1>
                    <p style={{ color: "#666", margin: "5px 0" }}>
                        {totalResults} result{totalResults !== 1 ? 's' : ''} found
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <Link to="/feed">
                        <button style={{ 
                            padding: "10px 20px", 
                            backgroundColor: "#28a745", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "5px",
                            cursor: "pointer"
                        }}>
                            Back to Feed
                        </button>
                    </Link>
                    <button 
                        onClick={handleLogout}
                        style={{ 
                            padding: "10px 20px", 
                            backgroundColor: "#dc3545", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "5px",
                            cursor: "pointer"
                        }}>
                        Logout
                    </button>
                </div>
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
                gap: "10px", 
                marginBottom: "30px",
                borderBottom: "1px solid #ddd",
                paddingBottom: "10px"
            }}>
                <button
                    onClick={() => handleTabChange('all')}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: activeTab === 'all' ? "#007bff" : "#f8f9fa",
                        color: activeTab === 'all' ? "white" : "#333",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}
                >
                    All Results
                </button>
                <button
                    onClick={() => handleTabChange('users')}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: activeTab === 'users' ? "#007bff" : "#f8f9fa",
                        color: activeTab === 'users' ? "white" : "#333",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}
                >
                    Users ({searchResults.users ? searchResults.users.length : 0})
                </button>
                <button
                    onClick={() => handleTabChange('problems')}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: activeTab === 'problems' ? "#007bff" : "#f8f9fa",
                        color: activeTab === 'problems' ? "white" : "#333",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                        cursor: "pointer"
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
                                        backgroundImage: user.profile_picture ? `url(http://127.0.0.1:8000/auth/serve-image/${user.profile_picture.split('/').pop()})` : "none",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}>
                                        {!user.profile_picture && user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>{user.username}</h3>
                                        <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                                            {user.follower_count} follower{user.follower_count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    {currentUser && currentUser.id !== user.id && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFollow(user.id);
                                            }}
                                            style={{
                                                padding: "8px 16px",
                                                backgroundColor: user.is_following ? "#28a745" : "#007bff",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "5px",
                                                cursor: "pointer",
                                                fontSize: "12px"
                                            }}
                                        >
                                            {user.is_following ? "✓ Following" : "+ Follow"}
                                        </button>
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
                                onClick={() => navigate(`/problem/${problem.id}`)}
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
                                        backgroundImage: problem.author.profile_picture ? `url(http://127.0.0.1:8000/auth/serve-image/${problem.author.profile_picture.split('/').pop()})` : "none",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}>
                                        {!problem.author.profile_picture && problem.author.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>{problem.title}</h3>
                                        <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                                            by {problem.author.username} • {new Date(problem.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                
                                <p style={{ 
                                    margin: "0 0 15px 0", 
                                    color: "#555", 
                                    fontSize: "14px",
                                    maxHeight: "60px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }}>
                                    {problem.description}
                                </p>
                                
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                    <span style={{ 
                                        padding: "4px 8px", 
                                        backgroundColor: "#e3f2fd", 
                                        color: "#1976d2", 
                                        borderRadius: "4px", 
                                        fontSize: "12px" 
                                    }}>
                                        {problem.subject}
                                    </span>
                                    {problem.level && (
                                        <span style={{ 
                                            padding: "4px 8px", 
                                            backgroundColor: "#fff3e0", 
                                            color: "#f57c00", 
                                            borderRadius: "4px", 
                                            fontSize: "12px" 
                                        }}>
                                            {problem.level}
                                        </span>
                                    )}
                                    {problem.year && (
                                        <span style={{ 
                                            padding: "4px 8px", 
                                            backgroundColor: "#e8f5e8", 
                                            color: "#2e7d32", 
                                            borderRadius: "4px", 
                                            fontSize: "12px" 
                                        }}>
                                            Year: {problem.year}
                                        </span>
                                    )}
                                    {problem.tags && problem.tags.trim() && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                            {problem.tags.split(",").map((tag, index) => {
                                                const trimmedTag = tag.trim();
                                                if (!trimmedTag) return null;
                                                return (
                                                    <span
                                                        key={index}
                                                        style={{
                                                            backgroundColor: "#f3e5f5",
                                                            color: "#7b1fa2",
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            fontSize: "12px",
                                                            whiteSpace: "nowrap"
                                                        }}
                                                    >
                                                        {trimmedTag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <span style={{ color: "#666", fontSize: "12px" }}>
                                        💬 {problem.comment_count} comments
                                    </span>
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
        </div>
    );
};

export default SearchResults;

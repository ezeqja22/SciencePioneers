// src/Feed.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import SearchBar from "./SearchBar";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import FollowButton from "./components/FollowButton";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { getUserInitial, getDisplayName } from "./utils";

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

function Feed() {
  const location = useLocation();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [voteData, setVoteData] = useState({});
  const [followStatus, setFollowStatus] = useState({});
  const [activeTab, setActiveTab] = useState("all"); // "all", "following", "trending"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch data if user is authenticated
    const token = localStorage.getItem("token");
    if (token) {
    fetchProblems();
      fetchCurrentUser();
    }
  }, []);

  useEffect(() => {
    // Fetch data when tab changes
    let loadingTimeout;
    
    // Show loading after a short delay to allow animation to be visible
    loadingTimeout = setTimeout(() => {
      setShowLoading(true);
    }, 300); // 300ms delay to see the sliding animation
    
    if (activeTab === "all") {
      fetchProblems().finally(() => {
        clearTimeout(loadingTimeout);
        setShowLoading(false);
      });
    } else if (activeTab === "following") {
      fetchFollowingProblems().finally(() => {
        clearTimeout(loadingTimeout);
        setShowLoading(false);
      });
    } else if (activeTab === "trending") {
      fetchTrendingProblems().finally(() => {
        clearTimeout(loadingTimeout);
        setShowLoading(false);
      });
    }
    
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [activeTab]);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['all', 'following', 'trending'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  const handleLogout = () => {
    // Clear all user data
    localStorage.removeItem("token");
    
    // Clear any cached data
    setProblems([]);
    setVoteData({});
    setFollowStatus({});
    
    // Replace current history entry to prevent back navigation
    navigate("/homepage", { replace: true });
  };

  const fetchProblems = async (page = 1) => {
    setLoading(true);
    try {
      let endpoint = `http://127.0.0.1:8000/auth/problems/?page=${page}&limit=10`;
      
      // Use trending endpoint for trending tab
      if (activeTab === "trending") {
        endpoint = `http://127.0.0.1:8000/auth/problems/trending?page=${page}&limit=10`;
      }
      
      const response = await axios.get(endpoint);
      setProblems(response.data.problems || response.data);
      setCurrentPage(page);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(response.data.total_problems || response.data.total || response.data.length);
      
      // Fetch vote data for all problems
      const problemIds = (response.data.problems || response.data).map(problem => problem.id);
      await fetchVoteData(problemIds);
      
      // Fetch follow status for all authors
      await fetchFollowStatus(response.data.problems || response.data);
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowingProblems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://127.0.0.1:8000/auth/feed/following", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // The backend returns an object with 'problems' array
      const problemsData = Array.isArray(response.data.problems) ? response.data.problems : [];
      setProblems(problemsData);
      
      // Only fetch vote data and follow status if we have problems
      if (problemsData.length > 0) {
        const problemIds = problemsData.map(problem => problem.id);
        await fetchVoteData(problemIds);
        await fetchFollowStatus(problemsData);
      }
    } catch (error) {
      console.error("Error fetching following problems:", error);
      // Set empty array on error to prevent map error
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingProblems = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://127.0.0.1:8000/auth/problems/trending?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setProblems(response.data.problems || []);
      setCurrentPage(page);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(response.data.total_problems || 0);
      
      // Only fetch vote data and follow status if we have problems
      if (response.data.problems && response.data.problems.length > 0) {
        const problemIds = response.data.problems.map(problem => problem.id);
        await fetchVoteData(problemIds);
        await fetchFollowStatus(response.data.problems);
      }
    } catch (error) {
      console.error("Error fetching trending problems:", error);
      // Set empty array on error to prevent map error
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async (problems) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const followPromises = problems.map(async (problem) => {
        if (!problem.author) return { authorId: null, isFollowing: false };
        try {
          const response = await axios.get(`http://127.0.0.1:8000/auth/follow/status/${problem.author.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return { authorId: problem.author.id, isFollowing: response.data.is_following };
        } catch (error) {
          return { authorId: problem.author.id, isFollowing: false };
        }
      });
      
      const results = await Promise.all(followPromises);
      const followStatusMap = {};
      results.forEach(result => {
        followStatusMap[result.authorId] = result.isFollowing;
      });
      setFollowStatus(followStatusMap);
    } catch (error) {
      console.error("Error fetching follow status:", error);
    }
  };

  const fetchVoteData = async (problemIds) => {
    try {
      const token = localStorage.getItem("token");
      const votePromises = problemIds.map(async (problemId) => {
        try {
          const response = await axios.get(
            `http://127.0.0.1:8000/auth/problems/${problemId}/vote-status`,
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

  const handleBookmark = async (problemId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://127.0.0.1:8000/auth/problems/${problemId}/bookmark`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert("Problem bookmarked successfully!");
    } catch (error) {
      if (error.response?.status === 400) {
        alert("Problem already bookmarked!");
      } else {
        console.error("Error bookmarking problem:", error);
        alert("Error bookmarking problem");
      }
    }
  };

  const handleVote = async (problemId, voteType) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`http://127.0.0.1:8000/auth/problems/${problemId}/vote`,
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

  const handleFollow = async (authorId, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to follow users");
        return;
      }

      const isFollowing = followStatus[authorId];
      
      if (isFollowing) {
        await axios.delete(`http://127.0.0.1:8000/auth/follow/${authorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowStatus(prev => ({ ...prev, [authorId]: false }));
      } else {
        await axios.post(`http://127.0.0.1:8000/auth/follow/${authorId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowStatus(prev => ({ ...prev, [authorId]: true }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://127.0.0.1:8000/auth/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data.users);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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

  if (showLoading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader 
          type="problems" 
          message="Loading problems..." 
          size="large"
        />
      </Layout>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{
          fontSize: typography.fontSize["3xl"],
          fontWeight: typography.fontWeight.bold,
          color: colors.primary,
          marginBottom: spacing.lg,
          textAlign: "center"
        }}>
          Science Problems Feed
        </h1>
        
      </div>

      {/* Enhanced Search Bar */}
      <div style={{ marginBottom: "20px" }}>
        <SearchBar placeholder="Search problems, users, tags, levels..." />
      </div>
        {/* Removed old search results - now handled by SearchBar component */}

      {/* Tab Navigation */}
      <div style={{
        display: "flex",
        marginBottom: spacing.lg,
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        border: `1px solid ${colors.gray[200]}`
      }}>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            flex: 1,
            padding: `${spacing.sm} ${spacing.md}`,
            border: "none",
            backgroundColor: activeTab === "all" ? colors.primary : "transparent",
            color: activeTab === "all" ? colors.white : colors.gray[600],
            cursor: "pointer",
            fontWeight: activeTab === "all" ? typography.fontWeight.bold : typography.fontWeight.medium,
            transition: "all 0.2s ease",
            fontSize: typography.fontSize.base
          }}
        >
          All Problems
        </button>
        <button
          onClick={() => setActiveTab("following")}
          style={{
            flex: 1,
            padding: `${spacing.sm} ${spacing.md}`,
            border: "none",
            backgroundColor: activeTab === "following" ? colors.primary : "transparent",
            color: activeTab === "following" ? colors.white : colors.gray[600],
            cursor: "pointer",
            fontWeight: activeTab === "following" ? typography.fontWeight.bold : typography.fontWeight.medium,
            transition: "all 0.2s ease",
            fontSize: typography.fontSize.base
          }}
        >
          Following
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          style={{
            flex: 1,
            padding: `${spacing.sm} ${spacing.md}`,
            border: "none",
            backgroundColor: activeTab === "trending" ? colors.primary : "transparent",
            color: activeTab === "trending" ? colors.white : colors.gray[600],
            cursor: "pointer",
            fontWeight: activeTab === "trending" ? typography.fontWeight.bold : typography.fontWeight.medium,
            transition: "all 0.2s ease",
            fontSize: typography.fontSize.base
          }}
        >
          Trending
        </button>
      </div>

      {problems.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          {activeTab === "all" && (
            <>
          <h3>No problems yet!</h3>
          <p>Be the first to create a science problem.</p>
          <Link to="/create-problem?from=/feed">
            <button style={{ 
              padding: "10px 20px", 
              backgroundColor: "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "5px",
              cursor: "pointer"
            }}>
              Create First Problem
            </button>
          </Link>
            </>
          )}
          {activeTab === "following" && (
            <>
              <h3>You're not following anyone yet!</h3>
              <p>Follow other users to see their problems in your feed.</p>
              <p>Switch to "All Problems" to discover users to follow.</p>
            </>
          )}
          {activeTab === "trending" && (
            <>
              <h3>No trending problems yet!</h3>
              <p>Problems with more comments and engagement will appear here.</p>
              <Link to="/create-problem?from=/feed">
                <button style={{ 
                  padding: "10px 20px", 
                  backgroundColor: "#28a745", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "5px",
                  cursor: "pointer"
                }}>
                  Create a Problem
                </button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div>
          {problems.map((problem) => (
            <Card 
            key={problem.id} 
            hover={true}
            style={{
              marginBottom: spacing.lg,
              cursor: "pointer"
            }}
            onClick={() => navigate(`/problem/${problem.id}?from=feed&tab=${activeTab}`)}
          >
              {/* Author Info Section - Twitter Style */}
              {problem.author ? (
                <div style={{ display: "flex", alignItems: "center", marginBottom: "15px", gap: "10px" }}>
                  {/* Profile Picture */}
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
                    {!problem.author.profile_picture && getUserInitial(problem.author.username)}
                  </div>
                  
                  {/* Author Name and Follow Button */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                    <div>
                      <div 
                        style={{ 
                          fontWeight: "bold", 
                          fontSize: "14px", 
                          color: "#007bff",
                          cursor: "pointer",
                          textDecoration: "underline"
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent bubbling to problem card
                          // If it's the current user, go to their own profile page
                          if (currentUser && problem.author.id === currentUser.id) {
                            navigate('/profile');
                          } else {
                            navigate(`/user/${problem.author.username}`);
                          }
                        }}
                      >
                        {getDisplayName(problem.author.username)}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {new Date(problem.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Follow Button - Hide for own posts */}
                    {currentUser && problem.author.id !== currentUser.id && (
                      <FollowButton
                        isFollowing={followStatus[problem.author.id]}
                        onFollow={() => handleFollow(problem.author.id)}
                        onUnfollow={() => handleFollow(problem.author.id)}
                        size="sm"
                        style={{ marginLeft: "auto" }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", marginBottom: "15px", gap: "10px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold"
                  }}>
                    ?
                  </div>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>
                      Unknown Author
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {new Date(problem.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
              
              <h3 style={{ marginTop: 0, color: "#333" }}>{renderMathContent(problem.title)}</h3>
              <div style={{ color: "#666", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{renderMathContent(problem.description)}</div>
              <div style={{ display: "flex", gap: "10px", marginTop: "15px", alignItems: "center" }}>
                <span style={{
                  backgroundColor: "#e0e7ff",
                  color: "#3730a3",
                  padding: "6px 12px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginRight: "8px",
                  boxShadow: "0 2px 6px rgba(30, 64, 175, 0.2)",
                  transition: "all 0.2s ease"
                }}>
                  {problem.subject}
                </span>
                {problem.level && problem.level.trim() && (
                  <span style={{
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    padding: "6px 12px",
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
                    backgroundColor: "#dcfce7", 
                    color: "#166534",
                    padding: "6px 12px",
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
                <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
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
                    👍 {voteData[problem.id]?.like_count || 0}
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
                    👎 {voteData[problem.id]?.dislike_count || 0}
                  </button>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    💬 {problem.comment_count || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmark(problem.id);
                    }}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#f57c00",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "11px"
                    }}
                  >
                    🔖 Bookmark
                  </button>
                </div>
              </div>
          </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(activeTab === "all" || activeTab === "trending") && totalPages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: spacing.md,
          marginTop: spacing.xl,
          padding: spacing.lg
        }}>
          <Button
            onClick={() => {
              if (activeTab === "trending") {
                fetchTrendingProblems(currentPage - 1);
              } else {
                fetchProblems(currentPage - 1);
              }
            }}
            disabled={currentPage === 1}
            variant={currentPage === 1 ? "ghost" : "primary"}
            size="md"
          >
            ← Previous
          </Button>
          
          <span style={{ 
            padding: `0 ${spacing.lg}`,
            fontSize: typography.fontSize.base,
            color: colors.gray[600],
            fontWeight: typography.fontWeight.medium
          }}>
            Page {currentPage} of {totalPages} ({totalProblems} total problems)
          </span>
          
          <Button
            onClick={() => {
              if (activeTab === "trending") {
                fetchTrendingProblems(currentPage + 1);
              } else {
                fetchProblems(currentPage + 1);
              }
            }}
            disabled={currentPage === totalPages}
            variant={currentPage === totalPages ? "ghost" : "primary"}
            size="md"
          >
            Next →
          </Button>
        </div>
      )}

      {/* Enhanced Floating Create Problem Button */}
      <div style={{
        position: "fixed",
        bottom: spacing.xl,
        right: spacing.xl,
        zIndex: 1000
      }}>
        <Link to="/create-problem?from=/feed" style={{ textDecoration: "none" }}>
          <div style={{
            width: "60px",
            height: "60px",
            backgroundColor: colors.primary,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            transition: "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            fontSize: "24px",
            color: colors.white,
            fontWeight: typography.fontWeight.bold,
            overflow: "hidden",
            whiteSpace: "nowrap",
            position: "relative"
          }}
          onMouseEnter={(e) => {
            e.target.style.width = "220px";
            e.target.style.borderRadius = "30px";
            e.target.style.justifyContent = "flex-start";
            e.target.style.paddingLeft = "20px";
            e.target.style.backgroundColor = colors.secondary;
            e.target.style.boxShadow = "0 6px 25px rgba(0,0,0,0.2)";
            e.target.innerHTML = '<span style="font-size: 16px;">Create New Problem</span><span style="position: absolute; right: 18px; top: 50%; transform: translateY(-50%); font-size: 24px;">+</span>';
          }}
          onMouseLeave={(e) => {
            e.target.style.width = "60px";
            e.target.style.borderRadius = "50%";
            e.target.style.justifyContent = "center";
            e.target.style.paddingLeft = "0px";
            e.target.style.backgroundColor = colors.primary;
            e.target.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
            e.target.innerHTML = '+';
          }}
          title="Create New Problem"
          >
            +
          </div>
        </Link>
    </div>
    </Layout>
  );
}

export default Feed;

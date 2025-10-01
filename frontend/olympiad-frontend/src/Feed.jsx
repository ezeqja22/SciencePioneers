// src/Feed.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import SearchBar from "./SearchBar";

// Helper function to render math content
const renderMathContent = (text) => {
  if (!text) return '';
  
  // If the text contains LaTeX commands or mathematical expressions, wrap the entire text
  const hasLatex = /\\[a-zA-Z]+|[\^_]\s*[a-zA-Z0-9]|[\+\-\*\/\=\<\>\≤\≥\±\∓\∞]/.test(text);
  
  if (hasLatex) {
    // Wrap the entire text in $ delimiters for math rendering
    try {
      return <InlineMath math={text} />;
    } catch (error) {
      // If KaTeX fails, fall back to regular text
      console.warn('KaTeX rendering failed:', error);
      return <span>{text}</span>;
    }
  }
  
  // For regular text without math, return as is
  return <span>{text}</span>;
};

function Feed() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
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
    // Validate authentication before fetching data
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    
    fetchProblems();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    // Fetch data when tab changes
    if (activeTab === "all") {
      fetchProblems();
    } else if (activeTab === "following") {
      fetchFollowingProblems();
    } else if (activeTab === "trending") {
      fetchTrendingProblems();
    }
  }, [activeTab]);

  const handleLogout = () => {
    // Clear all user data
    localStorage.removeItem("token");
    
    // Clear any cached data
    setProblems([]);
    setVoteData({});
    setFollowStatus({});
    
    // Replace current history entry to prevent back navigation
    navigate("/", { replace: true });
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Loading problems...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Science Problems Feed</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/profile">
            <button style={{ 
              padding: "10px 20px", 
              backgroundColor: "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "5px",
              cursor: "pointer"
            }}>
              My Profile
            </button>
          </Link>
          <Link to="/create-problem">
            <button style={{ 
              padding: "10px 20px", 
              backgroundColor: "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "5px",
              cursor: "pointer"
            }}>
              Create Problem
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

      {/* Enhanced Search Bar */}
      <div style={{ marginBottom: "20px" }}>
        <SearchBar placeholder="Search problems, users, tags, levels..." />
      </div>
        {/* Removed old search results - now handled by SearchBar component */}

      {/* Tab Navigation */}
      <div style={{ 
        display: "flex", 
        borderBottom: "2px solid #e9ecef", 
        marginBottom: "30px",
        gap: "0"
      }}>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "12px 24px",
            border: "none",
            backgroundColor: activeTab === "all" ? "#007bff" : "transparent",
            color: activeTab === "all" ? "white" : "#666",
            cursor: "pointer",
            borderBottom: activeTab === "all" ? "2px solid #007bff" : "2px solid transparent",
            fontWeight: activeTab === "all" ? "bold" : "normal",
            transition: "all 0.2s ease"
          }}
        >
          All Problems
        </button>
        <button
          onClick={() => setActiveTab("following")}
          style={{
            padding: "12px 24px",
            border: "none",
            backgroundColor: activeTab === "following" ? "#007bff" : "transparent",
            color: activeTab === "following" ? "white" : "#666",
            cursor: "pointer",
            borderBottom: activeTab === "following" ? "2px solid #007bff" : "2px solid transparent",
            fontWeight: activeTab === "following" ? "bold" : "normal",
            transition: "all 0.2s ease"
          }}
        >
          Following
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          style={{
            padding: "12px 24px",
            border: "none",
            backgroundColor: activeTab === "trending" ? "#007bff" : "transparent",
            color: activeTab === "trending" ? "white" : "#666",
            cursor: "pointer",
            borderBottom: activeTab === "trending" ? "2px solid #007bff" : "2px solid transparent",
            fontWeight: activeTab === "trending" ? "bold" : "normal",
            transition: "all 0.2s ease"
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
              <Link to="/create-problem">
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
              <Link to="/create-problem">
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
            <div 
            key={problem.id} 
            onClick={() => navigate(`/problem/${problem.id}`)}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
              backgroundColor: "#f9f9f9",
              cursor: "pointer"  // Add this to show it's clickable
            }}
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
                    {!problem.author.profile_picture && problem.author.username.charAt(0).toUpperCase()}
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
                        {problem.author.username}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {new Date(problem.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Follow Button - Hide for own posts */}
                    {currentUser && problem.author.id !== currentUser.id && (
                      <button
                        onClick={(e) => handleFollow(problem.author.id, e)}
                        style={{
                          padding: "4px 12px",
                          backgroundColor: followStatus[problem.author.id] ? "#28a745" : "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "15px",
                          cursor: "pointer",
                          fontSize: "12px",
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        {followStatus[problem.author.id] ? (
                          <>
                            <span>✓</span>
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <span>+</span>
                            <span>Follow</span>
                          </>
                        )}
                      </button>
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
              <div style={{ color: "#666", lineHeight: "1.5" }}>{renderMathContent(problem.description)}</div>
              <div style={{ display: "flex", gap: "10px", marginTop: "15px", alignItems: "center" }}>
                <span style={{
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}>
                  {problem.subject}
                </span>
                {problem.level && problem.level.trim() && (
                  <span style={{
                    backgroundColor: "#fff3e0",
                    color: "#f57c00",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px"
                  }}>
                    {problem.level}
                  </span>
                )}
                {problem.year && (
                  <span style={{ 
                    backgroundColor: "#e8f5e8", 
                    color: "#2e7d32",
                    padding: "4px 8px",
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
                <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    👍 {voteData[problem.id]?.like_count || 0}
                  </span>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    👎 {voteData[problem.id]?.dislike_count || 0}
                  </span>
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
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(activeTab === "all" || activeTab === "trending") && totalPages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: "10px",
          marginTop: "40px",
          padding: "20px"
        }}>
          <button
            onClick={() => {
              if (activeTab === "trending") {
                fetchTrendingProblems(currentPage - 1);
              } else {
                fetchProblems(currentPage - 1);
              }
            }}
            disabled={currentPage === 1}
            style={{
              padding: "10px 20px",
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
            Page {currentPage} of {totalPages} ({totalProblems} total problems)
          </span>
          
          <button
            onClick={() => {
              if (activeTab === "trending") {
                fetchTrendingProblems(currentPage + 1);
              } else {
                fetchProblems(currentPage + 1);
              }
            }}
            disabled={currentPage === totalPages}
            style={{
              padding: "10px 20px",
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
}

export default Feed;

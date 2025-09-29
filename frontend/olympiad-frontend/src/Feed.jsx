// src/Feed.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function Feed() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voteData, setVoteData] = useState({});
  const [followStatus, setFollowStatus] = useState({});
  const [activeTab, setActiveTab] = useState("all"); // "all", "following", "trending"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Validate authentication before fetching data
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    
    fetchProblems();
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

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/auth/problems/");
      setProblems(response.data);
      
      // Fetch vote data for all problems
      const problemIds = response.data.map(problem => problem.id);
      await fetchVoteData(problemIds);
      
      // Fetch follow status for all authors
      await fetchFollowStatus(response.data);
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

  const fetchTrendingProblems = async () => {
    setLoading(true);
    try {
      // For now, we'll use the same endpoint but sort by popularity
      // Later we can implement a proper trending algorithm
      const response = await axios.get("http://127.0.0.1:8000/auth/problems/");
      
      // Ensure response.data is an array and sort by comment count
      const problemsData = Array.isArray(response.data) ? response.data : [];
      const sortedProblems = problemsData.sort((a, b) => b.comment_count - a.comment_count);
      setProblems(sortedProblems);
      
      // Only fetch vote data and follow status if we have problems
      if (sortedProblems.length > 0) {
        const problemIds = sortedProblems.map(problem => problem.id);
        await fetchVoteData(problemIds);
        await fetchFollowStatus(sortedProblems);
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

      {/* Search Bar */}
      <div style={{ marginBottom: "20px", position: "relative" }}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearchChange}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            fontSize: "16px"
          }}
        />
        {showSearchResults && searchResults.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "5px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: "300px",
            overflowY: "auto"
          }}>
            {searchResults.map(user => (
              <div
                key={user.id}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
                onClick={() => {
                  navigate(`/user/${user.username}`);
                  setShowSearchResults(false);
                  setSearchQuery("");
                }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#007bff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  backgroundImage: user.profile_picture ? 
                    `url(http://127.0.0.1:8000/auth/serve-image/${user.profile_picture.split('/').pop()})` : 
                    'none',
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}>
                  {!user.profile_picture && user.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold" }}>{user.username}</div>
                  {user.bio && <div style={{ fontSize: "12px", color: "#666" }}>{user.bio}</div>}
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {user.follower_count} followers
                  </div>
                </div>
                {user.is_following && (
                  <span style={{ color: "#28a745", fontSize: "12px" }}>✓ Following</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
                          navigate(`/user/${problem.author.username}`);
                        }}
                      >
                        {problem.author.username}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {new Date(problem.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Follow Button */}
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
              
              <h3 style={{ marginTop: 0, color: "#333" }}>{problem.title}</h3>
              <p style={{ color: "#666", lineHeight: "1.5" }}>{problem.description}</p>
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
                <span style={{
                  backgroundColor: "#fff3e0",
                  color: "#f57c00",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}>
                  {problem.level}
                </span>
                {problem.tags && (
                  <span style={{
                    backgroundColor: "#f3e5f5",
                    color: "#7b1fa2",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px"
                  }}>
                    {problem.tags}
                  </span>
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
    </div>
  );
}

export default Feed;

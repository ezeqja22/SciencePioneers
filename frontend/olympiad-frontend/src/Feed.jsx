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

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Loading problems...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
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

      {problems.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
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
              {problem.author && (
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
                      <div style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>
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
                        backgroundColor: followStatus[problem.author.id] ? "#6c757d" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "15px",
                        cursor: "pointer",
                        fontSize: "12px",
                        marginLeft: "auto"
                      }}
                    >
                      {followStatus[problem.author.id] ? "Following" : "Follow"}
                    </button>
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

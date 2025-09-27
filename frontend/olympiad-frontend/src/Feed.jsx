// src/Feed.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function Feed() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/auth/problems/");
      setProblems(response.data);
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
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
            <div key={problem.id} style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
              backgroundColor: "#f9f9f9"
            }}>
              <h3 style={{ marginTop: 0, color: "#333" }}>{problem.title}</h3>
              <p style={{ color: "#666", lineHeight: "1.5" }}>{problem.description}</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <span style={{
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}>
                  {problem.subject}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Feed;

import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render math content
const renderMathContent = (text) => {
    if (!text) return '';
    
    const hasLatex = /\\[a-zA-Z]+|[\^_]\s*[a-zA-Z0-9]|[\+\-\*\/\=\<\>\≤\≥\±\∓\∞]/.test(text);
    
    if (hasLatex) {
        try {
            return <InlineMath math={text} />;
        } catch (error) {
            console.warn('KaTeX rendering failed:', error);
            return <span>{text}</span>;
        }
    }
    
    return <span>{text}</span>;
};

function SubjectPage() {
    const { subject } = useParams();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [currentUser, setCurrentUser] = useState(null);
    const [voteData, setVoteData] = useState({});
    const navigate = useNavigate();

    // Convert URL parameter back to proper case
    const subjectName = subject.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    useEffect(() => {
        // Only fetch data if user is authenticated
        const token = localStorage.getItem("token");
        if (token) {
            fetchProblems();
            fetchCurrentUser();
        }
    }, [subject, currentPage]);

    const fetchProblems = async () => {
        setLoading(true);
        try {
            console.log("Fetching problems for subject:", subjectName);
            const response = await axios.get(`http://127.0.0.1:8000/auth/problems/${subjectName}`);
            console.log("Response data:", response.data);
            setProblems(response.data);
            // For now, we'll implement simple pagination on frontend
            setTotalPages(Math.ceil(response.data.length / 20));
            
            // Fetch vote data for all problems
            await fetchVoteData(response.data);
        } catch (error) {
            console.error("Error fetching problems:", error);
            console.error("Subject name being used:", subjectName);
            setProblems([]);
        } finally {
            setLoading(false);
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

    const fetchVoteData = async (problemsList) => {
        try {
            const token = localStorage.getItem("token");
            const votePromises = problemsList.map(async (problem) => {
                const problemId = problem.id;
                try {
                    const response = await axios.get(
                        `http://127.0.0.1:8000/auth/problems/${problemId}/votes`,
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

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/homepage", { replace: true });
    };

    // Paginate problems (20 per page)
    const startIndex = (currentPage - 1) * 20;
    const endIndex = startIndex + 20;
    const paginatedProblems = problems.slice(startIndex, endIndex);

    if (loading) {
        return (
            <div style={{ 
                minHeight: "100vh", 
                backgroundColor: "#f8f9fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <h2 style={{ color: "#1a4d3a" }}>Loading {subjectName} problems...</h2>
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: "100vh", 
            backgroundColor: "#f8f9fa",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: "#1a4d3a",
                color: "white",
                padding: "1rem 2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}>
                <Link to="/" style={{ textDecoration: "none", color: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "40px",
                            height: "40px",
                            backgroundColor: "#2d7a5f",
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
                </Link>

                <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <Link to="/feed" style={{ 
                        color: "white", 
                        textDecoration: "none", 
                        fontWeight: "500",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        transition: "background-color 0.2s"
                    }}>
                        Feed
                    </Link>
                    <Link to="/" style={{ 
                        color: "white", 
                        textDecoration: "none", 
                        fontWeight: "500",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        transition: "background-color 0.2s"
                    }}>
                        Home
                    </Link>
                    
                    {/* Subject Dropdown */}
                    <div style={{ position: "relative" }}>
                        <select 
                            value={subjectName}
                            onChange={(e) => {
                                if (e.target.value !== subjectName) {
                                    navigate(`/subject/${e.target.value.toLowerCase().replace(/\s+/g, '-')}`);
                                }
                            }}
                            style={{
                                backgroundColor: "#2d7a5f",
                                color: "white",
                                border: "1px solid #4a9d7a",
                                borderRadius: "6px",
                                padding: "8px 12px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                outline: "none"
                            }}
                        >
                            <option value="Mathematics">Mathematics</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    
                    {currentUser && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: "#2d7a5f",
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
                                {!currentUser.profile_picture && currentUser.username.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: "14px", fontWeight: "500" }}>
                                {currentUser.username}
                            </span>
                        </div>
                    )}
                </nav>
            </header>

            {/* Main Content */}
            <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ marginBottom: "2rem" }}>
                    <h1 style={{ 
                        fontSize: "2.5rem", 
                        fontWeight: "700", 
                        color: "#1a4d3a",
                        marginBottom: "0.5rem"
                    }}>
                        {subjectName} Problems
                    </h1>
                    <p style={{ 
                        fontSize: "1.1rem", 
                        color: "#666",
                        marginBottom: "2rem"
                    }}>
                        {problems.length} problems found in {subjectName}
                    </p>
                </div>

                {problems.length === 0 ? (
                    <div style={{ 
                        textAlign: "center", 
                        padding: "4rem 2rem",
                        backgroundColor: "white",
                        borderRadius: "12px",
                        border: "1px solid #e9ecef"
                    }}>
                        <h3 style={{ color: "#1a4d3a", marginBottom: "1rem" }}>
                            No {subjectName} problems yet!
                        </h3>
                        <p style={{ color: "#666", marginBottom: "2rem" }}>
                            Be the first to create a {subjectName.toLowerCase()} problem.
                        </p>
                        <Link to="/create-problem">
                            <button style={{
                                backgroundColor: "#1a4d3a",
                                color: "white",
                                border: "none",
                                padding: "12px 24px",
                                borderRadius: "8px",
                                fontSize: "16px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}>
                                Create Problem
                            </button>
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* 2-Column Grid Layout */}
                        <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", 
                            gap: "1.5rem",
                            marginBottom: "3rem"
                        }}>
                            {paginatedProblems.map((problem) => (
                                <div 
                                    key={problem.id} 
                                    onClick={() => navigate(`/problem/${problem.id}`)}
                                    style={{
                                        backgroundColor: "white",
                                        border: "1px solid #e9ecef",
                                        borderRadius: "12px",
                                        padding: "1.5rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = "translateY(-2px)";
                                        e.target.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = "translateY(0)";
                                        e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                                    }}
                                >
                                    {/* Author Info */}
                                    {problem.author && (
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            marginBottom: "1rem", 
                                            gap: "10px" 
                                        }}>
                                            <div style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                backgroundColor: "#1a4d3a",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "white",
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                                backgroundImage: problem.author.profile_picture ? 
                                                    `url(http://127.0.0.1:8000/auth/serve-image/${problem.author.profile_picture.split('/').pop()})` : "none",
                                                backgroundSize: "cover",
                                                backgroundPosition: "center"
                                            }}>
                                                {!problem.author.profile_picture && problem.author.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ 
                                                    fontWeight: "600", 
                                                    fontSize: "14px", 
                                                    color: "#1a4d3a"
                                                }}>
                                                    {problem.author.username}
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#666" }}>
                                                    {new Date(problem.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <h3 style={{ 
                                        margin: "0 0 1rem 0", 
                                        color: "#333",
                                        fontSize: "1.25rem",
                                        fontWeight: "600",
                                        lineHeight: "1.4"
                                    }}>
                                        {renderMathContent(problem.title)}
                                    </h3>
                                    
                                    <div style={{ 
                                        color: "#666", 
                                        lineHeight: "1.6",
                                        marginBottom: "1rem",
                                        fontSize: "0.95rem"
                                    }}>
                                        {renderMathContent(problem.description.length > 150 ? 
                                            problem.description.substring(0, 150) + "..." : 
                                            problem.description
                                        )}
                                    </div>

                                    <div style={{ 
                                        display: "flex", 
                                        gap: "8px", 
                                        marginBottom: "1rem", 
                                        alignItems: "center",
                                        flexWrap: "wrap"
                                    }}>
                                        <span style={{
                                            backgroundColor: "#e3f2fd",
                                            color: "#1976d2",
                                            padding: "4px 8px",
                                            borderRadius: "4px",
                                            fontSize: "12px",
                                            fontWeight: "500"
                                        }}>
                                            {problem.subject}
                                        </span>
                                        {problem.level && problem.level.trim() && (
                                            <span style={{
                                                backgroundColor: "#fff3e0",
                                                color: "#f57c00",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                fontWeight: "500"
                                            }}>
                                                {problem.level}
                                            </span>
                                        )}
                                        {problem.tags && problem.tags.trim() && (
                                            problem.tags.split(',').map((tag, index) => (
                                                <span key={index} style={{
                                                    backgroundColor: "#f3e5f5",
                                                    color: "#7b1fa2",
                                                    padding: "4px 8px",
                                                    borderRadius: "4px",
                                                    fontSize: "12px",
                                                    fontWeight: "500"
                                                }}>
                                                    {tag.trim()}
                                                </span>
                                            ))
                                        )}
                                        {problem.year && (
                                            <span style={{ 
                                                backgroundColor: "#e8f5e8", 
                                                color: "#2e7d32",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                fontWeight: "500"
                                            }}>
                                                Year: {problem.year}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ 
                                        display: "flex", 
                                        justifyContent: "space-between", 
                                        alignItems: "center",
                                        fontSize: "12px",
                                        color: "#666"
                                    }}>
                                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
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
                                            <span>💬 {problem.comment_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ 
                                display: "flex", 
                                justifyContent: "center", 
                                alignItems: "center", 
                                gap: "1rem",
                                marginTop: "3rem"
                            }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: currentPage === 1 ? "#ccc" : "#1a4d3a",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                        fontSize: "14px",
                                        fontWeight: "500"
                                    }}
                                >
                                    Previous
                                </button>
                                
                                <span style={{ 
                                    padding: "0 20px", 
                                    color: "#666",
                                    fontSize: "14px"
                                }}>
                                    Page {currentPage} of {totalPages}
                                </span>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: currentPage === totalPages ? "#ccc" : "#1a4d3a",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                                        fontSize: "14px",
                                        fontWeight: "500"
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default SubjectPage;

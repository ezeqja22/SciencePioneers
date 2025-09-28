import React from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useState, useEffect } from "react";

function ProblemDetail() {
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [voteStatus, setVoteStatus] = useState({
        user_vote: null,
        like_count: 0,
        dislike_count: 0
    });
    const [voteLoading, setVoteLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [editText, setEditText] = useState("");
    const [editingProblem, setEditingProblem] = useState(false);
    const [editProblemData, setEditProblemData] = useState({
        title: "",
        description: "",
        tags: "",
        subject: "",
        level: ""
    });



    const fetchProblem = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/auth/problems/id/${id}`);
            setProblem(response.data);
        } catch (error) {
            console.error("Error fetching problem:", error);
        } finally {
            setLoading(false);
        }
    }

    const fetchComments = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/auth/problems/${id}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    }

    const fetchVoteStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`http://127.0.0.1:8000/auth/problems/${id}/vote-status`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setVoteStatus(response.data);
        } catch (error) {
            console.error("Error fetching vote status:", error);
        }
    }

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://127.0.0.1:8000/auth/me", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    }

    const handleVote = async (voteType) => {
        setVoteLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`http://127.0.0.1:8000/auth/problems/${id}/vote`,
                { vote_type: voteType },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

            setVoteStatus(response.data);
        } catch (error) {
            console.error("Error voting:", error);
        } finally {
            setVoteLoading(false);
        }
    }

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`http://127.0.0.1:8000/auth/problems/${id}/comments`,
                { text: newComment },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            
            setComments([...comments, response.data]);
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    }

    const handleEditComment = (comment) => {
        setEditingComment(comment.id);
        setEditText(comment.text);
    }

    const handleSaveEdit = async (commentId) => {
        if (!editText.trim()) return;

        try {
            const token = localStorage.getItem("token");
            const response = await axios.put(`http://127.0.0.1:8000/auth/problems/${id}/comments/${commentId}`,
                { text: editText },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            
            setComments(comments.map(comment => 
                comment.id === commentId ? response.data : comment
            ));
            setEditingComment(null);
            setEditText("");
        } catch (error) {
            console.error("Error updating comment:", error);
        }
    }

    const handleCancelEdit = () => {
        setEditingComment(null);
        setEditText("");
    }

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`http://127.0.0.1:8000/auth/problems/${id}/comments/${commentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            setComments(comments.filter(comment => comment.id !== commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    }

    const handleEditProblem = () => {
        setEditingProblem(true);
        setEditProblemData({
            title: problem.title,
            description: problem.description,
            tags: problem.tags || "",
            subject: problem.subject,
            level: problem.level || "Any Level"
        });
    };

    const handleSaveProblem = async () => {
        if (!editProblemData.title.trim() || !editProblemData.description.trim()) return;

        try {
            const token = localStorage.getItem("token");
            const response = await axios.put(`http://127.0.0.1:8000/auth/problems/${id}`,
                editProblemData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            
            setProblem(response.data);
            setEditingProblem(false);
        } catch (error) {
            console.error("Error updating problem:", error);
        }
    };

    const handleCancelProblemEdit = () => {
        setEditingProblem(false);
        setEditProblemData({
            title: "",
            description: "",
            tags: "",
            subject: "",
            level: ""
        });
    };

    const handleDeleteProblem = async () => {
        if (!window.confirm("Are you sure you want to delete this problem? This will also delete all comments and votes.")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`http://127.0.0.1:8000/auth/problems/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Redirect to feed after deletion
            window.location.href = "/";
        } catch (error) {
            console.error("Error deleting problem:", error);
        }
    };

    

    useEffect(() => {
        fetchProblem();
        fetchComments();
        fetchVoteStatus();
        fetchCurrentUser();
    }, [id]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            {editingProblem ? (
                <div>
                    <input
                        type="text"
                        value={editProblemData.title}
                        onChange={(e) => setEditProblemData({...editProblemData, title: e.target.value})}
                        placeholder="Problem title"
                        style={{ 
                            width: "100%", 
                            padding: "10px", 
                            marginBottom: "10px", 
                            border: "1px solid #ddd", 
                            borderRadius: "4px",
                            fontSize: "24px",
                            fontWeight: "bold"
                        }}
                    />
                    <div style={{ marginBottom: "20px" }}>
                        <input
                            type="text"
                            value={editProblemData.subject}
                            onChange={(e) => setEditProblemData({...editProblemData, subject: e.target.value})}
                            placeholder="Subject"
                            style={{ 
                                padding: "4px 8px", 
                                marginRight: "10px", 
                                border: "1px solid #ddd", 
                                borderRadius: "4px",
                                fontSize: "12px"
                            }}
                        />
                        <input
                            type="text"
                            value={editProblemData.level}
                            onChange={(e) => setEditProblemData({...editProblemData, level: e.target.value})}
                            placeholder="Level (e.g., IMO, EGMO Phase 2, etc.)"
                            style={{ 
                                padding: "4px 8px", 
                                marginRight: "10px", 
                                border: "1px solid #ddd", 
                                borderRadius: "4px",
                                fontSize: "12px"
                            }}
                        />
                        <input
                            type="text"
                            value={editProblemData.tags}
                            onChange={(e) => setEditProblemData({...editProblemData, tags: e.target.value})}
                            placeholder="Tags (comma separated)"
                            style={{ 
                                padding: "4px 8px", 
                                border: "1px solid #ddd", 
                                borderRadius: "4px",
                                fontSize: "12px"
                            }}
                        />
                    </div>
                    <textarea
                        value={editProblemData.description}
                        onChange={(e) => setEditProblemData({...editProblemData, description: e.target.value})}
                        placeholder="Problem description"
                        style={{ 
                            width: "100%", 
                            minHeight: "100px", 
                            padding: "20px", 
                            marginBottom: "20px", 
                            border: "1px solid #ddd", 
                            borderRadius: "8px",
                            lineHeight: "1.6"
                        }}
                    />
                    <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
                        <button 
                            onClick={handleSaveProblem} 
                            style={{ 
                                padding: "8px 16px", 
                                backgroundColor: "#28a745", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "4px", 
                                cursor: "pointer" 
                            }}
                        >
                            Save Problem
                        </button>
                        <button 
                            onClick={handleCancelProblemEdit} 
                            style={{ 
                                padding: "8px 16px", 
                                backgroundColor: "#6c757d", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "4px", 
                                cursor: "pointer" 
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                        <div>
                            <h1 style={{ color: "#333", marginBottom: "20px" }}>{problem.title}</h1>
                            {problem.updated_at && new Date(problem.updated_at).getTime() > new Date(problem.created_at).getTime() && (
                                <div style={{ fontSize: "12px", color: "#666", marginTop: "-15px", marginBottom: "15px" }}>
                                    (Edited)
                                </div>
                            )}
                        </div>
                        {currentUser && currentUser.id === problem.author_id && (
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                    onClick={handleEditProblem}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#007bff",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Edit Problem
                                </button>
                                <button
                                    onClick={handleDeleteProblem}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#dc3545",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Delete Problem
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <span style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            marginRight: "10px"
                        }}>
                            {problem.subject}
                        </span>
                        <span style={{
                            backgroundColor: "#fff3e0",
                            color: "#f57c00",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            marginRight: "10px"
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
                    </div>

                    <div style={{
                        backgroundColor: "#f9f9f9",
                        padding: "20px",
                        borderRadius: "8px",
                        marginBottom: "30px"
                    }}>
                        <p style={{ lineHeight: "1.6", color: "#333" }}>{problem.description}</p>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: "30px" }}>
                <h3>Vote on this Problem</h3>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px"
                }}>
                    <div style={{
                        display: "flex",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "25px",
                        overflow: "hidden",
                        border: "2px solid #ddd"
                    }}>
                        <button
                            onClick={() => handleVote("like")}
                            disabled={voteLoading}
                            style={{
                                padding: "10px 20px",
                                border: "none",
                                backgroundColor: voteStatus.user_vote === "like" ? "#4CAF50" : "#f0f0f0",
                                color: voteStatus.user_vote === "like" ? "white" : "#333",
                                cursor: voteLoading ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                            }}
                        >
                            👍 {voteStatus.like_count}
                        </button>
                        <button
                            onClick={() => handleVote("dislike")}
                            disabled={voteLoading}
                            style={{
                                padding: "10px 20px",
                                border: "none",
                                backgroundColor: voteStatus.user_vote === "dislike" ? "#f44336" : "#f0f0f0",
                                color: voteStatus.user_vote === "dislike" ? "white" : "#333",
                                cursor: voteLoading ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                            }}
                        >
                            👎 {voteStatus.dislike_count}
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ borderTop: "1px solid #ddd", paddingTop: "20px" }}>
                <h3>Comments ({comments.length})</h3>

                {/* Add Comment Form */}
                <div style={{ marginBottom: "20px" }}>
                    <form onSubmit={handleSubmitComment}>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write your comment here..."
                            style={{
                                width: "100%",
                                minHeight: "80px",
                                padding: "10px",
                                border: "1px solid #ddd",
                                borderRadius: "5px",
                                resize: "vertical",
                                fontFamily: "inherit"
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim()}
                            style={{
                                marginTop: "10px",
                                padding: "8px 16px",
                                backgroundColor: newComment.trim() ? "#1976d2" : "#ccc",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: newComment.trim() ? "pointer" : "not-allowed"
                            }}
                        >
                            Add Comment
                        </button>
                    </form>
                </div>

                {comments.map((comment) => (
                    <div key={comment.id} style={{
                        backgroundColor: "#f9f9f9",
                        padding: "15px",
                        marginBottom: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ddd"
                    }}>
                        {editingComment === comment.id ? (
                            <div>
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    style={{
                                        width: "100%",
                                        minHeight: "60px",
                                        padding: "8px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                        marginBottom: "10px"
                                    }}
                                />
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button
                                        onClick={() => handleSaveEdit(comment.id)}
                                        disabled={!editText.trim()}
                                        style={{
                                            padding: "6px 12px",
                                            backgroundColor: editText.trim() ? "#28a745" : "#ccc",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: editText.trim() ? "pointer" : "not-allowed",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        style={{
                                            padding: "6px 12px",
                                            backgroundColor: "#6c757d",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ margin: "0 0 10px 0", color: "#333" }}>{comment.text}</p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: "12px", color: "#666" }}>
                                        By: {comment.author.username} 
                                        {comment.updated_at && new Date(comment.updated_at).getTime() > new Date(comment.created_at).getTime() && " (Edited)"}
                                        • {new Date(comment.created_at).toLocaleDateString()}
                                    </div>
                                    {currentUser && currentUser.id === comment.author_id && (
                                        <div style={{ display: "flex", gap: "5px" }}>
                                            <button
                                                onClick={() => handleEditComment(comment)}
                                                style={{
                                                    padding: "4px 8px",
                                                    backgroundColor: "#007bff",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    fontSize: "11px"
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                style={{
                                                    padding: "4px 8px",
                                                    backgroundColor: "#dc3545",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    fontSize: "11px"
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProblemDetail;
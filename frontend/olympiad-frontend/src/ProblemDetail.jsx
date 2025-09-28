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

    useEffect(() => {
        fetchProblem();
        fetchComments();
        fetchVoteStatus();
    }, [id]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h1 style={{ color: "#333", marginBottom: "20px" }}>{problem.title}</h1>

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
                        <p style={{ margin: "0 0 10px 0", color: "#333" }}>{comment.text}</p>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                            By: {comment.author.username} • {new Date(comment.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProblemDetail;
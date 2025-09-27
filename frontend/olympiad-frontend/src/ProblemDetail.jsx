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

    useEffect(() => {
        fetchProblem();
        fetchComments();
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

        <div style={{ borderTop: "1px solid #ddd", paddingTop: "20px" }}>
            <h3>Comments ({comments.length})</h3>
            {comments.map((comment) => (
                <div key={comment.id} style={{
                    backgroundColor: "#f9f9f9",
                    padding: "15px",
                    marginBottom: "10px",
                    borderRadius: "5px"
                }}>
                    <p style={{ margin: "0 0 5px 0" }}>{comment.text}</p>
                    <small style={{ color: "#666" }}>By: {comment.author.username}</small>
                </div>
            ))}
        </div>
    </div>
    );
}

export default ProblemDetail;
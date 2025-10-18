import React from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useState, useEffect } from "react";
import MathEditor from "./MathEditor";
import "./MathEditor.css";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { getUserInitial, getDisplayName } from "./utils";
import ReportModal from "./ReportModal";
import { useFeatureSettings } from "./hooks/useFeatureSettings";

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

// Recursive Comment Thread Component
const CommentThread = ({ 
    comment, 
    currentUser, 
    problem, 
    onEditComment, 
    onDeleteComment, 
    onMarkAsSolution, 
    onReply,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    onSubmitReply,
    onReportComment,
    depth = 0 
}) => {
    const maxDepth = 3; // Limit nesting depth
    const isNested = depth > 0;
    
    return (
        <div style={{
            marginBottom: "16px",
            position: "relative"
        }}>
            <div style={{
                backgroundColor: comment.is_solution ? "#f0f9ff" : isNested ? "#f1f5f9" : "#ffffff",
                border: comment.is_solution ? "2px solid #0ea5e9" : isNested ? "1px solid #94a3b8" : "1px solid #e2e8f0",
                borderRadius: isNested ? "8px" : "16px",
                padding: isNested ? "12px" : "18px",
                boxShadow: isNested ? "0 1px 4px rgba(0,0,0,0.05)" : "0 4px 12px rgba(0,0,0,0.1)",
                position: "relative",
                transition: "all 0.3s ease",
                marginLeft: isNested ? "60px" : "0",
                borderLeft: isNested ? "4px solid #6366f1" : "none",
                transform: isNested ? "translateX(6px)" : "translateX(0)",
                opacity: isNested ? "0.95" : "1"
            }}>
                {comment.is_solution && (
                    <div style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        zIndex: 1
                    }}>
                         SOLUTION
                    </div>
                )}
                
                
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "#007bff",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "bold",
                        flexShrink: 0
                    }}>
                        {getUserInitial(comment.author.username)}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <span style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>
                                {getDisplayName(comment.author.username)}
                            </span>
                            <span style={{ color: "#6c757d", fontSize: "12px" }}>
                                {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                            {comment.updated_at && new Date(comment.updated_at).getTime() > new Date(comment.created_at).getTime() && (
                                <span style={{ color: "#6c757d", fontSize: "11px" }}>(Edited)</span>
                            )}
                        </div>
                        
                        <div style={{ 
                            color: "#333", 
                            lineHeight: "1.5",
                            marginBottom: "12px",
                            wordBreak: "break-word"
                        }}>
                            {renderMathContent(comment.text)}
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                            <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                style={{
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    padding: "8px 16px",
                                    borderRadius: "20px",
                                    transition: "all 0.3s ease",
                                    boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = "translateY(-2px)";
                                    e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.6)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                                }}
                            >
                                 Reply
                            </button>
                            
                            {/* Report Comment Button */}
                            <button
                                onClick={() => onReportComment(comment)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#dc3545",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    padding: "4px 0",
                                    borderRadius: "6px",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#f6f8fa";
                                    e.target.style.color = "#b02a37";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "transparent";
                                    e.target.style.color = "#dc3545";
                                }}
                            >
                                 Report
                            </button>
                            
                            {currentUser && currentUser.id === comment.author_id && (
                                <>
                                    <button
                                        onClick={() => onEditComment(comment)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#656d76",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            padding: "4px 0",
                                            borderRadius: "6px",
                                            transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = "#f6f8fa";
                                            e.target.style.color = "#0969da";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = "transparent";
                                            e.target.style.color = "#656d76";
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onDeleteComment(comment.id)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#656d76",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            padding: "4px 0",
                                            borderRadius: "6px",
                                            transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = "#f6f8fa";
                                            e.target.style.color = "#d1242f";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = "transparent";
                                            e.target.style.color = "#656d76";
                                        }}
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                            
                            {currentUser && currentUser.id === problem.author_id && (
                                <button
                                    onClick={() => onMarkAsSolution(comment.id)}
                                    style={{
                                        background: comment.is_solution ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        border: "none",
                                        color: "white",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        padding: "6px 12px",
                                        borderRadius: "16px",
                                        fontWeight: "600",
                                        transition: "all 0.3s ease",
                                        boxShadow: comment.is_solution ? "0 4px 15px rgba(239, 68, 68, 0.4)" : "0 4px 15px rgba(16, 185, 129, 0.4)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = "translateY(-1px)";
                                        e.target.style.boxShadow = comment.is_solution ? "0 6px 20px rgba(239, 68, 68, 0.6)" : "0 6px 20px rgba(16, 185, 129, 0.6)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = "translateY(0)";
                                        e.target.style.boxShadow = comment.is_solution ? "0 4px 15px rgba(239, 68, 68, 0.4)" : "0 4px 15px rgba(16, 185, 129, 0.4)";
                                    }}
                                >
                                    {comment.is_solution ? " Unmark Solution" : " Mark as Solution"}
                                </button>
                            )}
                        </div>
                        
                        {replyingTo === comment.id && (
                            <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    style={{
                                        width: "100%",
                                        minHeight: "60px",
                                        padding: "8px",
                                        border: "1px solid #dee2e6",
                                        borderRadius: "6px",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                        fontSize: "14px"
                                    }}
                                />
                                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                    <button
                                        onClick={() => onSubmitReply(comment.id)}
                                        disabled={!replyText.trim()}
                                        style={{
                                            padding: "6px 12px",
                                            backgroundColor: replyText.trim() ? "#007bff" : "#6c757d",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: replyText.trim() ? "pointer" : "not-allowed",
                                            fontSize: "13px",
                                            fontWeight: "500"
                                        }}
                                    >
                                        Reply
                                    </button>
                                    <button
                                        onClick={() => {
                                            setReplyingTo(null);
                                            setReplyText("");
                                        }}
                                        style={{
                                            padding: "6px 12px",
                                            backgroundColor: "#6c757d",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "13px"
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Render replies with proper L-shaped connection lines */}
            {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
                <div style={{ 
                    marginTop: "12px",
                    position: "relative",
                    marginLeft: "30px"
                }}>
                    {/* L-shaped connection line from parent center to replies center */}
                    <div style={{
                        position: "absolute",
                        left: "-80px",
                        top: "-80px",
                        width: "2px",
                        height: "calc(100% + 30px)",
                        backgroundColor: "#6366f1",
                        borderRadius: "1px",
                        opacity: 0.7
                    }} />
                    
                    {/* Horizontal line connecting to parent center */}
                    <div style={{
                        position: "absolute",
                        left: "-80px",
                        top: "-80px",
                        width: "50px",
                        height: "2px",
                        backgroundColor: "#6366f1",
                        borderRadius: "1px",
                        opacity: 0.7
                    }} />
                    
                    {/* Connection dot at the junction */}
                    <div style={{
                        position: "absolute",
                        left: "-82px",
                        top: "-82px",
                        width: "6px",
                        height: "6px",
                        backgroundColor: "#6366f1",
                        borderRadius: "50%",
                        zIndex: 1
                    }} />
                    
                    {comment.replies.map((reply, index) => (
                        <div key={reply.id} style={{ 
                            position: "relative",
                            marginBottom: "8px"
                        }}>
                            <CommentThread
                                comment={reply}
                                currentUser={currentUser}
                                problem={problem}
                                onEditComment={onEditComment}
                                onDeleteComment={onDeleteComment}
                                onMarkAsSolution={onMarkAsSolution}
                                onReply={onReply}
                                replyingTo={replyingTo}
                                setReplyingTo={setReplyingTo}
                                replyText={replyText}
                                setReplyText={setReplyText}
                                onSubmitReply={onSubmitReply}
                                onReportComment={onReportComment}
                                depth={depth + 1}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function ProblemDetail() {
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Feature settings
    const { checkFeatureEnabled, showFeatureDisabledAlert } = useFeatureSettings();
    
    // Create smart fallback path based on URL parameters
    const getSmartFallbackPath = () => {
        const urlParams = new URLSearchParams(location.search);
        const from = urlParams.get('from');
        const tab = urlParams.get('tab');
        const subject = urlParams.get('subject');
        const searchQuery = urlParams.get('q');
        const searchTab = urlParams.get('searchTab');
        
        if (from === 'feed' && tab) {
            // Return to specific feed tab
            return `/feed?tab=${tab}`;
        }
        
        if (from === '/profile') {
            // Return to user profile
            return '/profile';
        }
        
        if (from === 'search' && searchQuery) {
            // Return to search results with query and tab
            let searchPath = `/search?q=${encodeURIComponent(searchQuery)}`;
            if (searchTab) {
                searchPath += `&tab=${searchTab}`;
            }
            return searchPath;
        }
        
        if (from === 'subject' && subject) {
            // Return to subject page
            return `/subject/${encodeURIComponent(subject)}`;
        }
        
        if (from === 'forum' && urlParams.get('forumId')) {
            // Return to forum
            return `/forum/${urlParams.get('forumId')}`;
        }
        
        if (from === 'user' && urlParams.get('username')) {
            // Return to user profile
            return `/user/${encodeURIComponent(urlParams.get('username'))}`;
        }
        
        // Default fallback
        return '/feed';
    };
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
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [editingProblem, setEditingProblem] = useState(false);
    const [showMathEditor, setShowMathEditor] = useState(false);
    const [mathEditorTarget, setMathEditorTarget] = useState(null);
    const [showCommentMathEditor, setShowCommentMathEditor] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [hoveredImageIndex, setHoveredImageIndex] = useState(null);
    const [editProblemData, setEditProblemData] = useState({
        title: "",
        description: "",
        subject: "",
        level: "",
        year: ""
    });
    const [editTags, setEditTags] = useState([""]);
    const [problemImages, setProblemImages] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportTarget, setReportTarget] = useState(null);

    const openMathEditor = (target) => {
        setMathEditorTarget(target);
        setShowMathEditor(true);
    };

    const handleMathInsert = (mathContent) => {
        if (mathEditorTarget === 'editComment') {
            setEditText(prev => prev + mathContent);
        } else if (mathEditorTarget) {
            setEditProblemData({
                ...editProblemData,
                [mathEditorTarget]: editProblemData[mathEditorTarget] + mathContent
            });
        }
        setShowMathEditor(false);
        setMathEditorTarget(null);
    };

    const closeMathEditor = () => {
        setShowMathEditor(false);
        setMathEditorTarget(null);
    };

    const openCommentMathEditor = () => {
        setShowCommentMathEditor(true);
    };

    const handleCommentMathInsert = (mathContent) => {
        setNewComment(prev => prev + mathContent);
        setShowCommentMathEditor(false);
    };

    const closeCommentMathEditor = () => {
        setShowCommentMathEditor(false);
    };

    // Image modal functions
    const openImageModal = (index) => {
        setCurrentImageIndex(index);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % problemImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + problemImages.length) % problemImages.length);
    };

    // Keyboard navigation for image modal
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!showImageModal) return;
            
            switch (event.key) {
                case 'Escape':
                    closeImageModal();
                    break;
                case 'ArrowLeft':
                    if (problemImages.length > 1) prevImage();
                    break;
                case 'ArrowRight':
                    if (problemImages.length > 1) nextImage();
                    break;
                default:
                    break;
            }
        };

        if (showImageModal) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [showImageModal, problemImages.length]);

    const fetchProblem = async () => {
        try {
            const token = localStorage.getItem("token");
            
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/id/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProblem(response.data);
            
            // Increment view count
            try {
                const token = localStorage.getItem("token");
                await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/view`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (viewError) {
                // View count error is non-critical
            }
            
            // Fetch problem images
            try {
                const imagesResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/images`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProblemImages(imagesResponse.data.images || []);
            } catch (error) {
                setProblemImages([]);
            }
        } catch (error) {
            console.error("Error fetching problem:", error);
            
            // Handle 403 error (Access denied for forum problems)
            if (error.response?.status === 403) {
                alert("Access denied: You are not a member of this forum.");
                navigate('/forums');
                return;
            }
        } finally {
            setLoading(false);
        }
    }

    const fetchComments = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/comments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Sort comments with solutions first, then by creation date
            const sortedComments = response.data.sort((a, b) => {
                if (a.is_solution && !b.is_solution) return -1;
                if (!a.is_solution && b.is_solution) return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setComments(sortedComments);
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    }

    const fetchVoteStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/vote-status`, {
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
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
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
        // Check if voting is enabled
        if (!checkFeatureEnabled('voting_enabled')) {
            showFeatureDisabledAlert('Voting');
            return;
        }

        setVoteLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/vote`,
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

        // Check if comments are enabled
        if (!checkFeatureEnabled('comments_enabled')) {
            showFeatureDisabledAlert('Comments');
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/comments`,
                { text: newComment },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            
            // Refresh comments to get the updated threaded structure
            fetchComments();
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    }

    const handleSubmitReply = async (parentCommentId) => {
        if (!replyText.trim()) return;

        // Check if comments are enabled
        if (!checkFeatureEnabled('comments_enabled')) {
            showFeatureDisabledAlert('Comments');
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/comments`,
                { 
                    text: replyText,
                    parent_comment_id: parentCommentId
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            
            // Refresh comments to get the updated threaded structure
            fetchComments();
            setReplyText("");
            setReplyingTo(null);
        } catch (error) {
            console.error("Error adding reply:", error);
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
            const response = await axios.put(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/comments/${commentId}`,
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
            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/comments/${commentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            setComments(comments.filter(comment => comment.id !== commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    }

    const handleReportComment = (comment) => {
        setReportTarget({
            type: 'comment',
            id: comment.id,
            user: comment.author
        });
        setShowReportModal(true);
    }

    const handleMarkAsSolution = async (commentId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.put(
                `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/comments/${commentId}/solution`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            // Recursive function to update comment in nested structure
            const updateCommentInTree = (commentList) => {
                return commentList.map(comment => {
                    if (comment.id === commentId) {
                        return { ...comment, is_solution: response.data.is_solution };
                    }
                    if (comment.replies && comment.replies.length > 0) {
                        return { ...comment, replies: updateCommentInTree(comment.replies) };
                    }
                    return comment;
                });
            };
            
            // Update the comment in the state and re-sort
            const updatedComments = updateCommentInTree(comments);
            
            // Re-sort with solutions first
            const sortedComments = updatedComments.sort((a, b) => {
                if (a.is_solution && !b.is_solution) return -1;
                if (!a.is_solution && b.is_solution) return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setComments(sortedComments);
        } catch (error) {
            console.error("Error marking comment as solution:", error);
        }
    }

    const handleEditProblem = () => {
        if (!problem) return;
        setEditingProblem(true);
        setEditProblemData({
            title: problem.title,
            description: problem.description,
            subject: problem.subject,
            level: problem.level || "Any Level",
            year: problem.year || ""
        });
        // Parse existing tags from comma-separated string
        const existingTags = problem.tags ? problem.tags.split(",").map(tag => tag.trim()).filter(tag => tag) : [""];
        setEditTags(existingTags.length > 0 ? existingTags : [""]);
    };

    const handleEditTagChange = (index, value) => {
        const newTags = [...editTags];
        newTags[index] = value;
        setEditTags(newTags);
    };

    const addEditTag = () => {
        if (editTags.length < 5) {
            setEditTags([...editTags, ""]);
        } else {
            alert("Maximum 5 tags allowed");
        }
    };

    const removeEditTag = (index) => {
        if (editTags.length > 1) {
            const newTags = editTags.filter((_, i) => i !== index);
            setEditTags(newTags);
        }
    };

    const handleSaveProblem = async () => {
        if (!editProblemData.title.trim() || !editProblemData.description.trim()) return;

        try {
            
            // Validate tags
            const validTags = editTags.filter(tag => tag.trim() !== "");
            if (validTags.length > 5) {
                alert("Maximum 5 tags allowed");
                return;
            }
            
            // Process tags: filter out empty tags and join with commas
            const processedTags = validTags.join(", ");
            
            const token = localStorage.getItem("token");
            
            // Ensure year is a number or null
            const requestData = {
                ...editProblemData,
                tags: processedTags,
                year: editProblemData.year ? parseInt(editProblemData.year) : null
            };
            
            
            const response = await axios.put(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            
            // Preserve author information when updating problem
            setProblem(prevProblem => {
                return {
                    ...prevProblem,
                    ...response.data,
                    author: prevProblem.author, // Keep the original author data
                    created_at: prevProblem.created_at // Keep the original creation date
                };
            });
            setEditingProblem(false);
        } catch (error) {
            console.error("Error updating problem:", error);
            alert(`Error updating problem: ${error.response?.data?.detail || error.message}`);
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
            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Smart navigation: redirect to the previous page with context
            const smartPath = getSmartFallbackPath();
            navigate(smartPath);
        } catch (error) {
            console.error("Error deleting problem:", error);
            alert("Error deleting problem. Please try again.");
        }
    };

    

    useEffect(() => {
        fetchProblem();
        fetchComments();
        fetchVoteStatus();
        fetchCurrentUser();
    }, [id]);

    // Refresh comments when page becomes visible (handles navigation back)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchComments();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    if (loading) {
        return (
            <Layout showHomeButton={true}>
                <AnimatedLoader 
                    type="problems" 
                    message="Loading problem..." 
                    size="large"
                />
            </Layout>
        );
    }

    if (!problem) {
    return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <h2>Problem not found</h2>
                <p>This problem may have been deleted or doesn't exist.</p>
            </div>
        );
    }

    return (
        <Layout showHomeButton={true}>
            {editingProblem ? (
                <div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                        <input
                            type="text"
                            value={editProblemData.title}
                            onChange={(e) => setEditProblemData({...editProblemData, title: e.target.value})}
                            placeholder="Problem title"
                            style={{ 
                                flex: 1,
                                padding: "12px 16px", 
                                border: "2px solid #e9ecef", 
                                borderRadius: "8px",
                                fontSize: "24px",
                                fontWeight: "bold",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = colors.primary;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e9ecef";
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => openMathEditor('title')}
                            style={{
                                padding: "12px 16px",
                                backgroundColor: colors.secondary,
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "600",
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 8px rgba(30, 64, 175, 0.3)",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow = "0 4px 12px rgba(30, 64, 175, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "0 2px 8px rgba(30, 64, 175, 0.3)";
                            }}
                        >
                            📐 Math
                        </button>
                    </div>
            <div style={{ marginBottom: "20px" }}>
                        <input
                            type="text"
                            value={editProblemData.subject}
                            onChange={(e) => setEditProblemData({...editProblemData, subject: e.target.value})}
                            placeholder="Subject"
                            style={{ 
                                padding: "8px 12px", 
                                marginRight: "10px", 
                                border: "2px solid #e9ecef", 
                                borderRadius: "6px",
                                fontSize: "14px",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = colors.primary;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e9ecef";
                            }}
                        />
                        <input
                            type="text"
                            value={editProblemData.level}
                            onChange={(e) => setEditProblemData({...editProblemData, level: e.target.value})}
                            placeholder="Level (e.g., IMO, EGMO Phase 2, etc.)"
                            style={{ 
                                padding: "8px 12px", 
                                marginRight: "10px", 
                                border: "2px solid #e9ecef", 
                                borderRadius: "6px",
                                fontSize: "14px",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = colors.primary;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e9ecef";
                            }}
                        />
                        <input
                            type="number"
                            value={editProblemData.year}
                            onChange={(e) => setEditProblemData({...editProblemData, year: e.target.value})}
                            placeholder="Year (e.g., 2024)"
                            min="1900"
                            max="2030"
                            style={{ 
                                padding: "8px 12px", 
                                marginRight: "10px", 
                                border: "2px solid #e9ecef", 
                                borderRadius: "6px",
                                fontSize: "14px",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = colors.primary;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e9ecef";
                            }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
                            <div style={{ fontSize: "10px", color: "#666", marginBottom: "5px" }}>
                                Tags ({editTags.length}/5)
                            </div>
                            {editTags.map((tag, index) => (
                                <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <input
                                        type="text"
                                        value={tag}
                                        onChange={(e) => handleEditTagChange(index, e.target.value)}
                                        placeholder={`Tag ${index + 1}`}
                                        style={{ 
                                            flex: 1,
                    padding: "4px 8px",
                                            border: "1px solid #ddd", 
                    borderRadius: "4px",
                                            fontSize: "12px"
                                        }}
                                    />
                                    {editTags.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeEditTag(index)}
                                            style={{
                                                padding: "4px 8px",
                                                backgroundColor: "#dc3545",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "12px"
                                            }}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            {editTags.length < 5 && (
                                <button
                                    type="button"
                                    onClick={addEditTag}
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#28a745",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                    fontSize: "12px",
                                        alignSelf: "flex-start"
                                    }}
                                >
                                    + Add Tag
                                </button>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                        <textarea
                            value={editProblemData.description}
                            onChange={(e) => setEditProblemData({...editProblemData, description: e.target.value})}
                            placeholder="Problem description"
                            style={{ 
                                flex: 1,
                                minHeight: "100px", 
                                padding: "20px", 
                                border: "1px solid #ddd", 
                                borderRadius: "8px",
                                lineHeight: "1.6",
                                whiteSpace: "pre-wrap"
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => openMathEditor('description')}
                            style={{
                                padding: "10px 12px",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                whiteSpace: "nowrap",
                                alignSelf: "flex-start"
                            }}
                        >
                            📐 Math
                        </button>
                    </div>
                    {/* Image Management */}
                    <div style={{ marginBottom: "20px" }}>
                        <h4 style={{ marginBottom: "10px", color: "#333" }}>
                            Problem Images ({problemImages.length}/10)
                        </h4>
                        
                        {/* Existing Images */}
                        {problemImages.length > 0 && (
                            <div style={{ marginBottom: "15px" }}>
                                <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
                                    Current Images:
                                </div>
                                <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, max-content))", 
                                    gap: "16px",
                                    justifyContent: "start"
                                }}>
                                    {problemImages.map((image, index) => (
                                        <div key={index} style={{ 
                                            position: "relative",
                                            border: "1px solid #ddd", 
                                            borderRadius: "8px", 
                                            overflow: "hidden",
                                            backgroundColor: "white",
                                            width: "150px",
                                            height: "100px"
                                        }}>
                                            <img 
                                                src={image}
                                                alt={`Problem image ${index + 1}`}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    display: "block"
                                                }}
                                            />
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const token = localStorage.getItem("token");
                                                        await axios.delete(
                                                            `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/images/${encodeURIComponent(image)}`,
                                                            {
                                                                headers: {
                                                                    Authorization: `Bearer ${token}`
                                                                }
                                                            }
                                                        );
                                                        alert("Image deleted successfully!");
                                                        fetchProblem(); // Refresh to update the list
                                                    } catch (error) {
                                                        console.error("Error deleting image:", error);
                                                        alert(`Error deleting image: ${error.response?.data?.detail || error.message}`);
                                                    }
                                                }}
                                                style={{
                                                    position: "absolute",
                                                    top: "5px",
                                                    right: "5px",
                        padding: "4px 8px",
                                                    backgroundColor: "#dc3545",
                                                    color: "white",
                                                    border: "none",
                        borderRadius: "4px",
                                                    cursor: "pointer",
                        fontSize: "12px"
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Add New Images */}
                        {problemImages.length < 10 && (
                            <div>
                                {/* Hidden file input */}
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files);
                                        
                                        if (files.length === 0) return;
                                        
                                        // Check if adding these files would exceed the limit
                                        if (problemImages.length + files.length > 10) {
                                            alert("Maximum 10 images allowed. Please select fewer images.");
                                            return;
                                        }
                                        
                                        try {
                                            for (const file of files) {
                                                if (!file.type.startsWith('image/')) {
                                                    alert(`${file.name} is not an image file`);
                                                    continue;
                                                }
                                                
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                
                                                const token = localStorage.getItem("token");
                                                const uploadResponse = await axios.post(
                                                    `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${id}/images`,
                                                    formData,
                                                    {
                                                        headers: {
                                                            Authorization: `Bearer ${token}`,
                                                            'Content-Type': 'multipart/form-data'
                                                        }
                                                    }
                                                );
                                                
                                            }
                                            alert(`${files.length} image(s) uploaded successfully!`);
                                            
                                            // Refresh the problem data to show the new images
                                            fetchProblem();
                                        } catch (error) {
                                            console.error("Error uploading images:", error);
                                            alert(`Error uploading images: ${error.response?.data?.detail || error.message}`);
                                        }
                                    }}
                                    style={{ display: "none" }}
                                    id="edit-image-upload-input"
                                />
                                
                                {/* Upload box */}
                                <div
                                    onClick={() => document.getElementById('edit-image-upload-input').click()}
                                    style={{
                                        width: "150px",
                                        height: "100px",
                                        border: "2px dashed #3b82f6",
                                        borderRadius: "8px",
                                        backgroundColor: "#eff6ff",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        position: "relative"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = "#dbeafe";
                                        e.target.style.borderColor = "#1d4ed8";
                                        e.target.style.transform = "scale(1.02)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = "#eff6ff";
                                        e.target.style.borderColor = "#3b82f6";
                                        e.target.style.transform = "scale(1)";
                                    }}
                                >
                                    <div style={{
                                        fontSize: "32px",
                                        color: "#3b82f6",
                                        fontWeight: "bold",
                                        marginBottom: "6px",
                                        transition: "all 0.2s ease"
                                    }}>
                                        +
                                    </div>
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#3b82f6",
                                        fontWeight: "600",
                                        textAlign: "center"
                                    }}>
                                        Add Image
                                    </div>
                                </div>
                                
                                <small style={{ color: "#666", fontSize: "12px", marginTop: "8px", display: "block" }}>
                                    Add up to {10 - problemImages.length} more images to your problem
                                </small>
                            </div>
                        )}
                        
                        {problemImages.length >= 10 && (
                            <div style={{ 
                                padding: "10px", 
                                backgroundColor: "#f8f9fa", 
                                borderRadius: "4px",
                                color: "#666",
                                fontSize: "12px"
                            }}>
                                Maximum 10 images reached
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
                        <button 
                            onClick={handleSaveProblem} 
                            style={{ 
                                padding: "12px 24px", 
                                backgroundColor: colors.primary, 
                                color: "white", 
                                border: "none", 
                                borderRadius: "8px", 
                                cursor: "pointer",
                                fontSize: "16px",
                                fontWeight: "600",
                                boxShadow: "0 2px 8px rgba(26, 77, 58, 0.3)",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow = "0 4px 12px rgba(26, 77, 58, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "0 2px 8px rgba(26, 77, 58, 0.3)";
                            }}
                        >
                            Save Problem
                        </button>
                        <button 
                            onClick={handleCancelProblemEdit} 
                            style={{ 
                                padding: "12px 24px", 
                                backgroundColor: colors.gray[500], 
                                color: "white", 
                                border: "none", 
                                borderRadius: "8px", 
                                cursor: "pointer",
                                fontSize: "16px",
                                fontWeight: "600",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = "translateY(-1px)";
                                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    {/* Universal Back Button */}
                    <div style={{ marginBottom: "20px" }}>
                        <BackButton fallbackPath={getSmartFallbackPath()} />
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                        <div>
                            {/* Author Information */}
                            {problem.author && (
                                <div style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "10px", 
                                    marginBottom: "15px",
                                    padding: "10px",
                                    backgroundColor: "#f8f9fa",
                                    borderRadius: "8px",
                                    border: "1px solid #e9ecef"
                                }}>
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
                                        fontSize: "16px",
                                        backgroundImage: problem.author.profile_picture ? 
                                            `url(${problem.author.profile_picture})` : 
                                            'none',
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}>
                                        {!problem.author.profile_picture && getUserInitial(problem.author.username)}
                                    </div>
                                    <div>
                                        <div 
                                            style={{ 
                                                fontWeight: "bold", 
                                                color: "#007bff", 
                                                cursor: "pointer",
                                                textDecoration: "underline"
                                            }}
                                            onClick={() => {
                                                // If it's the current user, go to their own profile page
                                                if (currentUser && problem.author.id === currentUser.id) {
                                                    navigate('/profile');
                                                } else {
                                                    navigate(`/user/${problem.author.username}`);
                                                }
                                            }}
                                        >
                                            {getDisplayName(problem.author.username) || "Unknown Author"}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#666" }}>
                                            {(() => {
                                                try {
                                                    const date = new Date(problem.created_at);
                                                    return isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString();
                                                } catch (error) {
                                                    return "Unknown date";
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {problem.updated_at && new Date(problem.updated_at).getTime() > new Date(problem.created_at).getTime() && (
                                <div style={{ fontSize: "12px", color: "#666", marginTop: "-15px", marginBottom: "15px" }}>
                                    (Edited)
                                </div>
                            )}
                            
                            {/* Problem Title */}
                            <h1 style={{ color: "#333", marginBottom: "20px", marginTop: "20px" }}>{renderMathContent(problem.title)}</h1>
                        </div>
                        {currentUser && currentUser.id === problem.author_id && (
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    onClick={handleEditProblem}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: colors.secondary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        boxShadow: "0 2px 8px rgba(30, 64, 175, 0.3)",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = "translateY(-1px)";
                                        e.target.style.boxShadow = "0 4px 12px rgba(30, 64, 175, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = "translateY(0)";
                                        e.target.style.boxShadow = "0 2px 8px rgba(30, 64, 175, 0.3)";
                                    }}
                                >
                                    Edit Problem
                                </button>
                                <button
                                    onClick={handleDeleteProblem}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: colors.danger,
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = "translateY(-1px)";
                                        e.target.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = "translateY(0)";
                                        e.target.style.boxShadow = "0 2px 8px rgba(220, 38, 38, 0.3)";
                                    }}
                                >
                                    Delete Problem
                                </button>
                            </div>
                        )}
                    </div>

            <div style={{ marginBottom: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <span style={{
                    backgroundColor: "#e0e7ff",
                    color: "#3730a3",
                    padding: "6px 12px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: "600",
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
            </div>

            <div style={{
                backgroundColor: "#f9f9f9",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "30px"
            }}>
                <div style={{ lineHeight: "1.6", color: "#333", whiteSpace: "pre-wrap" }}>{renderMathContent(problem.description)}</div>
            </div>
            
            {/* Problem Images */}
            {problemImages && problemImages.length > 0 && (
                <div style={{
                    backgroundColor: "#f9f9f9",
                    padding: "20px",
                    borderRadius: "8px",
                    marginBottom: "30px"
                }}>
                    <h3 style={{ marginBottom: "15px", color: "#333" }}>Problem Images</h3>
                    <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, max-content))", 
                        gap: "15px",
                        justifyContent: "start"
                    }}>
                        {problemImages.map((image, index) => {
                            const isHovered = hoveredImageIndex === index;
                            
                            return (
                                <div key={index} style={{ 
                                    border: "1px solid #ddd", 
                                    borderRadius: "8px", 
                                    overflow: "hidden",
                                    backgroundColor: "white",
                                    maxWidth: "200px",
                                    cursor: "pointer",
                                    position: "relative",
                                    transition: "transform 0.2s ease",
                                    transform: isHovered ? "scale(1.02)" : "scale(1)"
                                }}
                                onMouseEnter={() => setHoveredImageIndex(index)}
                                onMouseLeave={() => setHoveredImageIndex(null)}
                                onClick={() => openImageModal(index)}
                                >
                                    <img 
                                        src={image}
                                        alt={`Problem image ${index + 1}`}
                                        style={{
                                            width: "100%",
                                            height: "auto",
                                            objectFit: "contain",
                                            display: "block"
                                        }}
                                    />
                                    <div 
                                        style={{
                                            position: "absolute",
                                            top: "8px",
                                            right: "8px",
                                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            padding: "6px 8px",
                                            cursor: "pointer",
                                            fontSize: "12px",
                                            opacity: isHovered ? "1" : "0",
                                            transition: "opacity 0.2s ease",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}
                                    >
                                        <img 
                                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795126/Search_Icon_White_wj1ka1.svg" 
                                            alt="Fullscreen"
                                            style={{
                                                height: "16px",
                                                width: "16px",
                                                objectFit: "contain",
                                                marginRight: "4px"
                                            }}
                                        />
                                        Fullscreen
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
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
                             {voteStatus.like_count}
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
                             {voteStatus.dislike_count}
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ borderTop: "1px solid #ddd", paddingTop: "20px" }}>
                <h3>Comments ({comments.length})</h3>

                {/* Add Comment Form */}
                <div style={{ marginBottom: "20px" }}>
                    <form onSubmit={handleSubmitComment}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
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
                                fontFamily: "inherit",
                                whiteSpace: "pre-wrap"
                            }}
                        />
                            <button
                                type="button"
                                onClick={openCommentMathEditor}
                                style={{
                                    marginLeft: "10px",
                                    padding: "8px 12px",
                                    backgroundColor: "#4caf50",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "14px"
                                }}
                                title="Add Math"
                            >
                                📐 Math
                            </button>
                        </div>
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
                    <CommentThread
                        key={comment.id}
                        comment={comment}
                        currentUser={currentUser}
                        problem={problem}
                        onEditComment={handleEditComment}
                        onDeleteComment={handleDeleteComment}
                        onMarkAsSolution={handleMarkAsSolution}
                        onReply={() => {}}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onSubmitReply={handleSubmitReply}
                        onReportComment={handleReportComment}
                    />
    ))}
            </div>
            
            {/* Math Editor Modal */}
            <MathEditor
                isOpen={showMathEditor}
                onClose={closeMathEditor}
                onInsert={handleMathInsert}
                initialValue=""
            />

            {/* Comment Math Editor Modal */}
            <MathEditor
                isOpen={showCommentMathEditor}
                onClose={closeCommentMathEditor}
                onInsert={handleCommentMathInsert}
                initialValue=""
            />

            {/* Fullscreen Image Modal */}
            {showImageModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    cursor: "pointer"
                }}
                onClick={closeImageModal}
                >
                    {/* Close button */}
                    <button
                        onClick={closeImageModal}
                        style={{
                            position: "absolute",
                            top: "20px",
                            right: "20px",
                            backgroundColor: "rgba(255, 255, 255, 0.2)",
                            color: "white",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            fontSize: "20px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 10000
                        }}
                    >
                        ✕
                    </button>

                    {/* Navigation arrows */}
                    {problemImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    prevImage();
                                }}
                                style={{
                                    position: "absolute",
                                    left: "20px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "50px",
                                    height: "50px",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10000
                                }}
                            >
                                ‹
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    nextImage();
                                }}
                                style={{
                                    position: "absolute",
                                    right: "20px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "50px",
                                    height: "50px",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10000
                                }}
                            >
                                ›
                            </button>
                        </>
                    )}

                    {/* Image counter */}
                    {problemImages.length > 1 && (
                        <div style={{
                            position: "absolute",
                            bottom: "20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            fontSize: "14px",
                            zIndex: 10000
                        }}>
                            {currentImageIndex + 1} / {problemImages.length}
        </div>
                    )}

                    {/* Fullscreen image */}
                    <img
                        src={problemImages[currentImageIndex]}
                        alt={`Problem image ${currentImageIndex + 1}`}
                        style={{
                            maxWidth: "90vw",
                            maxHeight: "90vh",
                            objectFit: "contain",
                            borderRadius: "8px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && reportTarget && (
                <ReportModal
                    isOpen={showReportModal}
                    onClose={() => {
                        setShowReportModal(false);
                        setReportTarget(null);
                    }}
                    reportType={reportTarget.type}
                    targetId={reportTarget.id}
                    targetUser={reportTarget.user}
                />
            )}
        </Layout>
    );
}

export default ProblemDetail;
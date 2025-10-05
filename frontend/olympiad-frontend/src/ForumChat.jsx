import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';
import { getUserInitial, getDisplayName } from './utils';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render math content
const renderMathContent = (text) => {
    if (!text) return '';
    
    const latexPattern = /\\[a-zA-Z]+|\\[^a-zA-Z]|\$\$|\\\(|\\\)|\\\[|\\\]|\^|\_|\{|\}|\[|\]|∫|∑|∏|√|α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω|∞|±|∓|×|÷|≤|≥|≠|≈|≡|∈|∉|⊂|⊃|∪|∩|∅|∇|∂|∆|Ω|Φ|Ψ|Λ|Σ|Π|Θ|Ξ|Γ|Δ/;
    if (!latexPattern.test(text)) {
        return text;
    }
    
    try {
        return <InlineMath math={text} />;
    } catch (error) {
        return text;
    }
};

const ForumChat = () => {
    const { forumId } = useParams();
    const navigate = useNavigate();
    const [forum, setForum] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchCurrentUser(),
                    fetchForum()
                ]);
                await fetchMessages();
            } catch (error) {
                console.error("Error loading initial data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadInitialData();
        
        // Set up polling for new messages (simple approach, can be upgraded to WebSocket later)
        // Increased to 10 seconds to reduce server load
        pollingIntervalRef.current = setInterval(fetchMessages, 2000);
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [forumId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            
            const response = await axios.get("http://127.0.0.1:8000/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    };

    const fetchForum = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setError("Please log in to view forum");
                return;
            }

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setForum(response.data);
        } catch (error) {
            console.error("Error fetching forum:", error);
            if (error.response?.status === 403) {
                setError("Access denied to this forum");
            } else if (error.response?.status === 404) {
                setError("Forum not found");
            } else {
                setError(`Failed to load forum: ${error.response?.data?.detail || error.message}`);
            }
        }
    };

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(response.data.reverse()); // Reverse to show oldest first
        } catch (error) {
            console.error("Error fetching messages:", error);
            console.error("Error response:", error.response);
            console.error("Error status:", error.response?.status);
            
            if (error.response?.status === 403) {
                setError("You must be a member of this forum to view messages");
                // Stop polling on error
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            } else if (error.response?.status === 404) {
                setError("Forum not found");
                // Stop polling on error
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            }
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/messages`, {
                content: newMessage,
                message_type: "text"
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewMessage('');
            fetchMessages(); // Refresh messages
        } catch (error) {
            console.error("Error sending message:", error);
            console.error("Error response:", error.response);
            console.error("Error status:", error.response?.status);
            console.error("Error data:", error.response?.data);
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        
        // Handle typing indicators
        if (!isTyping) {
            setIsTyping(true);
            // Send typing indicator (simplified for now)
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 1000);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleForumTitleClick = () => {
        navigate(`/forum/${forumId}/info`);
    };

    if (loading) {
        return (
            <div style={{
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.light
            }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        border: `4px solid ${colors.gray[300]}`,
                        borderTop: `4px solid ${colors.primary}`,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px"
                    }}></div>
                    <p style={{ color: colors.gray[600] }}>Loading chat...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.light
            }}>
                <div style={{ textAlign: "center" }}>
                    <h2 style={{ color: colors.error, marginBottom: spacing.md }}>{error}</h2>
                    <button 
                        onClick={() => navigate('/forums')}
                        style={{
                            backgroundColor: colors.primary,
                            color: colors.white,
                            border: "none",
                            padding: "12px 24px",
                            borderRadius: borderRadius.md,
                            cursor: "pointer"
                        }}
                    >
                        Back to Forums
                    </button>
                </div>
            </div>
        );
    }

    if (!forum) return null;

    return (
        <div style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: colors.light
        }}>
            {/* Header */}
            <div style={{
                backgroundColor: colors.primary,
                color: colors.white,
                padding: spacing.md,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: shadows.sm
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                    <button
                        onClick={() => navigate('/forums')}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: colors.white,
                            fontSize: "18px",
                            cursor: "pointer",
                            padding: "8px"
                        }}
                    >
                        ←
                    </button>
                    <div>
                        <h1 
                            onClick={handleForumTitleClick}
                            style={{ 
                                margin: 0, 
                                fontSize: "18px", 
                                cursor: "pointer",
                                textDecoration: "underline"
                            }}
                        >
                            {forum.title}
                        </h1>
                        <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                            {forum.member_count} members
                        </p>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                    {typingUsers.length > 0 && (
                        <span style={{ fontSize: "12px", opacity: 0.8 }}>
                            {typingUsers.join(', ')} typing...
                        </span>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: spacing.md,
                display: "flex",
                flexDirection: "column",
                gap: spacing.sm
            }}>
                {messages.map((message) => {
                    const isOwnMessage = currentUser && message.author_id === currentUser.id;
                    
                    return (
                        <div
                            key={message.id}
                            style={{
                                display: "flex",
                                justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                                marginBottom: spacing.sm
                            }}
                        >
                            <div style={{
                                maxWidth: "70%",
                                backgroundColor: isOwnMessage ? colors.primary : colors.white,
                                color: isOwnMessage ? colors.white : colors.gray[800],
                                padding: spacing.sm,
                                borderRadius: borderRadius.lg,
                                boxShadow: shadows.sm,
                                position: "relative"
                            }}>
                                {!isOwnMessage && (
                                    <div style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        marginBottom: "4px",
                                        color: colors.primary
                                    }}>
                                        {getDisplayName(message.author?.username || 'Unknown')}
                                    </div>
                                )}
                                
                                {message.message_type === 'text' ? (
                                    <div style={{ whiteSpace: "pre-wrap" }}>
                                        {renderMathContent(message.content)}
                                    </div>
                                ) : message.message_type === 'problem' ? (
                                    <div style={{
                                        backgroundColor: isOwnMessage ? "rgba(255,255,255,0.1)" : colors.light,
                                        padding: spacing.sm,
                                        borderRadius: borderRadius.md,
                                        border: `1px solid ${isOwnMessage ? "rgba(255,255,255,0.2)" : colors.gray[200]}`
                                    }}>
                                        <div style={{ fontWeight: "600", marginBottom: spacing.xs }}>
                                            📐 Problem
                                        </div>
                                        <div style={{ fontSize: "14px" }}>
                                            {renderMathContent(message.content)}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ fontStyle: "italic", opacity: 0.8 }}>
                                        {message.content}
                                    </div>
                                )}
                                
                                <div style={{
                                    fontSize: "10px",
                                    opacity: 0.7,
                                    marginTop: spacing.xs,
                                    textAlign: "right"
                                }}>
                                    {new Date(message.created_at).toLocaleTimeString()}
                                    {message.is_edited && " (edited)"}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                backgroundColor: colors.white,
                padding: spacing.md,
                borderTop: `1px solid ${colors.gray[200]}`,
                boxShadow: shadows.sm
            }}>
                <form onSubmit={sendMessage} style={{ display: "flex", gap: spacing.sm }}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder="Type a message..."
                        style={{
                            flex: 1,
                            padding: spacing.sm,
                            border: `1px solid ${colors.gray[300]}`,
                            borderRadius: borderRadius.lg,
                            fontSize: typography.body,
                            outline: "none"
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        style={{
                            backgroundColor: newMessage.trim() ? colors.primary : colors.gray[400],
                            color: colors.white,
                            border: "none",
                            padding: "12px 24px",
                            borderRadius: borderRadius.lg,
                            cursor: newMessage.trim() ? "pointer" : "not-allowed",
                            transition: "background-color 0.2s"
                        }}
                    >
                        Send
                    </button>
                </form>
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ForumChat;

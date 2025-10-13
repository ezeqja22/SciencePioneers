import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { colors, spacing, typography, shadows, borderRadius } from './designSystem';
import { getUserInitial, getDisplayName } from './utils';
import Header from './components/Header';

function ThreadPage() {
    const { forumId, messageId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    
    const [forum, setForum] = useState(null);
    const [originalMessage, setOriginalMessage] = useState(null);
    const [replies, setReplies] = useState([]);
    const [newReply, setNewReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [replyCounts, setReplyCounts] = useState({});
    const [userRole, setUserRole] = useState('member');
    
    // Get scroll position from location state
    const scrollPosition = location.state?.scrollPosition || 0;

    useEffect(() => {
        fetchCurrentUser();
        fetchForumData();
        fetchOriginalMessage();
        fetchReplies();
    }, [forumId, messageId]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get("${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    };

    const fetchForumData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setForum(response.data);
            
            // Get user role in forum
            const membersResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userMembership = membersResponse.data.find(member => member.user_id === currentUser?.id);
            if (userMembership) {
                setUserRole(userMembership.role);
            }
        } catch (error) {
            console.error("Error fetching forum:", error);
            setError("Failed to load forum");
        }
    };

    const fetchOriginalMessage = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const message = response.data.find(msg => msg.id === parseInt(messageId));
            setOriginalMessage(message);
        } catch (error) {
            console.error("Error fetching original message:", error);
        }
    };

    const fetchReplies = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/${messageId}/replies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReplies(response.data);
        } catch (error) {
            console.error("Error fetching replies:", error);
        } finally {
            setLoading(false);
        }
    };

    const sendReply = async () => {
        if (!newReply.trim()) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/${messageId}/replies`, 
                { content: newReply, parent_message_id: parseInt(messageId) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setNewReply('');
            fetchReplies(); // Refresh replies
        } catch (error) {
            console.error("Error sending reply:", error);
        }
    };

    const handleBackToForum = () => {
        navigate(`/forum/${forumId}`, { 
            state: { scrollPosition: scrollPosition }
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendReply();
        }
    };

    // Permission helpers
    const hasPermission = (permission) => {
        if (userRole === 'creator') return true;
        if (userRole === 'moderator') return ['moderate', 'pin', 'kick'].includes(permission);
        if (userRole === 'helper') return ['pin'].includes(permission);
        return false;
    };

    const canDeleteReply = (reply) => {
        return (
            reply.author_id === currentUser?.id ||  // Author can delete their own reply
            hasPermission('moderate')  // Moderator/creator can delete any reply
        );
    };

    // Delete a reply
    const deleteReply = async (replyId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/replies/${replyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            fetchReplies(); // Refresh replies
        } catch (error) {
            console.error("Error deleting reply:", error);
        }
    };

    // Auto-scroll to bottom when new replies are added
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [replies]);

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '18px', color: colors.gray[600] }}>Loading thread...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '18px', color: colors.error }}>{error}</div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                backgroundColor: colors.light
            }}>
                {/* Thread Header */}
                <div style={{
                    backgroundColor: colors.white,
                    padding: spacing.md,
                    borderBottom: `1px solid ${colors.gray[200]}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md
                }}>
                    <button
                        onClick={handleBackToForum}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: colors.gray[600],
                            padding: '8px',
                            borderRadius: borderRadius.sm,
                            transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        ← Back to Forum
                    </button>
                    <div>
                        <h1 style={{ 
                            margin: 0, 
                            fontSize: typography.fontSize.lg, 
                            color: colors.primary 
                        }}>
                            Thread Discussion
                        </h1>
                        <p style={{ 
                            margin: 0, 
                            fontSize: typography.fontSize.sm, 
                            color: colors.gray[600] 
                        }}>
                            {forum?.title} • {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </p>
                    </div>
                </div>

                {/* Original Message Banner */}
                {originalMessage && (
                    <div style={{
                        backgroundColor: colors.primary,
                        color: colors.white,
                        padding: spacing.md,
                        margin: spacing.md,
                        borderRadius: borderRadius.md,
                        boxShadow: shadows.sm
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: colors.white,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: colors.primary,
                                fontSize: '14px',
                                backgroundImage: originalMessage.author?.profile_picture ? `url(${originalMessage.author.profile_picture})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}>
                                {!originalMessage.author?.profile_picture && getUserInitial(originalMessage.author?.username || '?')}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: typography.fontSize.sm }}>
                                    {getDisplayName(originalMessage.author?.username || 'Unknown')}
                                </div>
                                <div style={{ fontSize: typography.fontSize.xs, opacity: 0.8 }}>
                                    {new Date(originalMessage.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div style={{ fontSize: typography.fontSize.base, lineHeight: 1.5 }}>
                            {originalMessage.content}
                        </div>
                    </div>
                )}

                {/* Replies */}
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: `0 ${spacing.md}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.sm
                }}>
                    {replies.map((reply) => (
                        <div key={reply.id} style={{
                            backgroundColor: colors.white,
                            padding: spacing.md,
                            borderRadius: borderRadius.md,
                            boxShadow: shadows.sm,
                            display: 'flex',
                            gap: spacing.sm
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: colors.primary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: colors.white,
                                fontSize: '16px',
                                backgroundImage: reply.author?.profile_picture ? `url(${reply.author.profile_picture})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}>
                                {!reply.author?.profile_picture && getUserInitial(reply.author?.username || '?')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: spacing.sm, 
                                    marginBottom: spacing.xs 
                                }}>
                                    <span style={{ 
                                        fontWeight: '600', 
                                        color: colors.gray[800],
                                        fontSize: typography.fontSize.sm
                                    }}>
                                        {getDisplayName(reply.author?.username || 'Unknown')}
                                    </span>
                                    <span style={{ 
                                        color: colors.gray[500], 
                                        fontSize: typography.fontSize.xs 
                                    }}>
                                        {new Date(reply.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ 
                                    color: colors.gray[700], 
                                    lineHeight: 1.5,
                                    fontSize: typography.fontSize.sm
                                }}>
                                    {reply.content}
                                </div>
                            </div>
                            {/* Delete button for reply */}
                            {canDeleteReply(reply) && (
                                <button
                                    onClick={() => deleteReply(reply.id)}
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: colors.error,
                                        cursor: 'pointer',
                                        padding: spacing.xs,
                                        borderRadius: borderRadius.sm,
                                        fontSize: typography.fontSize.xs,
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    
                                </button>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <div style={{
                    backgroundColor: colors.white,
                    padding: spacing.md,
                    borderTop: `1px solid ${colors.gray[200]}`,
                    display: 'flex',
                    gap: spacing.sm
                }}>
                    <textarea
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Write a reply..."
                        style={{
                            flex: 1,
                            padding: spacing.sm,
                            border: `1px solid ${colors.gray[300]}`,
                            borderRadius: borderRadius.md,
                            fontSize: typography.fontSize.sm,
                            resize: 'none',
                            minHeight: '40px',
                            maxHeight: '120px',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button
                        onClick={sendReply}
                        disabled={!newReply.trim()}
                        style={{
                            backgroundColor: newReply.trim() ? colors.primary : colors.gray[300],
                            color: colors.white,
                            border: 'none',
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: borderRadius.md,
                            cursor: newReply.trim() ? 'pointer' : 'not-allowed',
                            fontSize: typography.fontSize.sm,
                            fontWeight: '600',
                            transition: 'background-color 0.2s ease'
                        }}
                    >
                        Reply
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ThreadPage;

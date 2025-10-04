import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import Card from './components/Card';
import Button from './components/Button';
import BackButton from './components/BackButton';
import AnimatedLoader from './components/AnimatedLoader';
import Header from './components/Header';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';
import { getUserInitial, getDisplayName } from './utils';

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

const ForumDetail = () => {
    const { forumId } = useParams();
    const navigate = useNavigate();
    const [forum, setForum] = useState(null);
    const [problems, setProblems] = useState([]);
    const [members, setMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('members'); // 'members', 'problems'
    const [showChat, setShowChat] = useState(() => {
        const saved = localStorage.getItem(`forum-${forumId}-chat-open`);
        return saved === 'true';
    });
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchCurrentUser(),
                    fetchForum(),
                    fetchProblems(),
                    fetchMembers()
                ]);
            } catch (error) {
                console.error("Error loading initial data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadInitialData();
    }, [forumId]);

    useEffect(() => {
        if (showChat) {
            fetchMessages();
            // Set up polling for new messages
            const interval = setInterval(fetchMessages, 2000);
            return () => clearInterval(interval);
        }
    }, [showChat, forumId]);

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
            if (!token) return;

            console.log("Fetching forum:", forumId);
            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Forum response:", response.data);
            setForum(response.data);
        } catch (error) {
            console.error("Error fetching forum:", error);
            console.error("Error response:", error.response);
            if (error.response?.status === 404) {
                setError("Forum not found");
            } else {
                setError(`Failed to load forum: ${error.response?.data?.detail || error.message}`);
            }
            throw error; // Re-throw to be caught by the calling function
        }
    };

    const fetchProblems = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}/problems`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProblems(response.data);
        } catch (error) {
            console.error("Error fetching problems:", error);
        }
    };

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Members response:", response.data);
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    };

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Messages response:", response.data);
            setMessages(response.data.reverse());
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/messages`, {
                content: newMessage,
                message_type: "text"
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNewMessage('');
            fetchMessages();
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleJoinForum = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/join`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            fetchMembers();
            alert("Successfully joined the forum!");
        } catch (error) {
            console.error("Error joining forum:", error);
            alert("Failed to join forum");
        }
    };

    const handleLeaveForum = async () => {
        if (!window.confirm("Are you sure you want to leave this forum?")) return;
        
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`http://127.0.0.1:8000/auth/forums/${forumId}/leave`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            navigate('/forums');
        } catch (error) {
            console.error("Error leaving forum:", error);
            alert("Failed to leave forum");
        }
    };

    const toggleChat = () => {
        const newState = !showChat;
        setShowChat(newState);
        localStorage.setItem(`forum-${forumId}-chat-open`, newState.toString());
    };

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.light
            }}>
                <AnimatedLoader type="profile" message="Loading forum..." size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.light
            }}>
                <div style={{ textAlign: "center", padding: spacing.xl }}>
                    <h2 style={{ color: colors.error, marginBottom: spacing.md }}>{error}</h2>
                    <Button onClick={() => navigate('/forums')}>Back to Forums</Button>
                </div>
            </div>
        );
    }

    if (!forum) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.light
            }}>
                <div style={{ textAlign: "center", padding: spacing.xl }}>
                    <h2 style={{ color: colors.error, marginBottom: spacing.md }}>Forum not found</h2>
                    <Button onClick={() => navigate('/forums')}>Back to Forums</Button>
                </div>
            </div>
        );
    }

    const isMember = members.some(member => member.user_id === currentUser?.id && member.is_active);
    const isCreator = members.some(member => member.user_id === currentUser?.id && member.role === 'creator');

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            
            {/* Main Content */}
            <div style={{
                display: 'flex',
                height: 'calc(100vh - 80px)',
                transition: 'all 0.3s ease-in-out'
            }}>
                {/* Forum Info Panel */}
                <div style={{
                    width: showChat ? (isMobile ? '0%' : '30%') : '100%',
                    minWidth: showChat ? (isMobile ? '0px' : '300px') : 'auto',
                    transition: 'all 0.3s ease-in-out',
                    overflow: 'hidden',
                    borderRight: showChat ? `1px solid ${colors.gray[200]}` : 'none'
                }}>
                    <div style={{ padding: spacing.lg, height: '100%', overflowY: 'auto' }}>
                        <BackButton fallbackPath="/forums" />
                        
                        <div style={{ marginTop: spacing.md }}>
                            <h1 style={{ 
                                color: colors.primary, 
                                marginBottom: spacing.sm,
                                fontSize: typography.fontSize["3xl"]
                            }}>
                                {forum.title}
                            </h1>
                            <p style={{ 
                                color: colors.gray[600], 
                                marginBottom: spacing.md,
                                fontSize: typography.fontSize.base
                            }}>
                                {forum.description}
                            </p>
                            <div style={{ 
                                color: colors.gray[500], 
                                marginBottom: spacing.lg,
                                fontSize: typography.fontSize.sm
                            }}>
                                {members.length}/{forum.max_members} members {forum.is_private ? 'Private' : 'Public'}
                            </div>
                        </div>

                        <div style={{ 
                            display: 'flex', 
                            gap: spacing.sm, 
                            marginBottom: spacing.lg,
                            flexWrap: 'wrap'
                        }}>
                            <Button
                                onClick={toggleChat}
                                style={{
                                    backgroundColor: colors.primary,
                                    color: colors.white,
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: borderRadius.md,
                                    cursor: 'pointer',
                                    fontSize: typography.fontSize.base,
                                    fontWeight: '600'
                                }}
                            >
                                {showChat ? 'Close Chat' : 'Open Chat'}
                            </Button>
                            
                            {isMember && !isCreator && (
                                <Button
                                    onClick={handleLeaveForum}
                                    style={{
                                        backgroundColor: colors.gray[400],
                                        color: colors.white,
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: borderRadius.md,
                                        cursor: 'pointer',
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = colors.error;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = colors.gray[400];
                                    }}
                                >
                                    Leave Forum
                                </Button>
                            )}
                            
                            {!isMember && (
                                <Button
                                    onClick={handleJoinForum}
                                    style={{
                                        backgroundColor: colors.primary,
                                        color: colors.white,
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: borderRadius.md,
                                        cursor: 'pointer',
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '600'
                                    }}
                                >
                                    Join Forum
                                </Button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            borderBottom: `2px solid ${colors.gray[200]}`,
                            marginBottom: spacing.lg
                        }}>
                            <button
                                onClick={() => setActiveTab('members')}
                                style={{
                                    padding: '12px 24px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: activeTab === 'members' ? colors.primary : colors.gray[600],
                                    borderBottom: activeTab === 'members' ? `2px solid ${colors.primary}` : '2px solid transparent',
                                    cursor: 'pointer',
                                    fontSize: typography.fontSize.base,
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Members ({members.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('problems')}
                                style={{
                                    padding: '12px 24px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: activeTab === 'problems' ? colors.primary : colors.gray[600],
                                    borderBottom: activeTab === 'problems' ? `2px solid ${colors.primary}` : '2px solid transparent',
                                    cursor: 'pointer',
                                    fontSize: typography.fontSize.base,
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Problems ({problems.length})
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'members' && (
                            <div>
                                {members.map((member) => (
                                    <Card key={member.id} style={{ marginBottom: spacing.md }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: colors.primary,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: colors.white,
                                                fontSize: '18px',
                                                backgroundImage: member.user?.profile_picture ? `url(${member.user.profile_picture})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}>
                                                {!member.user?.profile_picture && getUserInitial(member.user?.username || '?')}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: "0 0 4px 0", color: colors.gray[800] }}>
                                                    {getDisplayName(member.user?.username || 'Unknown')}
                                                </h4>
                                                <span style={{ 
                                                    color: colors.gray[500], 
                                                    fontSize: "0.9rem" 
                                                }}>
                                                    Joined {new Date(member.joined_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <span style={{
                                                backgroundColor: member.role === 'creator' ? colors.primary : 
                                                              member.role === 'moderator' ? colors.warning : colors.gray[400],
                                                color: colors.white,
                                                padding: "4px 12px",
                                                borderRadius: borderRadius.sm,
                                                fontSize: "0.8rem",
                                                fontWeight: "600"
                                            }}>
                                                {member.role === 'creator' ? 'Creator' : 
                                                 member.role === 'moderator' ? 'Moderator' : 'Member'}
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {activeTab === 'problems' && (
                            <div>
                                {problems.length === 0 ? (
                                    <p style={{ color: colors.gray[500], textAlign: 'center', padding: spacing.xl }}>
                                        No problems posted yet
                                    </p>
                                ) : (
                                    problems.map((problem) => (
                                        <Card key={problem.id} style={{ marginBottom: spacing.md }}>
                                            <h4 style={{ margin: "0 0 8px 0", color: colors.gray[800] }}>
                                                {renderMathContent(problem.title)}
                                            </h4>
                                            <p style={{ 
                                                color: colors.gray[600], 
                                                margin: "0 0 8px 0",
                                                fontSize: "0.9rem"
                                            }}>
                                                {renderMathContent(problem.description)}
                                            </p>
                                            <div style={{ 
                                                color: colors.gray[500], 
                                                fontSize: "0.8rem" 
                                            }}>
                                                Posted by {getDisplayName(problem.author?.username || 'Unknown')} • {new Date(problem.posted_at).toLocaleDateString()}
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Panel */}
                {showChat && (
                    <div style={{
                        width: isMobile ? '100%' : '70%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: colors.light,
                        transition: 'all 0.3s ease-in-out'
                    }}>
                        {/* Chat Header */}
                        <div style={{
                            backgroundColor: colors.gray[100],
                            color: colors.gray[800],
                            padding: spacing.md,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: `1px solid ${colors.gray[200]}`
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.primary }}>
                                    Chat
                                </h3>
                                <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.gray[600] }}>
                                    {members.length} members online
                                </p>
                            </div>
                            {isMobile && (
                                <button
                                    onClick={toggleChat}
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: colors.gray[600],
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '8px'
                                    }}
                                >
                                    ↓
                                </button>
                            )}
                        </div>

                        {/* Messages */}
                        <div style={{
                            flex: 1,
                            padding: spacing.md,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: spacing.sm
                        }}>
                            {messages.length === 0 ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    color: colors.gray[500], 
                                    padding: spacing.xl 
                                }}>
                                    No messages yet. Start the conversation!
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isOwnMessage = message.author_id === currentUser?.id;
                                    return (
                                        <div
                                            key={message.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                                                marginBottom: spacing.sm,
                                                alignItems: 'flex-end',
                                                gap: spacing.sm
                                            }}
                                        >
                                            {!isOwnMessage && (
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    backgroundColor: colors.primary,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: colors.white,
                                                    fontSize: '14px',
                                                    flexShrink: 0,
                                                    backgroundImage: message.author?.profile_picture ? `url(${message.author.profile_picture})` : 'none',
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                }}>
                                                    {!message.author?.profile_picture && getUserInitial(message.author?.username || '?')}
                                                </div>
                                            )}
                                            
                                            <div style={{
                                                maxWidth: '70%',
                                                backgroundColor: isOwnMessage ? colors.primary : colors.white,
                                                color: isOwnMessage ? colors.white : colors.gray[800],
                                                padding: spacing.md,
                                                borderRadius: borderRadius.lg,
                                                boxShadow: shadows.sm,
                                                position: 'relative'
                                            }}>
                                                {!isOwnMessage && (
                                                    <div style={{
                                                        fontSize: '0.8rem',
                                                        marginBottom: "4px",
                                                        color: colors.primary,
                                                        fontWeight: '600'
                                                    }}>
                                                        {getDisplayName(message.author?.username || 'Unknown')}
                                                    </div>
                                                )}
                                                
                                                {message.message_type === 'text' ? (
                                                    <div style={{ whiteSpace: "pre-wrap" }}>
                                                        {renderMathContent(message.content)}
                                                    </div>
                                                ) : (
                                                    <div>Problem message</div>
                                                )}
                                                
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    opacity: 0.7,
                                                    marginTop: spacing.xs,
                                                    textAlign: 'right'
                                                }}>
                                                    {new Date(message.created_at).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Message Input */}
                        <form onSubmit={sendMessage} style={{
                            padding: spacing.md,
                            backgroundColor: colors.white,
                            borderTop: `1px solid ${colors.gray[200]}`
                        }}>
                            <div style={{ display: 'flex', gap: spacing.sm }}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1,
                                        padding: spacing.md,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: 'none'
                                    }}
                                />
                                <Button
                                    type="submit"
                                    style={{
                                        backgroundColor: colors.primary,
                                        color: colors.white,
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: borderRadius.md,
                                        cursor: 'pointer',
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '600'
                                    }}
                                >
                                    Send
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForumDetail;
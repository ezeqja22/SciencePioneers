import React, { useState, useEffect, useRef } from 'react';
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
import ForumProblemModal from './ForumProblemModal';
import ForumProblemCard from './ForumProblemCard';

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
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [showProblemModal, setShowProblemModal] = useState(false);
    const [showMathModal, setShowMathModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [mathPreview, setMathPreview] = useState('');
    const [mathLatex, setMathLatex] = useState('');
    const [activeMathTab, setActiveMathTab] = useState('basic');
    const [problemData, setProblemData] = useState({});
    const messagesEndRef = useRef(null);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    
    // Auto-scroll to bottom only when chat is first opened
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        // Only auto-scroll if chat is open and we haven't scrolled yet
        if (showChat && !hasScrolledToBottom) {
            scrollToBottom();
            setHasScrolledToBottom(true);
        }
    }, [showChat, messages]);
    
    // Filter states
    const [filters, setFilters] = useState({
        subject: '',
        level: '',
        year: '',
        tag: ''
    });
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
    const [showSortDropdown, setShowSortDropdown] = useState(false);

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

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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
            console.log("DEBUG: Forum problems fetched:", response.data);
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
            const messages = response.data.reverse();
            setMessages(messages);

            // Fetch problem data for problem messages
            const problemIds = messages
                .filter(msg => msg.message_type === 'problem' && msg.problem_id)
                .map(msg => msg.problem_id);

            if (problemIds.length > 0) {
                const problemPromises = problemIds.map(id => 
                    axios.get(`http://127.0.0.1:8000/auth/problems/id/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(res => ({ id, data: res.data }))
                    .catch(err => {
                        console.error(`Error fetching problem ${id}:`, err);
                        return { id, data: null };
                    })
                );
                const problemResults = await Promise.all(problemPromises);
                const problemMap = {};
                problemResults.forEach(({ id, data }) => {
                    if (data && data.id) {
                        problemMap[id] = data;
                    }
                });
                setProblemData(problemMap);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const sendMessage = async (e, messageType = "text", content = null) => {
        if (e) e.preventDefault();
        
        const messageContent = content || newMessage;
        if (!messageContent.trim() && messageType === "text") return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/messages`, {
                content: messageContent,
                message_type: messageType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (messageType === "text") {
                setNewMessage('');
            }
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

    const handleDeleteForum = () => {
        setShowDeleteModal(true);
    };

    const handleAttachmentClick = () => {
        setShowAttachmentMenu(!showAttachmentMenu);
    };

    const handleCreateProblem = () => {
        setShowAttachmentMenu(false);
        setShowProblemModal(true);
    };

    const handleUploadImage = () => {
        setShowAttachmentMenu(false);
        // Trigger file input for image selection
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadImageToForum(file);
            }
        };
        fileInput.click();
    };

    const uploadImageToForum = async (file) => {
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append('file', file);
            formData.append('forum_id', forumId);

            const response = await axios.post(
                "http://127.0.0.1:8000/auth/forums/upload-image",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            // Send the image as a message
            await sendMessage('', 'image', response.data.file_path);
            
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Error uploading image. Please try again.");
        }
    };

    const handleMathSymbols = () => {
        setShowAttachmentMenu(false);
        setShowMathModal(true);
    };

    const handleProblemCreated = (problem) => {
        fetchMessages(); // Refresh messages to show the new problem
    };

    // Filter handlers
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const handleSortChange = (order) => {
        setSortOrder(order);
        setShowSortDropdown(false);
    };

    const clearFilters = () => {
        setFilters({
            subject: '',
            level: '',
            year: '',
            tag: ''
        });
    };

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showSortDropdown && !event.target.closest('.sort-dropdown')) {
                setShowSortDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSortDropdown]);

    // Filter and sort problems
    const filteredProblems = problems.filter(problem => {
        // Subject filter
        if (filters.subject && problem.subject !== filters.subject) {
            return false;
        }
        
        // Level filter
        if (filters.level && !problem.level.toLowerCase().includes(filters.level.toLowerCase())) {
            return false;
        }
        
        // Year filter
        if (filters.year && problem.year !== parseInt(filters.year)) {
            return false;
        }
        
        // Tag filter
        if (filters.tag && (!problem.tags || !problem.tags.toLowerCase().includes(filters.tag.toLowerCase()))) {
            return false;
        }
        
        return true;
    }).sort((a, b) => {
        if (sortOrder === 'newest') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else {
            return new Date(a.created_at) - new Date(b.created_at);
        }
    });

    const confirmDeleteForum = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`http://127.0.0.1:8000/auth/forums/${forumId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            alert("Forum deleted successfully");
            navigate('/forums');
        } catch (error) {
            console.error("Error deleting forum:", error);
            alert("Failed to delete forum");
        } finally {
            setShowDeleteModal(false);
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
                            
                            {isCreator && (
                                <Button
                                    onClick={handleDeleteForum}
                                    style={{
                                        backgroundColor: colors.error,
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
                                        e.target.style.backgroundColor = '#c82333';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = colors.error;
                                    }}
                                >
                                    Delete Forum
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
                                {/* Filter Controls */}
                                <div style={{
                                    backgroundColor: colors.gray[50],
                                    padding: spacing.md,
                                    borderRadius: borderRadius.md,
                                    marginBottom: spacing.md,
                                    border: `1px solid ${colors.gray[200]}`
                                }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', marginBottom: spacing.sm }}>
                                        {/* Subject Filter */}
                                        <div style={{ minWidth: '150px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: colors.gray[600], marginBottom: '4px' }}>
                                                Subject:
                                            </label>
                                            <select
                                                value={filters.subject}
                                                onChange={(e) => handleFilterChange('subject', e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    border: `1px solid ${colors.gray[300]}`,
                                                    borderRadius: borderRadius.sm,
                                                    fontSize: '0.9rem',
                                                    backgroundColor: colors.white
                                                }}
                                            >
                                                <option value="">All Subjects</option>
                                                <option value="Mathematics">Mathematics</option>
                                                <option value="Physics">Physics</option>
                                                <option value="Chemistry">Chemistry</option>
                                                <option value="Biology">Biology</option>
                                                <option value="Computer Science">Computer Science</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        {/* Level Filter */}
                                        <div style={{ minWidth: '120px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: colors.gray[600], marginBottom: '4px' }}>
                                                Level:
                                            </label>
                                            <input
                                                type="text"
                                                value={filters.level}
                                                onChange={(e) => handleFilterChange('level', e.target.value)}
                                                placeholder="e.g. Grade 10"
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    border: `1px solid ${colors.gray[300]}`,
                                                    borderRadius: borderRadius.sm,
                                                    fontSize: '0.9rem'
                                                }}
                                            />
                                        </div>

                                        {/* Year Filter */}
                                        <div style={{ minWidth: '100px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: colors.gray[600], marginBottom: '4px' }}>
                                                Year:
                                            </label>
                                            <input
                                                type="number"
                                                value={filters.year}
                                                onChange={(e) => handleFilterChange('year', e.target.value)}
                                                placeholder="2024"
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    border: `1px solid ${colors.gray[300]}`,
                                                    borderRadius: borderRadius.sm,
                                                    fontSize: '0.9rem'
                                                }}
                                            />
                                        </div>

                                        {/* Tag Filter */}
                                        <div style={{ minWidth: '120px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: colors.gray[600], marginBottom: '4px' }}>
                                                Tag:
                                            </label>
                                            <input
                                                type="text"
                                                value={filters.tag}
                                                onChange={(e) => handleFilterChange('tag', e.target.value)}
                                                placeholder="e.g. algebra"
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    border: `1px solid ${colors.gray[300]}`,
                                                    borderRadius: borderRadius.sm,
                                                    fontSize: '0.9rem'
                                                }}
                                            />
                                        </div>

                                        {/* Sort Dropdown */}
                                        <div style={{ minWidth: '120px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: colors.gray[600], marginBottom: '4px' }}>
                                                Sort:
                                            </label>
                                            <div style={{ position: 'relative' }} className="sort-dropdown">
                                                <button
                                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 8px',
                                                        border: `1px solid ${colors.gray[300]}`,
                                                        borderRadius: borderRadius.sm,
                                                        fontSize: '0.9rem',
                                                        backgroundColor: colors.white,
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                                                    <span style={{ fontSize: '0.8rem' }}>▼</span>
                                                </button>
                                                
                                                {showSortDropdown && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        backgroundColor: colors.white,
                                                        border: `1px solid ${colors.gray[300]}`,
                                                        borderRadius: borderRadius.sm,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                        zIndex: 10
                                                    }}>
                                                        <button
                                                            onClick={() => handleSortChange('newest')}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                border: 'none',
                                                                backgroundColor: 'transparent',
                                                                textAlign: 'left',
                                                                cursor: 'pointer',
                                                                fontSize: '0.9rem'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[50]}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                        >
                                                            Newest First
                                                        </button>
                                                        <button
                                                            onClick={() => handleSortChange('oldest')}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                border: 'none',
                                                                backgroundColor: 'transparent',
                                                                textAlign: 'left',
                                                                cursor: 'pointer',
                                                                fontSize: '0.9rem'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[50]}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                        >
                                                            Oldest First
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Clear Filters Button */}
                                        <div style={{ alignSelf: 'flex-end' }}>
                                            <button
                                                onClick={clearFilters}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: colors.gray[200],
                                                    color: colors.gray[700],
                                                    border: 'none',
                                                    borderRadius: borderRadius.sm,
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[300]}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = colors.gray[200]}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {filteredProblems.length === 0 ? (
                                    <p style={{ color: colors.gray[500], textAlign: 'center', padding: spacing.xl }}>
                                        {problems.length === 0 ? 'No problems posted yet' : 'No problems match your filters'}
                                    </p>
                                ) : (
                                    filteredProblems.map((problem) => (
                                        <Card 
                                            key={problem.id} 
                                            style={{ 
                                                marginBottom: spacing.md,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: colors.gray[50]
                                                }
                                            }}
                                            onClick={() => navigate(`/problem/${problem.id}?from=forum&forumId=${forumId}`)}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = colors.gray[50];
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = colors.white;
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = shadows.sm;
                                            }}
                                        >
                                            <h4 style={{ 
                                                margin: "0 0 8px 0", 
                                                color: colors.gray[800],
                                                pointerEvents: "none"
                                            }}>
                                                {renderMathContent(problem.title)}
                                            </h4>
                                            <p style={{ 
                                                color: colors.gray[600], 
                                                margin: "0 0 12px 0",
                                                fontSize: "0.9rem",
                                                pointerEvents: "none"
                                            }}>
                                                {renderMathContent(problem.description)}
                                            </p>
                                            
                                            {/* Badges */}
                                            <div style={{ 
                                                display: "flex", 
                                                gap: "8px", 
                                                marginBottom: "12px", 
                                                alignItems: "center", 
                                                flexWrap: "wrap",
                                                pointerEvents: "none"
                                            }}>
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
                                                    <div style={{ 
                                                        display: "flex", 
                                                        flexWrap: "wrap", 
                                                        gap: "8px",
                                                        pointerEvents: "none"
                                                    }}>
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
                                                                >
                                                                    {trimmedTag}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div style={{ 
                                                color: colors.gray[500], 
                                                fontSize: "0.8rem",
                                                pointerEvents: "none"
                                            }}>
                                                Posted by {getDisplayName(problem.author?.username || 'Unknown')} • {new Date(problem.created_at).toLocaleDateString()}
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
                        transition: 'all 0.3s ease-in-out',
                        position: 'relative'
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
                                                ) : message.message_type === 'image' ? (
                                                    <div style={{ marginTop: spacing.sm }}>
                                                        <img 
                                                            src={`http://127.0.0.1:8000/auth/serve-image/${message.content.split('/').pop()}`}
                                                            alt="Forum image"
                                                            style={{
                                                                maxWidth: '100%',
                                                                maxHeight: '400px',
                                                                borderRadius: borderRadius.md,
                                                                boxShadow: shadows.sm,
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => {
                                                                setSelectedImage(`http://127.0.0.1:8000/auth/serve-image/${message.content.split('/').pop()}`);
                                                                setShowImageModal(true);
                                                            }}
                                                        />
                                                    </div>
                                                ) : message.message_type === 'problem' ? (
                                                    <div style={{ marginTop: spacing.sm }}>
                                                        {problemData[message.problem_id] ? (
                                                            <ForumProblemCard 
                                                                problem={problemData[message.problem_id]} 
                                                                author={message.author}
                                                                forumId={forumId}
                                                            />
                                                        ) : (
                                                            <div style={{ 
                                                                padding: spacing.sm, 
                                                                backgroundColor: colors.gray[100], 
                                                                borderRadius: borderRadius.md,
                                                                textAlign: 'center',
                                                                color: colors.gray[600]
                                                            }}>
                                                                Loading problem...
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>Unknown message type</div>
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
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={sendMessage} style={{
                            padding: spacing.md,
                            backgroundColor: colors.white,
                            borderTop: `1px solid ${colors.gray[200]}`
                        }}>
                            <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={handleAttachmentClick}
                                    style={{
                                        backgroundColor: colors.primary,
                                        color: colors.white,
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = colors.secondary;
                                        e.target.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = colors.primary;
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    +
                                </button>
                                
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

                        {/* Attachment Menu */}
                        {showAttachmentMenu && (
                            <div style={{
                                position: 'absolute',
                                bottom: '80px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: colors.white,
                                borderRadius: borderRadius.lg,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                border: `1px solid ${colors.gray[200]}`,
                                padding: spacing.lg,
                                zIndex: 1000,
                                width: '400px',
                                maxWidth: '90%',
                                animation: 'slideUp 0.3s ease-out',
                                marginLeft: '0',
                                marginRight: '0'
                            }}>
                                <div style={{ display: "flex", gap: spacing.md, justifyContent: "center" }}>
                                    <button 
                                        onClick={handleCreateProblem}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: spacing.sm,
                                            padding: spacing.md,
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: borderRadius.md,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            minWidth: '80px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.gray[100];
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div style={{ fontSize: "24px", marginBottom: spacing.xs }}>📝</div>
                                        <span style={{ 
                                            fontSize: typography.fontSize.sm,
                                            fontWeight: typography.fontWeight.medium
                                        }}>
                                            Problem
                                        </span>
                                    </button>
                                    
                                    <button 
                                        onClick={handleUploadImage}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: spacing.sm,
                                            padding: spacing.md,
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: borderRadius.md,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            minWidth: '80px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.gray[100];
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div style={{ fontSize: "24px", marginBottom: spacing.xs }}>🖼️</div>
                                        <span style={{ 
                                            fontSize: typography.fontSize.sm,
                                            fontWeight: typography.fontWeight.medium
                                        }}>
                                            Image
                                        </span>
                                    </button>
                                    
                                    <button 
                                        onClick={handleMathSymbols}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: spacing.sm,
                                            padding: spacing.md,
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: borderRadius.md,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            minWidth: '80px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.gray[100];
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div style={{ fontSize: "24px", marginBottom: spacing.xs }}>🧮</div>
                                        <span style={{ 
                                            fontSize: typography.fontSize.sm,
                                            fontWeight: typography.fontWeight.medium
                                        }}>
                                            Math
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Forum Problem Modal */}
            <ForumProblemModal
                isOpen={showProblemModal}
                onClose={() => setShowProblemModal(false)}
                forumId={forumId}
                onProblemCreated={handleProblemCreated}
            />
            
            {/* Math Symbols Modal */}
            {showMathModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}
                onClick={() => setShowMathModal(false)}
                >
                    <div style={{
                        backgroundColor: colors.white,
                        borderRadius: borderRadius.lg,
                        padding: spacing.xl,
                        maxWidth: '800px',
                        width: '95%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: shadows.lg
                    }}
                    onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px 0', color: colors.gray[800] }}>
                            Math Symbols
                        </h3>
                        
                        {/* LaTeX Editor and Preview Section */}
                        <div style={{
                            backgroundColor: colors.gray[50],
                            padding: spacing.md,
                            borderRadius: borderRadius.md,
                            marginBottom: spacing.lg,
                            border: `1px solid ${colors.gray[200]}`
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                                {/* LaTeX Editor */}
                                <div>
                                    <div style={{ fontSize: '14px', color: colors.gray[600], marginBottom: spacing.sm }}>
                                        LaTeX Editor:
                                    </div>
                                    <textarea
                                        value={mathLatex}
                                        onChange={(e) => setMathLatex(e.target.value)}
                                        placeholder="Type LaTeX here or click symbols..."
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            padding: spacing.sm,
                                            backgroundColor: colors.white,
                                            borderRadius: borderRadius.sm,
                                            border: `1px solid ${colors.gray[300]}`,
                                            fontSize: '14px',
                                            fontFamily: 'monospace',
                                            resize: 'vertical',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = colors.primary}
                                        onBlur={(e) => e.target.style.borderColor = colors.gray[300]}
                                    />
                                </div>
                                
                                {/* Live Preview */}
                                <div>
                                    <div style={{ fontSize: '14px', color: colors.gray[600], marginBottom: spacing.sm }}>
                                        Live Preview:
                                    </div>
                                    <div style={{
                                        minHeight: '80px',
                                        padding: spacing.sm,
                                        backgroundColor: colors.white,
                                        borderRadius: borderRadius.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        fontSize: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {mathLatex ? renderMathContent(mathLatex) : 'Preview will appear here...'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Category Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: spacing.xs,
                            marginBottom: spacing.lg,
                            flexWrap: 'wrap'
                        }}>
                            {Object.entries({
                                basic: 'Basic',
                                fractions: 'Fractions', 
                                powers: 'Powers',
                                integrals: 'Integrals',
                                derivatives: 'Derivatives',
                                greek: 'Greek',
                                sets: 'Sets',
                                geometry: 'Geometry',
                                logic: 'Logic'
                            }).map(([key, name]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveMathTab(key)}
                                    style={{
                                        padding: `${spacing.sm} ${spacing.md}`,
                                        border: 'none',
                                        borderRadius: borderRadius.md,
                                        backgroundColor: activeMathTab === key ? colors.primary : colors.gray[200],
                                        color: activeMathTab === key ? colors.white : colors.gray[700],
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                        
                        {/* Symbols Grid */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                            gap: spacing.sm, 
                            marginBottom: spacing.lg 
                        }}>
                            {(() => {
                                const symbolCategories = {
                                    basic: {
                                        symbols: [
                                            { symbol: '+', latex: '+' },
                                            { symbol: '-', latex: '-' },
                                            { symbol: '×', latex: '\\times' },
                                            { symbol: '÷', latex: '\\div' },
                                            { symbol: '=', latex: '=' },
                                            { symbol: '≠', latex: '\\neq' },
                                            { symbol: '<', latex: '<' },
                                            { symbol: '>', latex: '>' },
                                            { symbol: '≤', latex: '\\leq' },
                                            { symbol: '≥', latex: '\\geq' },
                                            { symbol: '±', latex: '\\pm' },
                                            { symbol: '∓', latex: '\\mp' },
                                            { symbol: '∞', latex: '\\infty' },
                                            { symbol: '∅', latex: '\\emptyset' }
                                        ]
                                    },
                                    fractions: {
                                        symbols: [
                                            { symbol: '½', latex: '\\frac{1}{2}' },
                                            { symbol: '⅓', latex: '\\frac{1}{3}' },
                                            { symbol: '¼', latex: '\\frac{1}{4}' },
                                            { symbol: '⅔', latex: '\\frac{2}{3}' },
                                            { symbol: '¾', latex: '\\frac{3}{4}' },
                                            { symbol: 'Fraction', latex: '\\frac{}{}', template: true },
                                            { symbol: 'Mixed', latex: '\\frac{}{} \\frac{}{}', template: true }
                                        ]
                                    },
                                    powers: {
                                        symbols: [
                                            { symbol: 'x²', latex: 'x^2' },
                                            { symbol: 'x³', latex: 'x^3' },
                                            { symbol: 'xⁿ', latex: 'x^n' },
                                            { symbol: '√', latex: '\\sqrt{}', template: true },
                                            { symbol: '∛', latex: '\\sqrt[3]{}', template: true },
                                            { symbol: '∜', latex: '\\sqrt[4]{}', template: true },
                                            { symbol: 'x₁', latex: 'x_1' },
                                            { symbol: 'x₂', latex: 'x_2' }
                                        ]
                                    },
                                    integrals: {
                                        symbols: [
                                            { symbol: '∫', latex: '\\int' },
                                            { symbol: '∬', latex: '\\iint' },
                                            { symbol: '∭', latex: '\\iiint' },
                                            { symbol: '∮', latex: '\\oint' },
                                            { symbol: '∫₀^∞', latex: '\\int_0^{\\infty}', template: true },
                                            { symbol: '∫_a^b', latex: '\\int_a^b', template: true }
                                        ]
                                    },
                                    derivatives: {
                                        symbols: [
                                            { symbol: '∂', latex: '\\partial' },
                                            { symbol: 'd/dx', latex: '\\frac{d}{dx}', template: true },
                                            { symbol: 'd²/dx²', latex: '\\frac{d^2}{dx^2}', template: true },
                                            { symbol: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}', template: true },
                                            { symbol: '∇', latex: '\\nabla' },
                                            { symbol: 'Δ', latex: '\\Delta' }
                                        ]
                                    },
                                    greek: {
                                        symbols: [
                                            { symbol: 'α', latex: '\\alpha' },
                                            { symbol: 'β', latex: '\\beta' },
                                            { symbol: 'γ', latex: '\\gamma' },
                                            { symbol: 'δ', latex: '\\delta' },
                                            { symbol: 'ε', latex: '\\varepsilon' },
                                            { symbol: 'ζ', latex: '\\zeta' },
                                            { symbol: 'η', latex: '\\eta' },
                                            { symbol: 'θ', latex: '\\theta' },
                                            { symbol: 'λ', latex: '\\lambda' },
                                            { symbol: 'μ', latex: '\\mu' },
                                            { symbol: 'π', latex: '\\pi' },
                                            { symbol: 'σ', latex: '\\sigma' },
                                            { symbol: 'τ', latex: '\\tau' },
                                            { symbol: 'φ', latex: '\\phi' },
                                            { symbol: 'ψ', latex: '\\psi' },
                                            { symbol: 'ω', latex: '\\omega' }
                                        ]
                                    },
                                    sets: {
                                        symbols: [
                                            { symbol: '∈', latex: '\\in' },
                                            { symbol: '∉', latex: '\\notin' },
                                            { symbol: '⊂', latex: '\\subset' },
                                            { symbol: '⊃', latex: '\\supset' },
                                            { symbol: '∪', latex: '\\cup' },
                                            { symbol: '∩', latex: '\\cap' },
                                            { symbol: 'ℝ', latex: '\\mathbb{R}' },
                                            { symbol: 'ℕ', latex: '\\mathbb{N}' },
                                            { symbol: 'ℤ', latex: '\\mathbb{Z}' },
                                            { symbol: 'ℚ', latex: '\\mathbb{Q}' },
                                            { symbol: 'ℂ', latex: '\\mathbb{C}' }
                                        ]
                                    },
                                    geometry: {
                                        symbols: [
                                            { symbol: '∠', latex: '\\angle' },
                                            { symbol: '⊥', latex: '\\perp' },
                                            { symbol: '∥', latex: '\\parallel' },
                                            { symbol: '△', latex: '\\triangle' },
                                            { symbol: '□', latex: '\\square' },
                                            { symbol: '○', latex: '\\circ' }
                                        ]
                                    },
                                    logic: {
                                        symbols: [
                                            { symbol: '∴', latex: '\\therefore' },
                                            { symbol: '∵', latex: '\\because' },
                                            { symbol: '∧', latex: '\\land' },
                                            { symbol: '∨', latex: '\\lor' },
                                            { symbol: '¬', latex: '\\neg' },
                                            { symbol: '→', latex: '\\rightarrow' },
                                            { symbol: '↔', latex: '\\leftrightarrow' },
                                            { symbol: '∀', latex: '\\forall' },
                                            { symbol: '∃', latex: '\\exists' }
                                        ]
                                    }
                                };
                                
                                const currentCategory = symbolCategories[activeMathTab];
                                if (!currentCategory) return null;
                                
                                return currentCategory.symbols.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setMathLatex(prev => prev + item.latex);
                                        }}
                                        style={{
                                            padding: spacing.sm,
                                            border: `1px solid ${colors.gray[300]}`,
                                            borderRadius: borderRadius.md,
                                            backgroundColor: colors.white,
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px',
                                            minHeight: '60px',
                                            justifyContent: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.gray[50];
                                            e.target.style.borderColor = colors.primary;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = colors.white;
                                            e.target.style.borderColor = colors.gray[300];
                                        }}
                                        title={`${item.symbol} - Click to add to editor`}
                                    >
                                        <span>{item.symbol}</span>
                                        {item.template && (
                                            <span style={{ fontSize: '10px', color: colors.gray[500] }}>Template</span>
                                        )}
                                    </button>
                                ));
                            })()}
                        </div>
                        
                        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', color: colors.gray[500] }}>
                                Click symbols to add to editor • Edit LaTeX directly • Live preview updates automatically
                            </div>
                            <div style={{ display: 'flex', gap: spacing.sm }}>
                                <button
                                    onClick={() => {
                                        if (mathLatex.trim()) {
                                            setNewMessage(prev => prev + mathLatex);
                                            setMathLatex('');
                                            setShowMathModal(false);
                                        }
                                    }}
                                    disabled={!mathLatex.trim()}
                                    style={{
                                        padding: `${spacing.sm} ${spacing.md}`,
                                        backgroundColor: mathLatex.trim() ? colors.primary : colors.gray[300],
                                        color: mathLatex.trim() ? colors.white : colors.gray[500],
                                        border: 'none',
                                        borderRadius: borderRadius.md,
                                        cursor: mathLatex.trim() ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    Insert
                                </button>
                                <button
                                    onClick={() => setMathLatex('')}
                                    disabled={!mathLatex.trim()}
                                    style={{
                                        padding: `${spacing.sm} ${spacing.md}`,
                                        backgroundColor: mathLatex.trim() ? colors.gray[200] : colors.gray[100],
                                        color: mathLatex.trim() ? colors.gray[700] : colors.gray[400],
                                        border: 'none',
                                        borderRadius: borderRadius.md,
                                        cursor: mathLatex.trim() ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => {
                                        setMathLatex('');
                                        setShowMathModal(false);
                                    }}
                                    style={{
                                        padding: `${spacing.sm} ${spacing.md}`,
                                        backgroundColor: colors.gray[200],
                                        color: colors.gray[700],
                                        border: 'none',
                                        borderRadius: borderRadius.md,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Image Zoom Modal */}
            {showImageModal && selectedImage && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001
                }}
                onClick={() => setShowImageModal(false)}
                >
                    <div style={{
                        position: 'relative',
                        maxWidth: '90vw',
                        maxHeight: '90vh'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowImageModal(false)}
                            style={{
                                position: 'absolute',
                                top: '-40px',
                                right: '0',
                                background: 'rgba(255, 255, 255, 0.9)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1002
                            }}
                        >
                            ×
                        </button>
                        <img
                            src={selectedImage}
                            alt="Forum image"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: borderRadius.md
                            }}
                        />
                    </div>
                </div>
            )}
            
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '32px',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    position: 'relative'
                }}>
                    {/* Close Button */}
                    <button
                        onClick={() => setShowDeleteModal(false)}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#6B7280',
                            padding: '4px'
                        }}
                    >
                        ×
                    </button>
                    
                    {/* Modal Content */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '16px'
                        }}>
                            ⚠️
                        </div>
                        
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#DC2626',
                            marginBottom: '16px',
                            margin: 0
                        }}>
                            Delete Forum
                        </h2>
                        
                        <p style={{
                            fontSize: '16px',
                            color: '#6B7280',
                            marginBottom: '24px',
                            lineHeight: '1.5'
                        }}>
                            Are you sure you want to delete this forum? This will permanently delete all messages, memberships, and forum data. This action cannot be undone.
                        </p>
                        
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center'
                        }}>
                            <Button
                                onClick={() => setShowDeleteModal(false)}
                                style={{
                                    backgroundColor: '#6B7280',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '600'
                                }}
                            >
                                Cancel
                            </Button>
                            
                            <Button
                                onClick={confirmDeleteForum}
                                style={{
                                    backgroundColor: '#DC2626',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '600'
                                }}
                            >
                                Yes, I'm Sure
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from {
                        transform: translateX(-50%) translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default ForumDetail;
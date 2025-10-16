import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import ForumInviteModal from './ForumInviteModal';
import ReportModal from './ReportModal';

// CSS for typing animation and new message indicator
const typingAnimation = `
@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
    }
    30% {
        transform: translateY(-10px);
        opacity: 1;
    }
}

@keyframes pulse {
    0%, 100% {
        transform: translateX(-50%) scale(1);
        opacity: 1;
    }
    50% {
        transform: translateX(-50%) scale(1.05);
        opacity: 0.8;
    }
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-3px);
    }
    60% {
        transform: translateY(-2px);
    }
}
`;

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
    
    // Add CSS animation to document
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = typingAnimation;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);
    const [forum, setForum] = useState(null);
    const [problems, setProblems] = useState([]);
    const [members, setMembers] = useState([]);
    const [bannedMembers, setBannedMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('members'); // 'members', 'problems', 'banned'
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
    const [onlineCount, setOnlineCount] = useState(0);
    const [isUserOnline, setIsUserOnline] = useState(false);
    const [onlineStatusInitialized, setOnlineStatusInitialized] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const messagesEndRef = useRef(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
    const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [pinnedMessage, setPinnedMessage] = useState(null);
    const [showMessageDropdown, setShowMessageDropdown] = useState(null);
    const [showMemberDropdown, setShowMemberDropdown] = useState(null);
    const [showEditForumModal, setShowEditForumModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportTarget, setReportTarget] = useState(null);
    const [editForumData, setEditForumData] = useState({
        name: '',
        description: '',
        is_private: false
    });
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const [replyCounts, setReplyCounts] = useState({});
    
    // Auto-scroll to bottom of messages
    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "end",
                    inline: "nearest"
                });
            }
        }, 300); // Increased delay to ensure DOM is ready
    };

    // Get location for scroll position restoration
    const location = useLocation();

    // Handle clicking the new message indicator
    const handleNewMessageClick = () => {
        setUserHasScrolledUp(false);
        setShowNewMessageIndicator(false);
        setNewMessageCount(0);
        scrollToBottom();
    };

    // Pin a message
    const pinMessage = async (messageId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/${messageId}/pin`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh messages to get updated pinned status
            fetchMessages();
        } catch (error) {
            console.error("Error pinning message:", error);
            console.error("Error details:", error.response?.data);
        }
    };

    // Unpin a message
    const unpinMessage = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/unpin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPinnedMessage(null);
        } catch (error) {
            console.error("Error unpinning message:", error);
            console.error("Error details:", error.response?.data);
            console.error("Status:", error.response?.status);
        }
    };

    // Delete a message
    const deleteMessage = async (messageId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh messages
            fetchMessages();
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    // Kick a member from the forum
    const kickMember = async (memberId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/members/${memberId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh members list
            fetchMembers();
        } catch (error) {
            console.error("Error kicking member:", error);
        }
    };

    // Ban a member from the forum
    const banMember = async (memberId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/members/${memberId}/ban`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh members list
            fetchMembers();
        } catch (error) {
            console.error("Error banning member:", error);
        }
    };

    // Open edit forum modal
    const openEditForumModal = () => {
        setEditForumData({
            name: forum?.name || '',
            description: forum?.description || '',
            is_private: forum?.is_private || false
        });
        setShowEditForumModal(true);
    };

    // Update forum
    const updateForum = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.put(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}`, editForumData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh forum data
            fetchForum();
            setShowEditForumModal(false);
        } catch (error) {
            console.error("Error updating forum:", error);
        }
    };

    // Fetch banned members
    const fetchBannedMembers = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/banned-members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBannedMembers(response.data);
        } catch (error) {
            console.error("Error fetching banned members:", error);
        }
    };

    // Unban a member
    const unbanMember = async (memberId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/members/${memberId}/unban`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh both banned and regular members lists
            fetchBannedMembers();
            fetchMembers();
        } catch (error) {
            console.error("Error unbanning member:", error);
        }
    };

    // Assign role to a member
    const assignRole = async (memberId, newRole) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/members/${memberId}/assign-role`, 
                { role: newRole }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Refresh members list
            fetchMembers();
        } catch (error) {
            console.error("Error assigning role:", error);
        }
    };

    // Fetch reply counts for all messages
    const fetchReplyCounts = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const counts = {};
            for (const message of messages) {
                try {
                    const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/${message.id}/reply-count`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    counts[message.id] = response.data.reply_count;
                } catch (error) {
                    console.error(`Error fetching reply count for message ${message.id}:`, error);
                    counts[message.id] = 0;
                }
            }
            setReplyCounts(counts);
        } catch (error) {
            console.error("Error fetching reply counts:", error);
        }
    };

    // Navigate to thread
    const navigateToThread = (messageId) => {
        // Store current scroll position
        const messagesContainer = document.querySelector('[data-messages-container]');
        const scrollPosition = messagesContainer?.scrollTop || 0;
        
        // Store in sessionStorage as backup
        sessionStorage.setItem(`forum_${forumId}_scroll`, scrollPosition.toString());
        sessionStorage.setItem(`forum_${forumId}_target_message`, messageId.toString());
        
        navigate(`/forum/${forumId}/thread/${messageId}`, { 
            state: { scrollPosition: scrollPosition, targetMessageId: messageId }
        });
    };

    // Scroll to pinned message and highlight it
    const scrollToPinnedMessage = () => {
        if (!pinnedMessage) return;
        
        // Find the pinned message element
        const messageElements = document.querySelectorAll('[data-message-id]');
        const pinnedElement = Array.from(messageElements).find(el => 
            el.getAttribute('data-message-id') === pinnedMessage.id.toString()
        );
        
        if (pinnedElement) {
            // Find the message bubble (the actual message content container)
            const messageBubble = pinnedElement.querySelector('[data-message-bubble]');
            
            // Scroll to the message
            pinnedElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Add subtle highlight effect to the area around the message bubble
            pinnedElement.style.position = 'relative';
            pinnedElement.style.transition = 'all 0.3s ease';
            
            // Create a pseudo-element for the background that doesn't cover the bubble
            const highlightDiv = document.createElement('div');
            highlightDiv.style.position = 'absolute';
            highlightDiv.style.top = '0';
            highlightDiv.style.left = '0';
            highlightDiv.style.right = '0';
            highlightDiv.style.bottom = '0';
            highlightDiv.style.backgroundColor = colors.primary;
            highlightDiv.style.opacity = '0.1';
            highlightDiv.style.borderRadius = borderRadius.md;
            highlightDiv.style.zIndex = '1';
            highlightDiv.setAttribute('data-highlight', 'true');
            
            // Insert the highlight div before the message bubble
            pinnedElement.insertBefore(highlightDiv, messageBubble);
            
            // Make sure the message bubble stays on top
            if (messageBubble) {
                messageBubble.style.position = 'relative';
                messageBubble.style.zIndex = '10';
            }
            
            // Remove highlight after 2 seconds
            setTimeout(() => {
                const highlight = pinnedElement.querySelector('[data-highlight="true"]');
                if (highlight) {
                    highlight.remove();
                }
                pinnedElement.style.position = '';
                if (messageBubble) {
                    messageBubble.style.position = '';
                    messageBubble.style.zIndex = '';
                }
            }, 2000);
        }
    };

    useEffect(() => {
        // Reset scroll state when chat is opened
        if (showChat) {
            setUserHasScrolledUp(false);
            setShowNewMessageIndicator(false);
            setNewMessageCount(0);
            setPrevMessageCount(0);
            // Scroll to bottom when chat is first opened - increased delay
            setTimeout(() => scrollToBottom(), 500);
        }
    }, [showChat]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMessageDropdown && !event.target.closest('[data-message-dropdown]')) {
                setShowMessageDropdown(null);
            }
            if (showMemberDropdown && !event.target.closest('[data-member-dropdown]')) {
                setShowMemberDropdown(null);
            }
            if (showActionsDropdown && !event.target.closest('[data-actions-dropdown]')) {
                setShowActionsDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMessageDropdown, showMemberDropdown, showActionsDropdown]);

    // Fetch reply counts when messages change
    useEffect(() => {
        if (messages.length > 0) {
            fetchReplyCounts();
        }
    }, [messages]);

    // Restore scroll position when component mounts (returning from thread)
    useEffect(() => {
        const targetMessageId = location.state?.targetMessageId || 
                               sessionStorage.getItem(`forum_${forumId}_target_message`);
        
        if (targetMessageId) {
            // Scroll to specific message
            setTimeout(() => {
                const targetElement = document.querySelector(`[data-message-id=${targetMessageId}]`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // If element not found, try again after a longer delay
                    setTimeout(() => {
                        const retryElement = document.querySelector(`[data-message-id=${targetMessageId}]`);
                        if (retryElement) {
                            retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 1000);
                }
                // Clear stored data
                sessionStorage.removeItem(`forum_${forumId}_target_message`);
            }, 500);
        }
    }, [forumId, location.state?.targetMessageId]);

    // Only scroll to bottom when chat is first opened, not on every message change
    useEffect(() => {
        if (showChat && messages.length > 0) {
            // Only scroll if user hasn't manually scrolled up
            if (!userHasScrolledUp) {
                scrollToBottom();
            }
        }
    }, [showChat]); // Only trigger when chat opens, not on every message

    // Auto-scroll when chat is opened (including on page refresh)
    useEffect(() => {
        if (showChat && messages.length > 0) {
            // Reset scroll state and scroll to bottom
            setUserHasScrolledUp(false);
            setTimeout(() => scrollToBottom(), 100);
        }
    }, [showChat]);


    // Track previous message count to detect new messages
    const [prevMessageCount, setPrevMessageCount] = useState(0);
    
    useEffect(() => {
        // Handle new messages - only show indicator when scrolled up
        if (showChat && messages.length > 0) {
            const currentMessageCount = messages.length;
            const hasNewMessages = currentMessageCount > prevMessageCount;
            
            if (userHasScrolledUp && hasNewMessages) {
                // User is scrolled up and there are new messages, show indicator
                setNewMessageCount(currentMessageCount - prevMessageCount); // Set to actual new message count, don't add to previous
                setShowNewMessageIndicator(true);
                
                // Auto-hide indicator after 5 seconds
                const timer = setTimeout(() => {
                    setShowNewMessageIndicator(false);
                }, 5000);
                
                return () => clearTimeout(timer);
            } else if (!userHasScrolledUp) {
                // User is at bottom, hide any existing indicator
                setShowNewMessageIndicator(false);
                setNewMessageCount(0);
            }
            
            setPrevMessageCount(currentMessageCount);
        }
    }, [showChat, messages, userHasScrolledUp, prevMessageCount]);

    // Add scroll listener to detect when user scrolls up
    useEffect(() => {
        if (!showChat) return;

        // Wait a bit for the DOM to be ready
        const timer = setTimeout(() => {
            const messagesContainer = document.querySelector('[data-messages-container]');
            if (!messagesContainer) {
                // Try alternative selector
                const altContainer = document.querySelector('div[style*="overflowY: auto"]');
                if (altContainer) {
                    attachScrollListener(altContainer);
                }
                return;
            }
            attachScrollListener(messagesContainer);
        }, 500);

        const attachScrollListener = (container) => {
            let scrollTimeout;
            const handleScroll = () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    const { scrollTop, scrollHeight, clientHeight } = container;
                    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
                    
                    if (isAtBottom) {
                        setUserHasScrolledUp(false);
                    } else {
                        setUserHasScrolledUp(true);
                    }
                }, 100);
            };

            container.addEventListener('scroll', handleScroll);
            
            return () => {
                container.removeEventListener('scroll', handleScroll);
                clearTimeout(scrollTimeout);
            };
        };

        return () => clearTimeout(timer);
    }, [showChat]);
    
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
            // Reset online status when forum changes
            setOnlineStatusInitialized(false);
            setIsUserOnline(false);
            setOnlineCount(0);
            
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

    // Production-ready online status management
    useEffect(() => {
        if (showChat && !onlineStatusInitialized) {
            
            // Initialize online status sequence
            const initializeOnlineStatus = async () => {
                try {
                    // Step 1: Mark user online
                    await markUserOnline();
                    
                    // Step 2: Wait for online status to be saved
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Step 3: Fetch initial online count
                    await fetchOnlineCount();
                    
                    // Step 4: Mark as initialized
                    setOnlineStatusInitialized(true);
                } catch (error) {
                    console.error("Failed to initialize online status:", error);
                }
            };
            
            initializeOnlineStatus();
        }
    }, [showChat, forumId, onlineStatusInitialized]);

    // Chat management with proper cleanup
    useEffect(() => {
        if (showChat && onlineStatusInitialized) {
            
            // Set up polling for new messages
            const messageInterval = setInterval(fetchMessages, 2000);
            
            // Set up heartbeat to keep user online (only if not already online)
            const heartbeatInterval = setInterval(() => {
                if (isUserOnline) {
                    markUserOnline();
                }
            }, 30000); // Every 30 seconds
            
            // Poll for online count updates
            const onlineCountInterval = setInterval(fetchOnlineCount, 10000); // Every 10 seconds
            
            // Poll for typing users
            const typingInterval = setInterval(fetchTypingUsers, 2000); // Every 2 seconds
            
            // Handle browser close/tab close
            const handleBeforeUnload = () => {
                markUserOffline();
            };
            
            window.addEventListener('beforeunload', handleBeforeUnload);
            
            return () => {
                clearInterval(messageInterval);
                clearInterval(heartbeatInterval);
                clearInterval(onlineCountInterval);
                clearInterval(typingInterval);
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [showChat, onlineStatusInitialized, isUserOnline]);

    // Cleanup when chat closes
    useEffect(() => {
        if (!showChat && onlineStatusInitialized) {
            markUserOffline();
            setOnlineStatusInitialized(false);
            setIsUserOnline(false);
            setOnlineCount(0);
        }
    }, [showChat, onlineStatusInitialized]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
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

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}`, {
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

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/problems`, {
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

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/members`, {
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

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const messages = response.data.reverse();
            setMessages(messages);
            
            // Check for pinned message
            const pinned = messages.find(msg => msg.is_pinned);
            if (pinned) {
                setPinnedMessage(pinned);
            } else {
                setPinnedMessage(null);
            }

            // Fetch problem data for problem messages
            const problemIds = messages
                .filter(msg => msg.message_type === 'problem' && msg.problem_id)
                .map(msg => msg.problem_id);

            if (problemIds.length > 0) {
                const problemPromises = problemIds.map(id => 
                    axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/id/${id}`, {
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

    // Production-ready online status functions
    const markUserOnline = async () => {
        // Prevent duplicate calls
        if (isUserOnline) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/online`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setIsUserOnline(true);
        } catch (error) {
            console.error("Error marking user online:", error);
            setIsUserOnline(false);
        }
    };

    const markUserOffline = async () => {
        // Prevent duplicate calls
        if (!isUserOnline) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/online`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setIsUserOnline(false);
        } catch (error) {
            console.error("Error marking user offline:", error);
            // Still set as offline locally even if API fails
            setIsUserOnline(false);
        }
    };

    const fetchOnlineCount = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/online-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const newCount = response.data.online_count;
            setOnlineCount(newCount);
        } catch (error) {
            console.error("Error fetching online count:", error);
            // Don't update count on error, keep current value
        }
    };

    // Typing indicator functions
    const handleTypingStart = async () => {
        if (!isTyping) {
            setIsTyping(true);
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const formData = new FormData();
                formData.append('is_typing', 'true');
                await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/typing`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error("Error sending typing status:", error);
            }
        }

        // Clear existing timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Set new timeout to stop typing after 3 seconds
        const timeout = setTimeout(() => {
            handleTypingStop();
        }, 3000);
        setTypingTimeout(timeout);
    };

    const handleTypingStop = async () => {
        if (isTyping) {
            setIsTyping(false);
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

            const formData = new FormData();
            formData.append('is_typing', 'false');
            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/typing`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            } catch (error) {
                console.error("Error sending typing status:", error);
            }
        }

        if (typingTimeout) {
            clearTimeout(typingTimeout);
            setTypingTimeout(null);
        }
    };

    const fetchTypingUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/typing`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setTypingUsers(response.data.typing_users || []);
        } catch (error) {
            console.error("Error fetching typing users:", error);
        }
    };

    const sendMessage = async (e, messageType = "text", content = null) => {
        if (e) e.preventDefault();
        
        const messageContent = content || newMessage;
        if (!messageContent.trim() && messageType === "text") return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages`, {
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

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/join`, {}, {
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

            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/leave`, {
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
                `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/upload-image`,
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

            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}`, {
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

    const handleInviteUsers = () => {
        setShowInviteModal(true);
    };

    const handleInviteSuccess = () => {
        // Refresh members list after successful invitation
        fetchMembers();
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

    const isMember = members.some(member => member.user_id === currentUser?.id && member.is_active) || 
                     (currentUser?.role === 'admin' || currentUser?.role === 'moderator');
    const isCreator = members.some(member => member.user_id === currentUser?.id && member.role === 'creator') ||
                      currentUser?.role === 'admin';
    
    // Check user permissions
    const getUserRole = () => {
        // Site admins have full permissions
        if (currentUser?.role === 'admin') return 'admin';
        if (currentUser?.role === 'moderator') return 'moderator';
        
        const userMembership = members.find(member => member.user_id === currentUser?.id);
        return userMembership?.role || 'member';
    };
    
    const hasPermission = (permission) => {
        const userRole = getUserRole();
        if (userRole === 'admin') return true; // Site admins have all permissions
        if (userRole === 'creator') return true;
        if (userRole === 'moderator') return ['pin', 'moderate', 'kick'].includes(permission);
        if (userRole === 'helper') return ['pin'].includes(permission);
        return false;
    };
    
    const canManageMember = (targetMember) => {
        const userRole = getUserRole();
        const targetRole = targetMember.role;
        
        // Site admins can manage everyone
        if (userRole === 'admin') return true;
        
        // Creator can manage everyone except themselves
        if (userRole === 'creator') return targetRole !== 'creator';
        
        // Moderator can manage helpers and members (but not other moderators or creator)
        if (userRole === 'moderator') return ['helper', 'member'].includes(targetRole);
        
        // Helper and members cannot manage anyone
        return false;
    };

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
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                marginBottom: spacing.sm
                            }}>
                                <h1 style={{ 
                                    color: colors.primary, 
                                    margin: 0,
                                    fontSize: typography.fontSize["3xl"]
                                }}>
                                    {forum.title}
                                </h1>
                                
                                {/* Actions Dropdown */}
                                <div style={{ position: 'relative' }} data-actions-dropdown>
                                    <button
                                        onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                                        style={{
                                            backgroundColor: colors.gray[100],
                                            border: `1px solid ${colors.gray[300]}`,
                                            borderRadius: borderRadius.md,
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: spacing.xs,
                                            fontSize: typography.fontSize.sm,
                                            color: colors.gray[700],
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.gray[200];
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = colors.gray[100];
                                        }}
                                    >
                                        Actions
                                        <span style={{ 
                                            transform: showActionsDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease'
                                        }}>
                                            ▼
                                        </span>
                                    </button>
                                    
                                    {showActionsDropdown && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            backgroundColor: colors.white,
                                            border: `1px solid ${colors.gray[300]}`,
                                            borderRadius: borderRadius.md,
                                            boxShadow: shadows.md,
                                            zIndex: 10000,
                                            minWidth: '160px',
                                            marginTop: spacing.xs,
                                            opacity: 1
                                        }}>
                                            {isCreator ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            openEditForumModal();
                                                            setShowActionsDropdown(false);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px',
                                                            border: 'none',
                                                            backgroundColor: 'transparent',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            fontSize: typography.fontSize.sm,
                                                            color: colors.gray[700],
                                                            borderBottom: `1px solid ${colors.gray[200]}`,
                                                            transition: 'background-color 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[50]}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                    >
                                                        ✏️ Edit Forum
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleInviteUsers();
                                                            setShowActionsDropdown(false);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px',
                                                            border: 'none',
                                                            backgroundColor: 'transparent',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            fontSize: typography.fontSize.sm,
                                                            color: colors.gray[700],
                                                            borderBottom: `1px solid ${colors.gray[200]}`,
                                                            transition: 'background-color 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[50]}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                    >
                                                        👥 Invite Users
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDeleteForum();
                                                            setShowActionsDropdown(false);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px',
                                                            border: 'none',
                                                            backgroundColor: 'transparent',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            fontSize: typography.fontSize.sm,
                                                            color: colors.error || '#dc2626',
                                                            transition: 'background-color 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[50]}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                    >
                                                         Delete Forum
                                                    </button>
                                                </>
                                            ) : isMember ? (
                                                <button
                                                    onClick={() => {
                                                        handleLeaveForum();
                                                        setShowActionsDropdown(false);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        fontSize: typography.fontSize.sm,
                                                        color: colors.error || '#dc2626',
                                                        transition: 'background-color 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[50]}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                >
                                                    🚪 Leave Forum
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
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

                        {/* Chat Toggle Button */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'flex-start',
                            marginBottom: spacing.lg
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
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = colors.primary;
                                }}
                            >
                                {showChat ? 'Close Chat' : 'Open Chat'}
                            </Button>
                            
                            {!isMember && (
                                <Button
                                    onClick={handleJoinForum}
                                    style={{
                                        backgroundColor: colors.secondary,
                                        color: colors.white,
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: borderRadius.md,
                                        cursor: 'pointer',
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '600',
                                        marginLeft: spacing.sm,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = colors.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = colors.secondary;
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
                            {isCreator && (
                                <button
                                    onClick={() => {
                                        setActiveTab('banned');
                                        fetchBannedMembers();
                                    }}
                                    style={{
                                        padding: '12px 24px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        color: activeTab === 'banned' ? colors.primary : colors.gray[600],
                                        borderBottom: activeTab === 'banned' ? `2px solid ${colors.primary}` : '2px solid transparent',
                                        cursor: 'pointer',
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Banned ({bannedMembers.length})
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'members' && (
                            <div>
                                {members.map((member) => (
                                    <Card 
                                        key={member.id} 
                                        style={{ marginBottom: spacing.md }}
                                        onMouseEnter={(e) => {
                                            const dropdown = e.currentTarget.querySelector('[data-member-dropdown]');
                                            if (dropdown && canManageMember(member)) {
                                                dropdown.style.opacity = '1';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            const dropdown = e.currentTarget.querySelector('[data-member-dropdown]');
                                            if (dropdown && showMemberDropdown !== member.id) {
                                                dropdown.style.opacity = '0';
                                            }
                                        }}
                                    >
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
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                                {/* Member Actions Dropdown - Based on management permissions */}
                                                {canManageMember(member) && (
                                                    <div 
                                                        data-member-dropdown 
                                                        style={{ 
                                                            position: 'relative',
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s ease'
                                                        }}
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowMemberDropdown(showMemberDropdown === member.id ? null : member.id);
                                                            }}
                                                            style={{
                                                                backgroundColor: 'rgba(0,0,0,0.1)',
                                                                border: 'none',
                                                                color: colors.gray[600],
                                                                cursor: 'pointer',
                                                                padding: '6px 8px',
                                                                borderRadius: '50%',
                                                                fontSize: '14px',
                                                                width: '28px',
                                                                height: '28px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.target.style.backgroundColor = 'rgba(0,0,0,0.15)';
                                                                e.target.style.transform = 'scale(1.1)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
                                                                e.target.style.transform = 'scale(1)';
                                                            }}
                                                        >
                                                            ⋯
                                                        </button>
                                                        
                                                        {/* Dropdown Menu */}
                                                        {showMemberDropdown === member.id && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                top: '100%',
                                                                backgroundColor: colors.white,
                                                                border: `1px solid ${colors.gray[200]}`,
                                                                borderRadius: borderRadius.md,
                                                                boxShadow: shadows.lg,
                                                                zIndex: 10000,
                                                                minWidth: '120px',
                                                                opacity: 1
                                                            }}>
                                                                {/* Role Assignment - Only for creators */}
                                                                {isCreator && member.role !== 'creator' && (
                                                                    <>
                                                                        <div style={{
                                                                            padding: '8px 12px',
                                                                            borderBottom: `1px solid ${colors.gray[200]}`,
                                                                            fontSize: '0.75rem',
                                                                            color: colors.gray[600],
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            Assign Role:
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                assignRole(member.id, 'moderator');
                                                                                setShowMemberDropdown(null);
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: spacing.sm,
                                                                                border: 'none',
                                                                                backgroundColor: 'transparent',
                                                                                textAlign: 'left',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.8rem',
                                                                                color: colors.warning || '#f59e0b'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.target.style.backgroundColor = colors.gray[50];
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.target.style.backgroundColor = 'transparent';
                                                                            }}
                                                                        >
                                                                            🛡️ Make Moderator
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                assignRole(member.id, 'helper');
                                                                                setShowMemberDropdown(null);
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: spacing.sm,
                                                                                border: 'none',
                                                                                backgroundColor: 'transparent',
                                                                                textAlign: 'left',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.8rem',
                                                                                color: colors.info || '#0ea5e9'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.target.style.backgroundColor = colors.gray[50];
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.target.style.backgroundColor = 'transparent';
                                                                            }}
                                                                        >
                                                                            🤝 Make Helper
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                assignRole(member.id, 'member');
                                                                                setShowMemberDropdown(null);
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: spacing.sm,
                                                                                border: 'none',
                                                                                backgroundColor: 'transparent',
                                                                                textAlign: 'left',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.8rem',
                                                                                color: colors.gray[600]
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.target.style.backgroundColor = colors.gray[50];
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.target.style.backgroundColor = 'transparent';
                                                                            }}
                                                                        >
                                                                            👤 Make Member
                                                                        </button>
                                                                        <div style={{
                                                                            height: '1px',
                                                                            backgroundColor: colors.gray[200],
                                                                            margin: '4px 0'
                                                                        }}></div>
                                                                    </>
                                                                )}
                                                                
                                                                {hasPermission('kick') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            kickMember(member.id);
                                                                            setShowMemberDropdown(null);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: spacing.sm,
                                                                            border: 'none',
                                                                            backgroundColor: 'transparent',
                                                                            textAlign: 'left',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.8rem',
                                                                            color: colors.gray[700]
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.backgroundColor = colors.gray[50];
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.backgroundColor = 'transparent';
                                                                        }}
                                                                    >
                                                                        👢 Kick Member
                                                                    </button>
                                                                )}
                                                                {isCreator && (
                                                                    <button
                                                                        onClick={() => {
                                                                            banMember(member.id);
                                                                            setShowMemberDropdown(null);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: spacing.sm,
                                                                            border: 'none',
                                                                            backgroundColor: 'transparent',
                                                                            textAlign: 'left',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.8rem',
                                                                            color: colors.error || '#ef4444'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.backgroundColor = colors.gray[50];
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.backgroundColor = 'transparent';
                                                                        }}
                                                                    >
                                                                        🚫 Ban Member
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <span style={{
                                                    backgroundColor: member.role === 'creator' ? colors.primary : 
                                                                  member.role === 'moderator' ? colors.warning : 
                                                                  member.role === 'helper' ? colors.info : colors.gray[400],
                                                    color: colors.white,
                                                    padding: "4px 12px",
                                                    borderRadius: borderRadius.sm,
                                                    fontSize: "0.8rem",
                                                    fontWeight: "600"
                                                }}>
                                                    {member.role === 'creator' ? 'Creator' : 
                                                     member.role === 'moderator' ? 'Moderator' : 
                                                     member.role === 'helper' ? 'Helper' : 'Member'}
                                                </span>
                                            </div>
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

                        {activeTab === 'banned' && (
                            <div>
                                {bannedMembers.length === 0 ? (
                                    <p style={{ color: colors.gray[500], textAlign: 'center', padding: spacing.xl }}>
                                        No banned members
                                    </p>
                                ) : (
                                    bannedMembers.map((member) => (
                                        <Card key={member.id} style={{ marginBottom: spacing.md }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    backgroundColor: colors.gray[400],
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
                                                        Banned on {new Date(member.joined_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                                    <span style={{
                                                        backgroundColor: colors.error || '#ef4444',
                                                        color: colors.white,
                                                        padding: "4px 12px",
                                                        borderRadius: borderRadius.sm,
                                                        fontSize: "0.8rem",
                                                        fontWeight: "600"
                                                    }}>
                                                        Banned
                                                    </span>
                                                    
                                                    <Button
                                                        onClick={() => unbanMember(member.id)}
                                                        style={{
                                                            backgroundColor: colors.primary,
                                                            color: colors.white,
                                                            border: 'none',
                                                            padding: '8px 16px',
                                                            borderRadius: borderRadius.sm,
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.backgroundColor = colors.primary;
                                                            e.target.style.opacity = '0.9';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.backgroundColor = colors.primary;
                                                            e.target.style.opacity = '1';
                                                        }}
                                                    >
                                                        Unban
                                                    </Button>
                                                </div>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: onlineCount > 0 ? '#10b981' : '#ef4444'
                                    }}></div>
                                    <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.gray[600] }}>
                                        {onlineCount} online
                                    </p>
                                </div>
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

                        {/* Pinned Message Banner */}
                        {pinnedMessage && (
                            <div style={{
                                backgroundColor: colors.primary,
                                color: colors.white,
                                padding: spacing.sm,
                                margin: `0 ${spacing.md}`,
                                borderRadius: borderRadius.md,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: shadows.sm,
                                position: 'sticky',
                                top: 0,
                                zIndex: 100
                            }}>
                                <div 
                                    style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}
                                    onClick={() => scrollToPinnedMessage()}
                                >
                                    <div style={{ fontSize: '16px' }}>📌</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                        {pinnedMessage.content}
                                    </div>
                                </div>
                                {currentUser?.id === forum?.creator_id && (
                                    <button
                                        onClick={() => unpinMessage()}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: colors.white,
                                            cursor: 'pointer',
                                            padding: '4px',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Messages */}
                        <div 
                            data-messages-container
                            style={{
                                flex: 1,
                                padding: spacing.md,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: spacing.sm,
                                position: 'relative',
                                zIndex: showMessageDropdown ? 0 : 1
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
                                            data-message-id={message.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                                                marginBottom: spacing.sm,
                                                alignItems: 'flex-end',
                                                gap: spacing.sm,
                                                position: 'relative',
                                                zIndex: showMessageDropdown === message.id ? 10001 : 'auto'
                                            }}
                                            onMouseEnter={(e) => {
                                                const dropdown = e.currentTarget.querySelector('[data-message-dropdown]');
                                                if (dropdown) {
                                                    dropdown.style.opacity = '1';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                const dropdown = e.currentTarget.querySelector('[data-message-dropdown]');
                                                if (dropdown && showMessageDropdown !== message.id) {
                                                    dropdown.style.opacity = '0';
                                                }
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
                                            
                                            <div 
                                                data-message-bubble
                                                style={{
                                                    maxWidth: '70%',
                                                    backgroundColor: isOwnMessage ? colors.primary : colors.white,
                                                    color: isOwnMessage ? colors.white : colors.gray[800],
                                                    padding: spacing.md,
                                                    borderRadius: borderRadius.lg,
                                                    boxShadow: shadows.sm,
                                                    position: 'relative',
                                                    zIndex: showMessageDropdown === message.id ? 10001 : 0
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
                                                            src={message.content}
                                                            alt="Forum image"
                                                            style={{
                                                                maxWidth: '100%',
                                                                maxHeight: '400px',
                                                                borderRadius: borderRadius.md,
                                                                boxShadow: shadows.sm,
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => {
                                                                setSelectedImage(message.content);
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
                                                    textAlign: 'right',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                                                    
                                                {/* Message Actions Dropdown - Available to all members */}
                                                {(
                                                        <div 
                                                            data-message-dropdown 
                                                            style={{ 
                                                                position: 'relative',
                                                                opacity: 0,
                                                                transition: 'opacity 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.opacity = '1';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.opacity = '0';
                                                            }}
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowMessageDropdown(showMessageDropdown === message.id ? null : message.id);
                                                                }}
                                                                style={{
                                                                    backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                                                                    border: 'none',
                                                                    color: isOwnMessage ? 'rgba(255,255,255,0.8)' : colors.gray[600],
                                                                    cursor: 'pointer',
                                                                    padding: '6px 8px',
                                                                    borderRadius: '50%',
                                                                    fontSize: '14px',
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.backgroundColor = isOwnMessage ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
                                                                    e.target.style.transform = 'scale(1.1)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.backgroundColor = isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
                                                                    e.target.style.transform = 'scale(1)';
                                                                }}
                                                            >
                                                                ⋯
                                                            </button>
                                                            
                                                            {/* Dropdown Menu */}
                                                            {showMessageDropdown === message.id && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    [isOwnMessage ? 'right' : 'left']: 0,
                                                                    top: '100%',
                                                                    backgroundColor: colors.white,
                                                                    border: `1px solid ${colors.gray[200]}`,
                                                                    borderRadius: borderRadius.md,
                                                                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                                                                    zIndex: 10002,
                                                                    minWidth: '120px',
                                                                    marginTop: '4px',
                                                                    opacity: 1,
                                                                    transform: 'translateZ(0)'
                                                                }}>
                                                                    {/* Reply Option - Available to all users */}
                                                                    <button
                                                                        onClick={() => {
                                                                            navigateToThread(message.id);
                                                                            setShowMessageDropdown(null);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: spacing.sm,
                                                                            border: 'none',
                                                                            backgroundColor: 'transparent',
                                                                            textAlign: 'left',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.8rem',
                                                                            color: colors.gray[700]
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.backgroundColor = colors.gray[50];
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.backgroundColor = 'transparent';
                                                                        }}
                                                                    >
                                                                        💬 Reply
                                                                    </button>
                                                                    
                                                                    {/* Report Option - Available to all users */}
                                                                    <button
                                                                        onClick={() => {
                                                                            setReportTarget({
                                                                                type: 'message',
                                                                                id: message.id,
                                                                                user: message.author
                                                                            });
                                                                            setShowReportModal(true);
                                                                            setShowMessageDropdown(null);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: spacing.sm,
                                                                            border: 'none',
                                                                            backgroundColor: 'transparent',
                                                                            textAlign: 'left',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.8rem',
                                                                            color: colors.gray[700]
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.backgroundColor = colors.gray[50];
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.backgroundColor = 'transparent';
                                                                        }}
                                                                    >
                                                                        🚨 Report
                                                                    </button>
                                                                    
                                                                    {/* Delete Option - Only for own messages */}
                                                                    {isOwnMessage && (
                                                                        <button
                                                                            onClick={() => {
                                                                                deleteMessage(message.id);
                                                                                setShowMessageDropdown(null);
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: spacing.sm,
                                                                                border: 'none',
                                                                                backgroundColor: 'transparent',
                                                                                textAlign: 'left',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.8rem',
                                                                                color: colors.error || '#ef4444'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.target.style.backgroundColor = colors.gray[50];
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.target.style.backgroundColor = 'transparent';
                                                                            }}
                                                                        >
                                                                            🗑️ Delete
                                                                        </button>
                                                                    )}
                                                                    
                                                                    {/* Pin Option - Only for moderators/creators */}
                                                                    {hasPermission('pin') && (
                                                                        <button
                                                                            onClick={() => {
                                                                                pinMessage(message.id);
                                                                                setShowMessageDropdown(null);
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: spacing.sm,
                                                                                border: 'none',
                                                                                backgroundColor: 'transparent',
                                                                                textAlign: 'left',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.8rem',
                                                                                color: colors.gray[700]
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.target.style.backgroundColor = colors.gray[50];
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.target.style.backgroundColor = 'transparent';
                                                                            }}
                                                                        >
                                                                            📍 Pin Message
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Reply Indicators - Outside message bubble */}
                                            {replyCounts[message.id] > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginTop: spacing.sm,
                                                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                                                    maxWidth: 'fit-content'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: spacing.xs,
                                                        padding: `${spacing.xs} ${spacing.sm}`,
                                                        backgroundColor: colors.gray[100],
                                                        borderRadius: borderRadius.md,
                                                        border: `1px solid ${colors.gray[200]}`,
                                                        position: 'relative'
                                                    }}>
                                                        {/* Connecting line */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-8px',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            width: '1px',
                                                            height: '8px',
                                                            backgroundColor: colors.gray[300]
                                                        }} />
                                                        
                                                        <button
                                                            onClick={() => navigateToThread(message.id)}
                                                            style={{
                                                                backgroundColor: 'transparent',
                                                                color: colors.primary,
                                                                border: 'none',
                                                                padding: 0,
                                                                fontSize: typography.fontSize.sm,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: spacing.xs,
                                                                fontWeight: '500',
                                                                transition: 'color 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.color = colors.primaryDark}
                                                            onMouseLeave={(e) => e.target.style.color = colors.primary}
                                                        >
                                                             {replyCounts[message.id]} {replyCounts[message.id] === 1 ? 'reply' : 'replies'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            
                            {/* Typing Indicator */}
                            {typingUsers.length > 0 && (
                                <div style={{
                                    padding: spacing.sm,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: spacing.sm,
                                    color: colors.gray[600],
                                    fontSize: '0.9rem',
                                    fontStyle: 'italic'
                                }}>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: colors.gray[400],
                                            animation: 'typing 1.4s infinite ease-in-out'
                                        }}></div>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: colors.gray[400],
                                            animation: 'typing 1.4s infinite ease-in-out 0.2s'
                                        }}></div>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: colors.gray[400],
                                            animation: 'typing 1.4s infinite ease-in-out 0.4s'
                                        }}></div>
                                    </div>
                                    <span>
                                        {typingUsers.length === 1 
                                            ? `${typingUsers[0].username} is typing...`
                                            : `${typingUsers.length} people are typing...`
                                        }
                                    </span>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* New Message Indicator - Outside scrollable container */}
                        {showNewMessageIndicator && (
                            <div
                                onClick={handleNewMessageClick}
                                style={{
                                    position: 'absolute',
                                    bottom: '100px', // Positioned higher
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: colors.primary,
                                    color: colors.white,
                                    padding: '8px 16px',
                                    borderRadius: '20px', // Pill/stadium shape with very rounded ends
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: spacing.sm,
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: '500',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    zIndex: 1000,
                                    transition: 'all 0.3s ease',
                                    opacity: 0.9
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                    e.target.style.transform = 'translateX(-50%) scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = colors.primary;
                                    e.target.style.transform = 'translateX(-50%) scale(1)';
                                }}
                            >
                                <span>
                                    {newMessageCount === 1 ? 'New message' : `${newMessageCount} new messages`}
                                </span>
                                <div style={{
                                    fontSize: '16px',
                                    animation: 'bounce 1s infinite'
                                }}>
                                    ↓
                                </div>
                            </div>
                        )}

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
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTypingStart();
                                    }}
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
                                        <div style={{ fontSize: "24px", marginBottom: spacing.xs }}></div>
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
            
            {/* Forum Invite Modal */}
            <ForumInviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                forumId={forumId}
                onInvite={handleInviteSuccess}
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

            {/* Edit Forum Modal */}
            {showEditForumModal && (
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
                        backgroundColor: colors.white,
                        borderRadius: borderRadius.lg,
                        padding: spacing.xl,
                        width: '500px',
                        maxWidth: '90vw',
                        boxShadow: shadows.xl
                    }}>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: '600',
                            marginBottom: spacing.lg,
                            color: colors.gray[800]
                        }}>
                            Edit Forum
                        </h2>
                        
                        <div style={{ marginBottom: spacing.md }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: spacing.sm,
                                color: colors.gray[700]
                            }}>
                                Forum Name
                            </label>
                            <input
                                type="text"
                                value={editForumData.name}
                                onChange={(e) => setEditForumData({...editForumData, name: e.target.value})}
                                style={{
                                    width: '100%',
                                    padding: spacing.md,
                                    border: `1px solid ${colors.gray[300]}`,
                                    borderRadius: borderRadius.md,
                                    fontSize: '16px',
                                    outline: 'none'
                                }}
                                placeholder="Enter forum name"
                            />
                        </div>
                        
                        <div style={{ marginBottom: spacing.md }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: spacing.sm,
                                color: colors.gray[700]
                            }}>
                                Description
                            </label>
                            <textarea
                                value={editForumData.description}
                                onChange={(e) => setEditForumData({...editForumData, description: e.target.value})}
                                style={{
                                    width: '100%',
                                    padding: spacing.md,
                                    border: `1px solid ${colors.gray[300]}`,
                                    borderRadius: borderRadius.md,
                                    fontSize: '16px',
                                    outline: 'none',
                                    minHeight: '100px',
                                    resize: 'vertical'
                                }}
                                placeholder="Enter forum description"
                            />
                        </div>
                        
                        <div style={{ marginBottom: spacing.lg }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: spacing.sm,
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={editForumData.is_private}
                                    onChange={(e) => setEditForumData({...editForumData, is_private: e.target.checked})}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer'
                                    }}
                                />
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: colors.gray[700]
                                }}>
                                    Private Forum (requires approval to join)
                                </span>
                            </label>
                        </div>
                        
                        <div style={{
                            display: 'flex',
                            gap: spacing.md,
                            justifyContent: 'flex-end'
                        }}>
                            <Button
                                onClick={() => setShowEditForumModal(false)}
                                style={{
                                    backgroundColor: colors.gray[400],
                                    color: colors.white,
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: borderRadius.md,
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={updateForum}
                                style={{
                                    backgroundColor: colors.primary,
                                    color: colors.white,
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: borderRadius.md,
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                Save Changes
                            </Button>
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
        </div>
    );
};

export default ForumDetail;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './components/Layout';
import Card from './components/Card';
import Button from './components/Button';
import AnimatedLoader from './components/AnimatedLoader';
import ForumInviteModal from './ForumInviteModal';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';

const Forums = () => {
    const [forums, setForums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newForum, setNewForum] = useState({
        title: '',
        description: '',
        is_private: false,
        max_members: 100,
        subject: '',
        level: '',
        tags: ['']
    });
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedForumId, setSelectedForumId] = useState(null);

    const navigate = useNavigate();

    // Tag management functions
    const handleTagChange = (index, value) => {
        const newTags = [...newForum.tags];
        newTags[index] = value;
        setNewForum({...newForum, tags: newTags});
    };

    const addTag = () => {
        if (newForum.tags.length < 5) {
            setNewForum({...newForum, tags: [...newForum.tags, ""]});
        } else {
            alert("Maximum 5 tags allowed");
        }
    };

    const removeTag = (index) => {
        if (newForum.tags.length > 1) {
            const newTags = newForum.tags.filter((_, i) => i !== index);
            setNewForum({...newForum, tags: newTags});
        }
    };

    useEffect(() => {
        fetchCurrentUser();
        fetchForums();
    }, []);

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

    const fetchForums = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) {
                setError("Please log in to view forums");
                return;
            }

            const response = await axios.get("http://127.0.0.1:8000/auth/forums", {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setForums(response.data);
        } catch (error) {
            console.error("Error fetching forums:", error);
            console.error("Error response:", error.response);
            console.error("Error status:", error.response?.status);
            console.error("Error data:", error.response?.data);
            setError(`Failed to load forums: ${error.response?.data?.detail || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateForum = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Process tags: filter out empty tags and join with commas
            const validTags = newForum.tags.filter(tag => tag.trim() !== "");
            const processedTags = validTags.join(", ");

            const forumData = {
                ...newForum,
                tags: processedTags
            };

            await axios.post("http://127.0.0.1:8000/auth/forums", forumData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNewForum({ title: '', description: '', is_private: false, max_members: 100, subject: '', level: '', tags: [''] });
            setShowCreateForm(false);
            fetchForums();
        } catch (error) {
            console.error("Error creating forum:", error);
            alert("Failed to create forum");
        }
    };

    const handleJoinForum = async (forumId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/join`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchForums();
        } catch (error) {
            console.error("Error joining forum:", error);
            if (error.response?.status === 400) {
                alert("Already a member of this forum");
            } else if (error.response?.status === 400 && error.response?.data?.detail?.includes("full")) {
                alert("Forum is full");
            } else {
                alert("Failed to join forum");
            }
        }
    };

    const handleRequestToJoin = async (forumId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/request-join`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Request sent to forum creator");
            fetchForums(); // Refresh to update button state
        } catch (error) {
            console.error("Error requesting to join forum:", error);
            if (error.response?.status === 400) {
                alert("Request already sent or you are already a member");
            } else {
                alert("Failed to send request");
            }
        }
    };

    const handleForumClick = (forum) => {
        navigate(`/forum/${forum.id}/info`);
    };

    const handleInviteClick = (forumId, e) => {
        e.stopPropagation();
        setSelectedForumId(forumId);
        setShowInviteModal(true);
    };

    const handleInviteModalClose = () => {
        setShowInviteModal(false);
        setSelectedForumId(null);
    };

    const handleInviteSuccess = () => {
        fetchForums(); // Refresh forums to update member counts
    };

    // Filter forums based on active tab and search query
    const filteredForums = forums.filter(forum => {
        // Tab filtering
        if (activeTab === 'public' && forum.is_private) return false;
        if (activeTab === 'private' && !forum.is_private) return false;
        
        // Search filtering
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return forum.title.toLowerCase().includes(query) || 
                   forum.description.toLowerCase().includes(query);
        }
        
        return true;
    });

    if (loading) {
        return (
            <Layout showHomeButton={true}>
                <AnimatedLoader type="profile" message="Loading forums..." size="large" />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout showHomeButton={true}>
                <div style={{ textAlign: "center", padding: spacing.xl }}>
                    <h2 style={{ color: colors.error }}>{error}</h2>
                    <Button onClick={() => navigate('/login')} style={{ marginTop: spacing.md }}>
                        Go to Login
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showHomeButton={true}>
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: spacing.lg }}>
                {/* Header */}
                <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: spacing.xl 
                }}>
                    <h1 style={{ 
                        fontSize: "2.5rem", 
                        fontWeight: "700", 
                        color: colors.primary,
                        margin: 0
                    }}>
                        Forums
                    </h1>
                    <Button 
                        onClick={() => setShowCreateForm(true)}
                        style={{ backgroundColor: colors.primary }}
                    >
                        + Create Forum
                    </Button>
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: spacing.lg }}>
                    <input
                        type="text"
                        placeholder="Search forums..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: spacing.md,
                            border: `1px solid ${colors.gray[300]}`,
                            borderRadius: borderRadius.lg,
                            fontSize: typography.body,
                            outline: 'none',
                            transition: 'border-color 0.2s ease',
                        }}
                        onFocus={(e) => e.target.style.borderColor = colors.primary}
                        onBlur={(e) => e.target.style.borderColor = colors.gray[300]}
                    />
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: `2px solid ${colors.gray[200]}`,
                    marginBottom: spacing.lg,
                }}>
                    {[
                        { id: 'all', label: 'All Forums' },
                        { id: 'public', label: 'Public' },
                        { id: 'private', label: 'Private' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: `${spacing.md} ${spacing.lg}`,
                                border: 'none',
                                background: 'none',
                                borderBottom: `2px solid ${
                                    activeTab === tab.id ? colors.primary : 'transparent'
                                }`,
                                color: activeTab === tab.id ? colors.primary : colors.gray[600],
                                cursor: 'pointer',
                                fontSize: typography.sm,
                                fontWeight: activeTab === tab.id ? '600' : '400',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Create Forum Form */}
                {showCreateForm && (
                    <Card style={{ marginBottom: spacing.xl, padding: spacing.lg }}>
                        <h3 style={{ marginBottom: spacing.md }}>Create New Forum</h3>
                        <form onSubmit={handleCreateForum}>
                            <div style={{ marginBottom: spacing.md }}>
                                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                                    Forum Title
                                </label>
                                <input
                                    type="text"
                                    value={newForum.title}
                                    onChange={(e) => setNewForum({...newForum, title: e.target.value})}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.body
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: spacing.md }}>
                                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                                    Description
                                </label>
                                <textarea
                                    value={newForum.description}
                                    onChange={(e) => setNewForum({...newForum, description: e.target.value})}
                                    rows={3}
                                    style={{
                                        width: "100%",
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.body,
                                        resize: "vertical"
                                    }}
                                />
                            </div>
                            
                            {/* Badge Fields */}
                            <div style={{ marginBottom: spacing.md }}>
                                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                                    Subject
                                </label>
                                <select
                                    value={newForum.subject}
                                    onChange={(e) => setNewForum({...newForum, subject: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.body
                                    }}
                                >
                                    <option value="">Select Subject (Optional)</option>
                                    <option value="Mathematics">Mathematics</option>
                                    <option value="Physics">Physics</option>
                                    <option value="Chemistry">Chemistry</option>
                                    <option value="Biology">Biology</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            
                            <div style={{ marginBottom: spacing.md }}>
                                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                                    Level
                                </label>
                                <input
                                    type="text"
                                    value={newForum.level}
                                    onChange={(e) => setNewForum({...newForum, level: e.target.value})}
                                    placeholder="e.g., National Albanian Olympiad 5th Class Phase 1, EGMO Phase 2, IMO, etc."
                                    style={{
                                        width: "100%",
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.body
                                    }}
                                />
                            </div>
                            
                            <div style={{ marginBottom: spacing.md }}>
                                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                                    Tags (Optional) - {newForum.tags.length}/5
                                </label>
                                {newForum.tags.map((tag, index) => (
                                    <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                        <input
                                            type="text"
                                            value={tag}
                                            onChange={(e) => handleTagChange(index, e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: "10px",
                                                border: "1px solid #ddd",
                                                borderRadius: "4px",
                                                fontSize: "14px"
                                            }}
                                            placeholder={`Tag ${index + 1}`}
                                        />
                                        {newForum.tags.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeTag(index)}
                                                style={{
                                                    padding: "10px",
                                                    backgroundColor: "#dc3545",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "12px"
                                                }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {newForum.tags.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        style={{
                                            padding: "10px 20px",
                                            backgroundColor: "#28a745",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "14px"
                                        }}
                                    >
                                    + Add New Tag
                                    </button>
                                )}
                                <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "5px" }}>
                                    Add up to 5 tags to help categorize your forum
                                </small>
                            </div>
                            
                            <div style={{ marginBottom: spacing.md }}>
                                <label style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                                    <input
                                        type="checkbox"
                                        checked={newForum.is_private}
                                        onChange={(e) => setNewForum({...newForum, is_private: e.target.checked})}
                                    />
                                    <span>Private Forum (requires approval to join)</span>
                                </label>
                            </div>
                            <div style={{ display: "flex", gap: spacing.sm }}>
                                <Button type="submit" style={{ backgroundColor: colors.primary }}>
                                    Create Forum
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={() => setShowCreateForm(false)}
                                    style={{ backgroundColor: colors.gray[500] }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* Forums Grid */}
                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
                    gap: spacing.lg 
                }}>
                    {filteredForums.map((forum) => (
                        <Card 
                            key={forum.id}
                            hover={true}
                            style={{
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                            onClick={() => handleForumClick(forum)}
                        >
                            <div style={{ marginBottom: spacing.md, pointerEvents: "none" }}>
                                <h3 style={{ 
                                    margin: "0 0 8px 0", 
                                    color: colors.primary,
                                    fontSize: "1.25rem"
                                }}>
                                    {forum.title}
                                </h3>
                                <p style={{ 
                                    margin: "0 0 12px 0", 
                                    color: colors.gray[600],
                                    fontSize: "0.9rem"
                                }}>
                                    {forum.description}
                                </p>
                                
                                {/* Forum Badges */}
                                <div style={{ 
                                    display: "flex", 
                                    flexWrap: "wrap", 
                                    gap: "6px", 
                                    marginBottom: "12px",
                                    pointerEvents: "none"
                                }}>
                                    {forum.subject && (
                                        <span style={{
                                            backgroundColor: "#e0e7ff",
                                            color: "#3730a3",
                                            padding: "6px 12px",
                                            borderRadius: "16px",
                                            fontSize: "12px",
                                            fontWeight: "600"
                                        }}>
                                            {forum.subject}
                                        </span>
                                    )}
                                    {forum.level && (
                                        <span style={{
                                            backgroundColor: "#fef3c7",
                                            color: "#92400e",
                                            padding: "6px 12px",
                                            borderRadius: "16px",
                                            fontSize: "12px",
                                            fontWeight: "600"
                                        }}>
                                            {forum.level}
                                        </span>
                                    )}
                                    {forum.tags && forum.tags.split(',').slice(0, 3).map((tag, index) => (
                                        <span key={index} style={{
                                            backgroundColor: "#dcfce7",
                                            color: "#166534",
                                            padding: "6px 12px",
                                            borderRadius: "16px",
                                            fontSize: "12px",
                                            fontWeight: "600"
                                        }}>
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                                
                                <div style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    alignItems: "center",
                                    marginBottom: spacing.sm
                                }}>
                                    <span style={{ 
                                        color: colors.gray[500], 
                                        fontSize: "0.85rem" 
                                    }}>
                                        {forum.member_count}/{forum.max_members} members
                                    </span>
                                    <span style={{ 
                                        color: forum.is_private ? colors.warning : colors.success,
                                        fontSize: "0.85rem",
                                        fontWeight: "600"
                                    }}>
                                        {forum.is_private ? "Private" : "Public"}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ 
                                display: "flex", 
                                gap: spacing.sm,
                                justifyContent: "flex-end",
                                pointerEvents: "none"
                            }}>
                                {/* Show invite button for forum creators */}
                                {currentUser && forum.creator_id === currentUser.id && (
                                    <Button
                                        size="sm"
                                        onClick={(e) => handleInviteClick(forum.id, e)}
                                        style={{ backgroundColor: colors.secondary, pointerEvents: "auto" }}
                                    >
                                        Invite Users
                                    </Button>
                                )}
                                
                                {/* Show appropriate button for non-creators who are not members */}
                                {currentUser && forum.creator_id !== currentUser.id && !forum.is_member && (
                                    forum.is_private ? (
                                        forum.has_pending_request ? (
                                            <Button
                                                size="sm"
                                                style={{ 
                                                    backgroundColor: colors.gray[500],
                                                    cursor: 'not-allowed',
                                                    border: 'none',
                                                    pointerEvents: "auto"
                                                }}
                                                disabled
                                            >
                                                Requested
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRequestToJoin(forum.id);
                                                }}
                                                style={{ backgroundColor: colors.primary, pointerEvents: "auto" }}
                                            >
                                                Request to Join
                                            </Button>
                                        )
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleJoinForum(forum.id);
                                            }}
                                            style={{ backgroundColor: colors.primary, pointerEvents: "auto" }}
                                        >
                                            Join Forum
                                        </Button>
                                    )
                                )}
                                
                            </div>
                        </Card>
                    ))}
                </div>

                {filteredForums.length === 0 && (
                    <div style={{ 
                        textAlign: "center", 
                        padding: spacing.xl,
                        color: colors.gray[500]
                    }}>
                        <h3>No forums found</h3>
                        <p>
                            {searchQuery ? 'Try adjusting your search terms' : 
                             activeTab === 'public' ? 'No public forums available' :
                             activeTab === 'private' ? 'No private forums available' :
                             'Be the first to create a forum!'}
                        </p>
                    </div>
                )}

                {/* Invite Modal */}
                {showInviteModal && selectedForumId && (
                    <ForumInviteModal
                        isOpen={showInviteModal}
                        onClose={handleInviteModalClose}
                        forumId={selectedForumId}
                        onInvite={handleInviteSuccess}
                    />
                )}
            </div>
        </Layout>
    );
};

export default Forums;
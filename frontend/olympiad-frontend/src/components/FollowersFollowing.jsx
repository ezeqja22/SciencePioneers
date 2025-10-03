import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './Layout';
import BackButton from './BackButton';
import { colors, spacing, typography, borderRadius, shadows } from '../designSystem';
import { getUserInitial, getDisplayName } from '../utils';

const FollowersFollowing = ({ type }) => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [followingStatus, setFollowingStatus] = useState({});
    const [activeTab, setActiveTab] = useState(type); // Add tab state
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [followersLoading, setFollowersLoading] = useState(false);
    const [followingLoading, setFollowingLoading] = useState(false);

    useEffect(() => {
        fetchCurrentUser();
        fetchBothLists();
    }, [userId]);

    useEffect(() => {
        if (activeTab === 'followers') {
            setUsers(followers);
        } else {
            setUsers(following);
        }
    }, [activeTab, followers, following]);

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

    const fetchBothLists = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            
            // Fetch both followers and following
            const [followersResponse, followingResponse] = await Promise.all([
                axios.get(`http://127.0.0.1:8000/auth/followers/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`http://127.0.0.1:8000/auth/following/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            
            setFollowers(followersResponse.data);
            setFollowing(followingResponse.data);
            
            // Initialize following status - users in the "following" list are being followed
            const statusMap = {};
            followingResponse.data.forEach(user => {
                statusMap[user.id] = true; // These users are being followed
            });
            setFollowingStatus(statusMap);
            
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to load user lists');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (targetUserId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `http://127.0.0.1:8000/auth/follow/${targetUserId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Update following status
            setFollowingStatus(prev => ({
                ...prev,
                [targetUserId]: true
            }));
        } catch (error) {
            console.error("Error following user:", error);
        }
    };

    const handleUnfollow = async (targetUserId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.delete(
                `http://127.0.0.1:8000/auth/follow/${targetUserId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Update following status
            setFollowingStatus(prev => ({
                ...prev,
                [targetUserId]: false
            }));
        } catch (error) {
            console.error("Error unfollowing user:", error);
        }
    };

    const navigateToUser = (username) => {
        if (currentUser && username === currentUser.username) {
            navigate('/profile');
        } else {
            navigate(`/user/${username}`);
        }
    };

    if (loading) {
        return (
            <Layout showHomeButton={true}>
                <div style={{ textAlign: "center", padding: spacing.xl }}>
                    <h2>Loading {type}...</h2>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout showHomeButton={true}>
                <div style={{ textAlign: "center", padding: spacing.xl }}>
                    <h2 style={{ color: colors.danger }}>{error}</h2>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{
                            padding: `${spacing.sm} ${spacing.md}`,
                            backgroundColor: colors.primary,
                            color: colors.white,
                            border: "none",
                            borderRadius: borderRadius.md,
                            cursor: "pointer",
                            marginTop: spacing.md
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showHomeButton={true}>
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: spacing.lg }}>
                <BackButton fallbackPath="/profile" />
                
                {/* Instagram-style tabs */}
                <div style={{
                    display: "flex",
                    borderBottom: `1px solid ${colors.gray[300]}`,
                    marginBottom: spacing.xl
                }}>
                    <button
                        onClick={() => setActiveTab('followers')}
                        style={{
                            flex: 1,
                            padding: `${spacing.md} ${spacing.lg}`,
                            backgroundColor: "transparent",
                            border: "none",
                            borderBottom: activeTab === 'followers' ? `2px solid ${colors.primary}` : '2px solid transparent',
                            color: activeTab === 'followers' ? colors.primary : colors.gray[600],
                            fontSize: typography.fontSize.lg,
                            fontWeight: activeTab === 'followers' ? typography.fontWeight.semibold : typography.fontWeight.medium,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                    >
                        Followers ({followers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('following')}
                        style={{
                            flex: 1,
                            padding: `${spacing.md} ${spacing.lg}`,
                            backgroundColor: "transparent",
                            border: "none",
                            borderBottom: activeTab === 'following' ? `2px solid ${colors.primary}` : '2px solid transparent',
                            color: activeTab === 'following' ? colors.primary : colors.gray[600],
                            fontSize: typography.fontSize.lg,
                            fontWeight: activeTab === 'following' ? typography.fontWeight.semibold : typography.fontWeight.medium,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                    >
                        Following ({following.length})
                    </button>
                </div>

                {users.length === 0 ? (
                    <div style={{ 
                        textAlign: "center", 
                        padding: spacing.xl,
                        color: colors.gray[600]
                    }}>
                        <p>No {activeTab} found.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                        {users.map((user) => {
                            const isFollowing = followingStatus[user.id];
                            const isCurrentUser = currentUser && currentUser.id === user.id;
                            
                            // For followers tab: show follow button if not following
                            // For following tab: show unfollow button since we're already following
                            const shouldShowFollowButton = activeTab === 'followers' && !isFollowing;
                            const shouldShowUnfollowButton = activeTab === 'following' && isFollowing;
                            
                            return (
                                <div
                                    key={user.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: spacing.lg,
                                        backgroundColor: colors.white,
                                        borderRadius: borderRadius.lg,
                                        boxShadow: shadows.sm,
                                        border: `1px solid ${colors.gray[200]}`,
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = shadows.md;
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = shadows.sm;
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }}
                                >
                                    <div 
                                        style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: spacing.md,
                                            cursor: "pointer",
                                            flex: 1
                                        }}
                                        onClick={() => navigateToUser(user.username)}
                                    >
                                        <div
                                            style={{
                                                width: "50px",
                                                height: "50px",
                                                borderRadius: "50%",
                                                backgroundColor: colors.secondary,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: colors.white,
                                                fontWeight: typography.fontWeight.bold,
                                                fontSize: typography.fontSize.lg,
                                                backgroundImage: user.profile_picture ? 
                                                    `url(http://127.0.0.1:8000/auth/serve-image/${user.profile_picture.split('/').pop()})` : 
                                                    'none',
                                                backgroundSize: "cover",
                                                backgroundPosition: "center"
                                            }}
                                        >
                                            {!user.profile_picture && getUserInitial(user.username)}
                                        </div>
                                        <div>
                                            <h3 style={{ 
                                                margin: "0 0 4px 0", 
                                                color: colors.gray[800],
                                                fontSize: typography.fontSize.lg,
                                                fontWeight: typography.fontWeight.semibold
                                            }}>
                                                {getDisplayName(user.username)}
                                            </h3>
                                            {user.bio && (
                                                <p style={{ 
                                                    margin: "0", 
                                                    color: colors.gray[600],
                                                    fontSize: typography.fontSize.sm,
                                                    maxWidth: "300px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    {user.bio}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {currentUser && !isCurrentUser && (shouldShowFollowButton || shouldShowUnfollowButton) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (shouldShowUnfollowButton) {
                                                    handleUnfollow(user.id);
                                                } else {
                                                    handleFollow(user.id);
                                                }
                                            }}
                                            style={{
                                                padding: `${spacing.sm} ${spacing.md}`,
                                                backgroundColor: shouldShowUnfollowButton ? colors.gray[200] : colors.primary,
                                                color: shouldShowUnfollowButton ? colors.gray[700] : colors.white,
                                                border: "none",
                                                borderRadius: borderRadius.md,
                                                cursor: "pointer",
                                                fontSize: typography.fontSize.sm,
                                                fontWeight: typography.fontWeight.medium,
                                                transition: "all 0.2s ease",
                                                minWidth: "100px"
                                            }}
                                            onMouseEnter={(e) => {
                                                if (shouldShowUnfollowButton) {
                                                    e.target.style.backgroundColor = colors.danger;
                                                    e.target.style.color = colors.white;
                                                    e.target.textContent = "Unfollow";
                                                } else {
                                                    e.target.style.backgroundColor = colors.primaryDark;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (shouldShowUnfollowButton) {
                                                    e.target.style.backgroundColor = colors.gray[200];
                                                    e.target.style.color = colors.gray[700];
                                                    e.target.textContent = "✓ Following";
                                                } else {
                                                    e.target.style.backgroundColor = colors.primary;
                                                }
                                            }}
                                        >
                                            {shouldShowUnfollowButton ? "✓ Following" : "+ Follow"}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default FollowersFollowing;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { colors, spacing, typography, shadows } from "../designSystem";

function NotificationBell({ onNotificationClick }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userPreferences, setUserPreferences] = useState(null);

    useEffect(() => {
        fetchUserPreferences();
        fetchUnreadCount();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUserPreferences = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get("${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/notification-preferences", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserPreferences(response.data);
        } catch (error) {
            console.error("Error fetching user preferences:", error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Fetch all notifications and filter them
            const response = await axios.get("${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const filteredNotifications = filterNotificationsByPreferences(response.data);
            const unreadFiltered = filteredNotifications.filter(n => !n.is_read);
            setUnreadCount(unreadFiltered.length);
        } catch (error) {
            console.error("Error fetching unread count:", error);
        }
    };

    const filterNotificationsByPreferences = (notifications) => {
        if (!userPreferences) return notifications;
        
        return notifications.filter(notification => {
            switch (notification.type) {
                case 'like':
                case 'comment':
                    return userPreferences.in_app_likes;
                case 'follow':
                    return userPreferences.in_app_follows;
                case 'forum_join_request':
                case 'forum_request_accepted':
                case 'forum_request_declined':
                case 'forum_invitation':
                case 'forum_invitation_accepted':
                case 'forum_invitation_declined':
                    return true; // Always show forum invitations and join requests
                case 'forum_deleted':
                    return userPreferences.in_app_forum_deleted;
                default:
                    return true;
            }
        });
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await axios.get("${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const filteredNotifications = filterNotificationsByPreferences(response.data);
            setNotifications(filteredNotifications);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBellClick = () => {
        setShowDropdown(!showDropdown);
        if (!showDropdown) {
            fetchNotifications();
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Update local state
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId ? { ...notif, is_read: true } : notif
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.put("${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/notifications/mark-all-read", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNotifications(prev => 
                prev.map(notif => ({ ...notif, is_read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    const handleAcceptJoinRequest = async (notification) => {
        try {
            const token = localStorage.getItem("token");
            const { forum_id, request_id } = notification.data || {};
            
            if (!forum_id || !request_id) {
                // For old notifications without data, try to find the request
                
                // Extract username from message: "xhillda wants to join 'forum test 3'"
                const message = notification.message;
                const usernameMatch = message.match(/^(\w+) wants to join/);
                const forumMatch = message.match(/wants to join '([^']+)'/);
                
                if (usernameMatch && forumMatch) {
                    const username = usernameMatch[1];
                    const forumTitle = forumMatch[1];
                    
                    
                    // We need to find the forum ID and request ID
                    // For now, show a helpful message
                    alert(`This is an old notification. Please go to the Forums page and check the join requests for "${forumTitle}" to accept/decline manually.`);
                    return;
                } else {
                    alert("Unable to process this old notification. Please refresh the page.");
                    return;
                }
            }
            
            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forum_id}/join-requests/${request_id}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Update notification message
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notification.id 
                        ? { 
                            ...notif, 
                            title: "Join Request Accepted",
                            message: `You accepted ${notification.data?.requester_name || 'user'}'s request to join your forum`,
                            type: "forum_request_accepted"
                        }
                        : notif
                )
            );
            
            alert("Join request accepted!");
            
            // Refresh the page to update forum membership status
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error("Error accepting join request:", error);
            alert("Failed to accept join request");
        }
    };

    const handleDeclineJoinRequest = async (notification) => {
        try {
            const token = localStorage.getItem("token");
            const { forum_id, request_id } = notification.data || {};
            
            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forum_id}/join-requests/${request_id}/decline`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Update notification message
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notification.id 
                        ? { 
                            ...notif, 
                            title: "Join Request Declined",
                            message: `You declined ${notification.data?.requester_name || 'user'}'s request to join your forum`,
                            type: "forum_request_declined"
                        }
                        : notif
                )
            );
            
            alert("Join request declined");
        } catch (error) {
            console.error("Error declining join request:", error);
            alert("Failed to decline join request");
        }
    };

    const handleAcceptInvitation = async (notification) => {
        try {
            const token = localStorage.getItem("token");
            const { forum_id, invitation_id } = notification.data || {};

            if (!forum_id || !invitation_id) {
                alert("This is an old notification without proper data. Please go to the Forums page to manage your invitations manually.");
                return;
            }

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forum_id}/invitations/${invitation_id}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update notification message
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notification.id 
                        ? { 
                            ...notif, 
                            title: "Invitation Accepted",
                            message: `You accepted the invitation to join '${notification.data?.forum_title || 'forum'}'`,
                            type: "forum_invitation_accepted"
                        }
                        : notif
                )
            );
            
            alert("Forum invitation accepted!");
            
            // Refresh the page to update forum membership status
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error("Error accepting invitation:", error);
            alert("Failed to accept invitation");
        }
    };

    const handleDeclineInvitation = async (notification) => {
        try {
            const token = localStorage.getItem("token");
            const { forum_id, invitation_id } = notification.data || {};

            if (!forum_id || !invitation_id) {
                alert("This is an old notification without proper data. Please go to the Forums page to manage your invitations manually.");
                return;
            }

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forum_id}/invitations/${invitation_id}/decline`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update notification message
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notification.id 
                        ? { 
                            ...notif, 
                            title: "Invitation Declined",
                            message: `You declined the invitation to join '${notification.data?.forum_title || 'forum'}'`,
                            type: "forum_invitation_declined"
                        }
                        : notif
                )
            );
            
            alert("Forum invitation declined");
        } catch (error) {
            console.error("Error declining invitation:", error);
            alert("Failed to decline invitation");
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'like': return 'Like';
            case 'comment': return 'Comment';
            case 'follow': return 'Follow';
            case 'forum_join_request': return 'Join Request';
            case 'forum_request_accepted': return 'Accepted';
            case 'forum_request_declined': return 'Declined';
            case 'forum_invitation': return 'Invitation';
            case 'forum_invitation_accepted': return 'Accepted';
            case 'forum_invitation_declined': return 'Declined';
            case 'forum_deleted': return 'Deleted';
            default: return 'Notification';
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
        <div style={{ position: "relative" }}>
            <button
                onClick={handleBellClick}
                style={{
                    position: "relative",
                    backgroundColor: "transparent",
                    border: "none",
                    color: colors.white,
                    cursor: "pointer",
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: "6px",
                    transition: "background-color 0.2s",
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "40px",
                    minHeight: "40px"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            >
                Notifications
                {unreadCount > 0 && (
                    <div style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        backgroundColor: colors.danger,
                        color: colors.white,
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        minWidth: "18px"
                    }}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                )}
            </button>

            {showDropdown && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    backgroundColor: colors.white,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: "8px",
                    boxShadow: shadows.lg,
                    zIndex: 1000,
                    width: "350px",
                    maxHeight: "400px",
                    overflow: "hidden",
                    marginTop: spacing.xs
                }}>
                    {/* Header */}
                    <div style={{
                        padding: `${spacing.md} ${spacing.lg}`,
                        borderBottom: `1px solid ${colors.gray[200]}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.dark
                        }}>
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: colors.primary,
                                    cursor: "pointer",
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.medium
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {loading ? (
                            <div style={{
                                padding: spacing.xl,
                                textAlign: "center",
                                color: colors.gray[600]
                            }}>
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{
                                padding: spacing.xl,
                                textAlign: "center",
                                color: colors.gray[600]
                            }}>
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id)}
                                    style={{
                                        padding: `${spacing.md} ${spacing.lg}`,
                                        borderBottom: `1px solid ${colors.gray[100]}`,
                                        cursor: "pointer",
                                        backgroundColor: notification.is_read ? "transparent" : colors.gray[50],
                                        transition: "background-color 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = notification.is_read ? "transparent" : colors.gray[50]}
                                >
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.sm }}>
                                        <div style={{ fontSize: "16px", marginTop: "2px" }}>
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontWeight: notification.is_read ? typography.fontWeight.normal : typography.fontWeight.semibold,
                                                color: colors.dark,
                                                fontSize: typography.fontSize.sm,
                                                marginBottom: spacing.xs
                                            }}>
                                                {notification.title}
                                            </div>
                                            <div style={{
                                                color: colors.gray[600],
                                                fontSize: typography.fontSize.xs,
                                                lineHeight: 1.4,
                                                marginBottom: spacing.xs
                                            }}>
                                                {notification.message}
                                            </div>
                                            
                                            {/* Show Accept/Decline buttons for forum join requests */}
                                            {notification.type === 'forum_join_request' && (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    gap: spacing.xs, 
                                                    marginBottom: spacing.xs 
                                                }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptJoinRequest(notification);
                                                        }}
                                                        style={{
                                                            backgroundColor: colors.accent,
                                                            color: colors.white,
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: `${spacing.xs} ${spacing.sm}`,
                                                            fontSize: typography.fontSize.xs,
                                                            cursor: 'pointer',
                                                            fontWeight: typography.fontWeight.medium
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = colors.accent}
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeclineJoinRequest(notification);
                                                        }}
                                                        style={{
                                                            backgroundColor: colors.danger,
                                                            color: colors.white,
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: `${spacing.xs} ${spacing.sm}`,
                                                            fontSize: typography.fontSize.xs,
                                                            cursor: 'pointer',
                                                            fontWeight: typography.fontWeight.medium
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = colors.danger}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {/* Show Accept/Decline buttons for forum invitations */}
                                            {notification.type === 'forum_invitation' && (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    gap: spacing.xs, 
                                                    marginBottom: spacing.xs 
                                                }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptInvitation(notification);
                                                        }}
                                                        style={{
                                                            backgroundColor: colors.accent,
                                                            color: colors.white,
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: `${spacing.xs} ${spacing.sm}`,
                                                            fontSize: typography.fontSize.xs,
                                                            cursor: 'pointer',
                                                            fontWeight: typography.fontWeight.medium
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = colors.accent}
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeclineInvitation(notification);
                                                        }}
                                                        style={{
                                                            backgroundColor: colors.danger,
                                                            color: colors.white,
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: `${spacing.xs} ${spacing.sm}`,
                                                            fontSize: typography.fontSize.xs,
                                                            cursor: 'pointer',
                                                            fontWeight: typography.fontWeight.medium
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = colors.danger}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div style={{
                                                color: colors.gray[500],
                                                fontSize: typography.fontSize.xs
                                            }}>
                                                {formatTimeAgo(notification.created_at)}
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <div style={{
                                                width: "8px",
                                                height: "8px",
                                                backgroundColor: colors.primary,
                                                borderRadius: "50%",
                                                marginTop: "4px"
                                            }} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;

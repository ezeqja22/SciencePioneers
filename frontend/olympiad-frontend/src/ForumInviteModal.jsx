import React, { useState, useEffect } from 'react';
import { colors, spacing, typography, borderRadius } from './designSystem';
import { getUserInitial } from './utils';

// Destructure typography properties for easier access
const { fontSize, fontWeight } = typography;

const ForumInviteModal = ({ isOpen, onClose, forumId, onInvite }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState(new Set());

  useEffect(() => {
    if (isOpen && searchQuery.length >= 1) {
      fetchUsers();
    } else if (isOpen && searchQuery.length === 0) {
      setUsers([]);
    }
  }, [isOpen, searchQuery, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/auth/forums/${forumId}/invite-users?search=${encodeURIComponent(searchQuery)}&tab=${activeTab}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/auth/forums/${forumId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitee_id: userId }),
      });

      if (response.ok) {
        setInvitedUsers(prev => new Set([...prev, userId]));
        if (onInvite) {
          onInvite(userId);
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation');
    }
  };

  const getButtonText = (user) => {
    if (user.is_member) return 'Member';
    if (user.has_pending_invitation || invitedUsers.has(user.id)) return 'Invited';
    return 'Invite';
  };

  const getButtonStyle = (user) => {
    if (user.is_member) {
      return {
        backgroundColor: colors.success,
        color: colors.white,
        cursor: 'not-allowed',
      };
    }
    if (user.has_pending_invitation || invitedUsers.has(user.id)) {
      return {
        backgroundColor: colors.gray[300],
        color: colors.gray[600],
        cursor: 'not-allowed',
      };
    }
    return {
      backgroundColor: colors.primary,
      color: colors.white,
    };
  };

  if (!isOpen) return null;

  return (
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
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing[6],
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[4],
        }}>
          <h2 style={{
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold,
            color: colors.gray[900],
            margin: 0,
          }}>
            Invite Users
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: fontSize.xl,
              cursor: 'pointer',
              color: colors.gray[500],
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: spacing[4] }}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: spacing[3],
              border: `1px solid ${colors.gray[300]}`,
              borderRadius: borderRadius.md,
              fontSize: fontSize.base,
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.gray[200]}`,
          marginBottom: spacing[4],
        }}>
          {[
            { id: 'all', label: 'All Users' },
            { id: 'following', label: 'Following' },
            { id: 'followers', label: 'Followers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: spacing[3],
                border: 'none',
                background: 'none',
                borderBottom: `2px solid ${
                  activeTab === tab.id ? colors.primary : 'transparent'
                }`,
                color: activeTab === tab.id ? colors.primary : colors.gray[600],
                cursor: 'pointer',
                fontSize: fontSize.sm,
                fontWeight: activeTab === tab.id ? fontWeight.semibold : fontWeight.normal,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Users List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '300px',
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
            }}>
              <div>Loading...</div>
            </div>
          ) : users.length === 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: colors.gray[500],
            }}>
              {searchQuery.length < 1 ? 'Start typing to search for users...' : 'No users found'}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: spacing[3],
                  borderBottom: `1px solid ${colors.gray[100]}`,
                }}
              >
                {/* Profile Picture */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: colors.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.white,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  marginRight: spacing[3],
                }}>
                  {user.profile_picture ? (
                    <img
                      src={`/auth/serve-image/${user.profile_picture}`}
                      alt={user.username}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    getUserInitial(user.username)
                  )}
                </div>

                {/* User Info */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                    color: colors.gray[900],
                  }}>
                    {user.username}
                  </div>
                  {user.bio && (
                    <div style={{
                      fontSize: fontSize.sm,
                      color: colors.gray[600],
                      marginTop: '2px',
                    }}>
                      {user.bio}
                    </div>
                  )}
                </div>

                {/* Invite Button */}
                <button
                  onClick={() => handleInvite(user.id)}
                  disabled={user.is_member || user.has_pending_invitation || invitedUsers.has(user.id)}
                  style={{
                    padding: `${spacing[2]} ${spacing[4]}`,
                    borderRadius: borderRadius.md,
                    border: 'none',
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    cursor: user.is_member || user.has_pending_invitation || invitedUsers.has(user.id) ? 'not-allowed' : 'pointer',
                    ...getButtonStyle(user),
                  }}
                >
                  {getButtonText(user)}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: spacing[4],
          paddingTop: spacing[4],
          borderTop: `1px solid ${colors.gray[200]}`,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              backgroundColor: colors.gray[300],
              color: colors.gray[700],
              border: 'none',
              borderRadius: borderRadius.md,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForumInviteModal;

import React, { useState, useEffect } from 'react';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';
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
        `http://127.0.0.1:8000/auth/forums/${forumId}/invite-users?search=${encodeURIComponent(searchQuery)}&tab=${activeTab}`,
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
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://127.0.0.1:8000/auth/forums/${forumId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forum_id: forumId, invitee_id: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setInvitedUsers(prev => new Set([...prev, userId]));
        if (onInvite) {
          onInvite(userId);
        }
        alert('User invited successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to invite user: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error inviting user: ${error.message || 'Network error'}`);
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
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing[10],
        width: '95%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: shadows.xl,
        border: `1px solid ${colors.gray[200]}`,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[8],
          paddingBottom: spacing[6],
          borderBottom: `3px solid ${colors.primary}`,
        }}>
          <h2 style={{
            fontSize: fontSize['2xl'],
            fontWeight: fontWeight.bold,
            color: colors.dark,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}>
            <span style={{ fontSize: fontSize.xl }}>👥</span>
            Invite Users
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: fontSize['2xl'],
              cursor: 'pointer',
              color: colors.gray[500],
              padding: spacing[2],
              borderRadius: borderRadius.full,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.gray[100];
              e.target.style.color = colors.dark;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = colors.gray[500];
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: spacing[8] }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search users by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: `${spacing[5]} ${spacing[5]} ${spacing[5]} ${spacing[16]}`,
                border: `3px solid ${colors.gray[200]}`,
                borderRadius: borderRadius.xl,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.medium,
                backgroundColor: colors.gray[50],
                transition: 'all 0.3s ease',
                outline: 'none',
                boxShadow: shadows.sm,
                textIndent: spacing[8],
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.primary;
                e.target.style.backgroundColor = colors.white;
                e.target.style.boxShadow = `0 0 0 4px ${colors.primary}20, ${shadows.md}`;
                e.target.style.transform = 'translateY(-2px)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.gray[200];
                e.target.style.backgroundColor = colors.gray[50];
                e.target.style.boxShadow = shadows.sm;
                e.target.style.transform = 'translateY(0)';
              }}
            />
            <div style={{
              position: 'absolute',
              left: spacing[6],
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: fontSize.lg,
              color: colors.gray[400],
              zIndex: 1,
            }}>
              🔍
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: colors.gray[100],
          borderRadius: borderRadius.xl,
          padding: spacing[2],
          marginBottom: spacing[8],
          gap: spacing[2],
          boxShadow: shadows.sm,
        }}>
          {[
            { id: 'all', label: 'All Users', icon: '👥' },
            { id: 'following', label: 'Following', icon: '👤' },
            { id: 'followers', label: 'Followers', icon: '👥' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: `${spacing[4]} ${spacing[6]}`,
                border: 'none',
                background: activeTab === tab.id ? colors.white : 'transparent',
                borderRadius: borderRadius.lg,
                color: activeTab === tab.id ? colors.primary : colors.gray[600],
                cursor: 'pointer',
                fontSize: fontSize.base,
                fontWeight: activeTab === tab.id ? fontWeight.bold : fontWeight.semibold,
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing[3],
                boxShadow: activeTab === tab.id ? shadows.md : 'none',
                transform: activeTab === tab.id ? 'translateY(-1px)' : 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = colors.gray[200];
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <span style={{ fontSize: fontSize.lg }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Users List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '400px',
          maxHeight: '500px',
          padding: spacing[2],
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              flexDirection: 'column',
              gap: spacing[3],
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: `3px solid ${colors.gray[200]}`,
                borderTop: `3px solid ${colors.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}></div>
              <div style={{ color: colors.gray[600], fontWeight: fontWeight.medium }}>Searching users...</div>
            </div>
          ) : users.length === 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              flexDirection: 'column',
              gap: spacing[3],
              color: colors.gray[500],
            }}>
              <div style={{ fontSize: fontSize['2xl'] }}>
                {searchQuery.length < 1 ? '🔍' : '😔'}
              </div>
              <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.medium }}>
                {searchQuery.length < 1 ? 'Start typing to search for users...' : 'No users found'}
              </div>
              {searchQuery.length >= 1 && (
                <div style={{ fontSize: fontSize.sm, color: colors.gray[400] }}>
                  Try a different search term or check another tab
                </div>
              )}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: spacing[6],
                  backgroundColor: colors.white,
                  border: `2px solid ${colors.gray[200]}`,
                  borderRadius: borderRadius.xl,
                  marginBottom: spacing[4],
                  transition: 'all 0.3s ease',
                  boxShadow: shadows.md,
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = colors.primary;
                  e.target.style.boxShadow = shadows.lg;
                  e.target.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = colors.gray[200];
                  e.target.style.boxShadow = shadows.md;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {/* Profile Picture */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: colors.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.white,
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  marginRight: spacing[6],
                  boxShadow: shadows.md,
                  border: `3px solid ${colors.white}`,
                }}>
                  {user.profile_picture ? (
                    <img
                      src={`http://127.0.0.1:8000/auth/serve-image/${user.profile_picture}`}
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
                <div style={{ flex: 1, marginRight: spacing[12] }}>
                  <div style={{
                    fontSize: fontSize.xl,
                    fontWeight: fontWeight.bold,
                    color: colors.dark,
                    marginBottom: spacing[2],
                  }}>
                    {user.username}
                  </div>
                  {user.bio && (
                    <div style={{
                      fontSize: fontSize.base,
                      color: colors.gray[600],
                      lineHeight: 1.5,
                      fontWeight: fontWeight.medium,
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
                    padding: `${spacing[4]} ${spacing[8]}`,
                    borderRadius: borderRadius.xl,
                    border: 'none',
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.bold,
                    cursor: user.is_member || user.has_pending_invitation || invitedUsers.has(user.id) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: shadows.lg,
                    minWidth: '120px',
                    ...getButtonStyle(user),
                  }}
                  onMouseEnter={(e) => {
                    if (!user.is_member && !user.has_pending_invitation && !invitedUsers.has(user.id)) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = shadows.xl;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!user.is_member && !user.has_pending_invitation && !invitedUsers.has(user.id)) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = shadows.lg;
                    }
                  }}
                >
                  {getButtonText(user)}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ForumInviteModal;

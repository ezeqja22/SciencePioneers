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
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [inviting, setInviting] = useState(false);

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
        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/invite-users?search=${encodeURIComponent(searchQuery)}&tab=${activeTab}`,
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

  const handleSearch = () => {
    if (searchQuery.trim().length >= 1) {
      fetchUsers();
    }
  };

  const handleInviteSelected = async () => {
    if (selectedUsers.size === 0) return;
    
    setInviting(true);
    try {
      const token = localStorage.getItem('token');
      const invitePromises = Array.from(selectedUsers).map(userId => 
        fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/invite`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ forum_id: forumId, invitee_id: userId }),
        })
      );

      const responses = await Promise.all(invitePromises);
      const successfulInvites = responses.filter(response => response.ok).length;
      
      if (successfulInvites > 0) {
        // Clear selected users and close modal after successful invitation
        setSelectedUsers(new Set());
        if (onInvite) {
          onInvite();
        }
        alert(`${successfulInvites} user(s) invited successfully!`);
        onClose(); // Close the modal after successful invitation
      } else {
        alert('Failed to invite users');
      }
    } catch (error) {
      alert(`Error inviting users: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getButtonText = (user) => {
    if (user.is_member) return 'Member';
    if (user.has_pending_invitation) return 'Invited';
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
    if (user.has_pending_invitation) {
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

  const getStatusBadge = (user) => {
    if (user.is_member) {
      return { text: 'Member', color: colors.success, bgColor: '#d4edda' };
    }
    if (user.has_pending_invitation) {
      return { text: 'Invited', color: colors.warning, bgColor: '#fff3cd' };
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        
        .modal-header {
          padding: 24px 24px 0 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-body {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        
        .search-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .search-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }
        
        .search-input:focus {
          outline: none;
          border-color: ${colors.primary};
        }
        
        .search-button {
          padding: 12px 24px;
          background-color: ${colors.primary};
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .search-button:hover {
          background-color: #2563eb;
        }
        
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }
        
        .tab.active {
          color: ${colors.primary};
          border-bottom-color: ${colors.primary};
          background-color: #f8fafc;
        }
        
        .tab:hover {
          color: ${colors.primary};
          background-color: #f8fafc;
        }
        
        .user-list {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background-color: #fafafa;
          flex: 1;
        }
        
        .user-list::-webkit-scrollbar {
          width: 8px;
        }
        
        .user-list::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .user-list::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        .user-list::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        .user-item {
          display: flex;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.2s;
        }
        
        .user-item:hover {
          background-color: #f8fafc;
        }
        
        .user-item:last-child {
          border-bottom: none;
        }
        
        .user-checkbox {
          margin-right: 16px;
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        
        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: ${colors.primary};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          margin-right: 16px;
        }
        
        .user-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .user-name {
          font-weight: 600;
          font-size: 16px;
          color: #1f2937;
        }
        
        .user-email {
          font-size: 14px;
          color: #6b7280;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          display: inline-block;
          width: fit-content;
          min-width: auto;
        }
        
        .invite-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
        }
        
        .invite-button:disabled {
          cursor: not-allowed;
        }
        
        .bulk-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-top: 1px solid #e5e7eb;
          margin-top: 16px;
        }
        
        .selected-count {
          color: #6b7280;
          font-size: 14px;
        }
        
        .bulk-invite-button {
          padding: 12px 24px;
          background-color: ${colors.secondary};
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .bulk-invite-button:hover {
          background-color: #4a5568;
        }
        
        .bulk-invite-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
      `}</style>
      
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1f2937' 
            }}>
              Invite Users
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Search */}
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                className="search-button"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Users
              </button>
              <button
                className={`tab ${activeTab === 'following' ? 'active' : ''}`}
                onClick={() => setActiveTab('following')}
              >
                Following
              </button>
              <button
                className={`tab ${activeTab === 'followers' ? 'active' : ''}`}
                onClick={() => setActiveTab('followers')}
              >
                Followers
              </button>
            </div>

            {/* User List */}
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
              {users.length > 0 && `Showing ${users.length} user${users.length !== 1 ? 's' : ''}`}
            </div>
            <div className="user-list">
              {loading ? (
                <div className="loading">Searching users...</div>
              ) : users.length === 0 ? (
                <div className="empty-state">
                  {searchQuery ? 'No users found matching your search.' : 'Enter a search term to find users to invite.'}
                </div>
              ) : (
                users.map((user) => {
                  const statusBadge = getStatusBadge(user);
                  const isSelected = selectedUsers.has(user.id);
                  
                  return (
                    <div key={user.id} className="user-item">
                      <input
                        type="checkbox"
                        className="user-checkbox"
                        checked={isSelected}
                        onChange={() => handleUserSelect(user.id)}
                        disabled={user.is_member || user.has_pending_invitation}
                      />
                      
                      <div className="user-avatar">
                        {getUserInitial(user.username)}
                      </div>
                      
                      <div className="user-info">
                        <div className="user-name">{user.username}</div>
                        <div className="user-email">{user.email}</div>
                        {statusBadge && (
                          <span 
                            className="status-badge"
                            style={{ 
                              color: statusBadge.color, 
                              backgroundColor: statusBadge.bgColor 
                            }}
                          >
                            {statusBadge.text}
                          </span>
                        )}
                      </div>
                      
                      <button
                        className="invite-button"
                        onClick={() => handleUserSelect(user.id)}
                        disabled={user.is_member || user.has_pending_invitation}
                        style={getButtonStyle(user)}
                      >
                        {getButtonText(user)}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="bulk-actions">
                <span className="selected-count">
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  className="bulk-invite-button"
                  onClick={handleInviteSelected}
                  disabled={inviting}
                >
                  {inviting ? 'Inviting...' : `Invite ${selectedUsers.size} User${selectedUsers.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ForumInviteModal;
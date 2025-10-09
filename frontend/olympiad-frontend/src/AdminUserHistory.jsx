import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLayout.css';

const AdminUserHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userHistory, setUserHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      alert('Please enter a username to search');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // First, find the user by username
      const token = localStorage.getItem('token');
      const userResponse = await axios.get(`http://127.0.0.1:8000/auth/user/${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userId = userResponse.data.user.id;
      
      // Then get their moderation history
      const historyResponse = await axios.get(`http://127.0.0.1:8000/admin/users/${userId}/moderation-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUserHistory(historyResponse.data);
    } catch (err) {
      console.error('Search error:', err);
      if (err.response?.status === 404) {
        setError('User not found');
      } else {
        setError('Failed to load user history');
      }
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'warn': return '#ffc107';
      case 'ban': return '#dc3545';
      case 'unban': return '#28a745';
      case 'deactivate': return '#dc3545';
      case 'activate': return '#28a745';
      case 'time_ban': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'warn': return '⚠️';
      case 'ban': return '🚫';
      case 'unban': return '✅';
      case 'deactivate': return '🔒';
      case 'activate': return '🔓';
      case 'time_ban': return '⏰';
      default: return '📝';
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-header">
        <h1>User History</h1>
        <p>Search for a user to view their moderation history</p>
      </div>

      {/* Search Form */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter username to search..."
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="admin-btn primary"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* User History Results */}
      {userHistory && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {/* User Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px solid #eee'
          }}>
            <div>
              <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>
                {userHistory.user.username}
              </h2>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                {userHistory.user.email}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: userHistory.user.is_banned ? '#dc3545' : '#28a745',
                color: 'white'
              }}>
                {userHistory.user.is_banned ? 'BANNED' : 'ACTIVE'}
              </span>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: userHistory.user.is_active ? '#28a745' : '#dc3545',
                color: 'white'
              }}>
                {userHistory.user.is_active ? 'ACTIVE' : 'DEACTIVATED'}
              </span>
            </div>
          </div>

          {/* Moderation History */}
          <div>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>Moderation History</h3>
            
            {userHistory.history.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#666',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                No moderation history found for this user.
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                {userHistory.history.map((entry, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '15px',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#fafafa'
                  }}>
                    {/* Action Icon */}
                    <div style={{
                      fontSize: '24px',
                      marginRight: '15px',
                      marginTop: '2px'
                    }}>
                      {getActionIcon(entry.action_type)}
                    </div>

                    {/* Entry Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: getActionColor(entry.action_type),
                          color: 'white',
                          textTransform: 'uppercase'
                        }}>
                          {entry.action_type}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div style={{
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#333'
                      }}>
                        <strong>Reason:</strong> {entry.reason}
                      </div>

                      {entry.duration && (
                        <div style={{
                          marginBottom: '8px',
                          fontSize: '14px',
                          color: '#333'
                        }}>
                          <strong>Duration:</strong> {entry.duration} days
                        </div>
                      )}

                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>
                          <strong>Moderator:</strong> {entry.moderator}
                        </span>
                        {entry.report_id && (
                          <span>
                            <strong>Report ID:</strong> #{entry.report_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!userHistory && !loading && (
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#666', marginBottom: '10px' }}>Search for a User</h3>
          <p style={{ color: '#999', margin: 0 }}>
            Enter a username above to view their complete moderation history, including warnings, bans, and other actions.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminUserHistory;

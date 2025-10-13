import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLayout.css';

const AdminForums = () => {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    privacy: '',
    page: 1
  });

  useEffect(() => {
    fetchForums();
  }, [filters]);

  const fetchForums = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.privacy) params.append('privacy', filters.privacy);
      params.append('page', filters.page);
      params.append('limit', 20);

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/forums?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setForums(response.data.forums);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load forums');
      console.error('Forums error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleDeleteForum = async (forumId, forumTitle) => {
    if (!window.confirm(`Are you sure you want to delete the forum "${forumTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/forums/${forumId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the forums list
      fetchForums();
    } catch (err) {
      console.error('Delete forum error:', err);
      alert('Failed to delete forum');
    }
  };

  const getPrivacyBadge = (isPrivate) => {
    return (
      <span className={`status-badge ${isPrivate ? 'inactive' : 'active'}`}>
        {isPrivate ? 'Private' : 'Public'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="admin-btn" onClick={fetchForums}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="admin-card">
        <h2>Forum Management</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label>Search</label>
            <input
              type="text"
              placeholder="Forum title..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <label>Privacy</label>
            <select
              value={filters.privacy}
              onChange={(e) => handleFilterChange('privacy', e.target.value)}
            >
              <option value="">All Forums</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forums Table */}
      <div className="admin-card">
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Forum</th>
                <th>Creator</th>
                <th>Type</th>
                <th>Members</th>
                <th>Created</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forums.map(forum => (
                <tr key={forum.id}>
                  <td>
                    <div>
                      <strong>{forum.title}</strong>
                      {forum.description && (
                        <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '4px' }}>
                          {forum.description.length > 100 
                            ? `${forum.description.substring(0, 100)}...` 
                            : forum.description
                          }
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{forum.creator}</strong>
                    </div>
                  </td>
                  <td>{getPrivacyBadge(forum.is_private)}</td>
                  <td>
                    <span style={{ 
                      background: '#e9ecef', 
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {forum.max_members} max
                    </span>
                  </td>
                  <td>{formatDate(forum.created_at)}</td>
                  <td>{formatDate(forum.last_activity)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="admin-btn secondary"
                        onClick={() => {
                          // Navigate to forum detail or open in new tab
                          window.open(`/forum/${forum.id}`, '_blank');
                        }}
                      >
                        View
                      </button>
                      
                      <button
                        className="admin-btn danger"
                        onClick={() => handleDeleteForum(forum.id, forum.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {forums.length === 0 && (
          <div className="empty-state">
            <h3>No forums found</h3>
            <p>No forums match your current filters.</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px', 
            marginTop: '20px' 
          }}>
            <button
              className="admin-btn secondary"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
            >
              Previous
            </button>
            
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0 15px',
              color: '#495057'
            }}>
              Page {filters.page} of {pagination.pages}
            </span>
            
            <button
              className="admin-btn secondary"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= pagination.pages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminForums;

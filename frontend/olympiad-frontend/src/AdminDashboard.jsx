import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminLayout.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
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
        <button className="admin-btn" onClick={fetchDashboardStats}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats.users.total}</p>
          <p className="stat-change positive">
            +{stats.users.new_today} today
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Active Users</h3>
          <p className="stat-value">{stats.users.active}</p>
          <p className="stat-change">
            {stats.users.banned} banned
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Forums</h3>
          <p className="stat-value">{stats.forums.total}</p>
          <p className="stat-change">
            {stats.forums.public} public, {stats.forums.private} private
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Problems</h3>
          <p className="stat-value">{stats.problems.total}</p>
          <p className="stat-change positive">
            +{stats.problems.new_today} today
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Pending Reports</h3>
          <p className="stat-value">{stats.reports.pending}</p>
          <p className="stat-change">
            Need review
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button 
            className="admin-btn"
            onClick={() => navigate('/admin/users')}
          >
            👥 Manage Users
          </button>
          <button 
            className="admin-btn"
            onClick={() => navigate('/admin/forums')}
          >
             Moderate Forums
          </button>
          <button 
            className="admin-btn"
            onClick={() => navigate('/admin/reports')}
          >
             Review Reports
          </button>
          <button 
            className="admin-btn secondary"
            onClick={() => navigate('/admin/email')}
          >
             Send Email
          </button>
          <button 
            className="admin-btn secondary"
            onClick={() => navigate('/admin/analytics')}
          >
            📈 View Analytics
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Users */}
        <div className="admin-card">
          <h2>Recent Users</h2>
          {stats.recent_users.length > 0 ? (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div>
                          <strong>{user.username}</strong>
                          <br />
                          <small>{user.email}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          user.role === 'admin' ? 'active' : 
                          user.role === 'moderator' ? 'pending' : 'inactive'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          user.is_active ? 'active' : 'inactive'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No recent users</h3>
              <p>No new users have joined recently.</p>
            </div>
          )}
        </div>

        {/* Recent Forums */}
        <div className="admin-card">
          <h2>Recent Forums</h2>
          {stats.recent_forums.length > 0 ? (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Forum</th>
                    <th>Creator</th>
                    <th>Type</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_forums.map(forum => (
                    <tr key={forum.id}>
                      <td>
                        <div>
                          <strong>{forum.title}</strong>
                        </div>
                      </td>
                      <td>{forum.creator}</td>
                      <td>
                        <span className={`status-badge ${
                          forum.is_private ? 'inactive' : 'active'
                        }`}>
                          {forum.is_private ? 'Private' : 'Public'}
                        </span>
                      </td>
                      <td>
                        {new Date(forum.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No recent forums</h3>
              <p>No new forums have been created recently.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

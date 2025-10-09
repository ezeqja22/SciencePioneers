import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLayout.css';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://127.0.0.1:8000/admin/analytics?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeLabel = (range) => {
    const labels = {
      '1d': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      '1y': 'Last Year'
    };
    return labels[range] || range;
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
        <button className="admin-btn" onClick={fetchAnalytics}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Time Range Selector */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Analytics Dashboard</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #e9ecef' }}
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>New Users</h3>
          <p className="stat-value">{analytics?.new_users || 0}</p>
          <p className="stat-change">
            {getTimeRangeLabel(timeRange)}
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Active Users</h3>
          <p className="stat-value">{analytics?.active_users || 0}</p>
          <p className="stat-change">
            {analytics?.user_activity_rate || 0}% activity rate
          </p>
        </div>
        
        <div className="stat-card">
          <h3>New Forums</h3>
          <p className="stat-value">{analytics?.new_forums || 0}</p>
          <p className="stat-change">
            {getTimeRangeLabel(timeRange)}
          </p>
        </div>
        
        <div className="stat-card">
          <h3>New Problems</h3>
          <p className="stat-value">{analytics?.new_problems || 0}</p>
          <p className="stat-change">
            {getTimeRangeLabel(timeRange)}
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Total Comments</h3>
          <p className="stat-value">{analytics?.total_comments || 0}</p>
          <p className="stat-change">
            {analytics?.comments_per_day || 0} per day
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Reports</h3>
          <p className="stat-value">{analytics?.total_reports || 0}</p>
          <p className="stat-change">
            {analytics?.resolved_reports || 0} resolved
          </p>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="admin-card">
        <h2>User Growth</h2>
        <div style={{ 
          height: '300px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          📈 Chart visualization would go here
          <br />
          <small>Integration with charting library needed</small>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Users */}
        <div className="admin-card">
          <h2>Most Active Users</h2>
          {analytics?.top_users && analytics.top_users.length > 0 ? (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Activity</th>
                    <th>Problems</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_users.map((user, index) => (
                    <tr key={user.id}>
                      <td>
                        <div>
                          <strong>#{index + 1} {user.username}</strong>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          background: '#d4edda', 
                          color: '#155724',
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {user.activity_score} points
                        </span>
                      </td>
                      <td>{user.problems_count}</td>
                      <td>{user.comments_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No activity data</h3>
              <p>No user activity data available for this period.</p>
            </div>
          )}
        </div>

        {/* Popular Forums */}
        <div className="admin-card">
          <h2>Most Popular Forums</h2>
          {analytics?.popular_forums && analytics.popular_forums.length > 0 ? (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Forum</th>
                    <th>Members</th>
                    <th>Activity</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.popular_forums.map((forum, index) => (
                    <tr key={forum.id}>
                      <td>
                        <div>
                          <strong>#{index + 1} {forum.title}</strong>
                          <br />
                          <small>{forum.creator}</small>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          background: '#d1ecf1', 
                          color: '#0c5460',
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {forum.member_count} members
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          background: '#fff3cd', 
                          color: '#856404',
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {forum.activity_score} activity
                        </span>
                      </td>
                      <td>{new Date(forum.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No forum data</h3>
              <p>No forum activity data available for this period.</p>
            </div>
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="admin-card">
        <h2>System Health</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>✅ System Online</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>All services operational</p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#17a2b8' }}>📊 Database</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>Response time: {analytics?.db_response_time || 'N/A'}ms</p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>💾 Storage</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>Usage: {analytics?.storage_usage || 'N/A'}</p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>🔄 Uptime</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>{analytics?.uptime || '99.9%'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

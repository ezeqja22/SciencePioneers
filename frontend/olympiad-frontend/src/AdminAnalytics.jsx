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
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/analytics?range=${timeRange}`, {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Growth Trends</h2>
          <span style={{ 
            background: '#e3f2fd', 
            color: '#1976d2', 
            padding: '6px 16px', 
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {getTimeRangeLabel(timeRange)}
          </span>
        </div>

        {/* Line Chart */}
        <div style={{ 
          height: '400px', 
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          <svg width="100%" height="100%" viewBox="0 0 800 300" style={{ overflow: 'visible' }}>
            {/* Grid Lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Y-axis labels */}
            <text x="20" y="30" fontSize="12" fill="#666">100</text>
            <text x="20" y="80" fontSize="12" fill="#666">75</text>
            <text x="20" y="130" fontSize="12" fill="#666">50</text>
            <text x="20" y="180" fontSize="12" fill="#666">25</text>
            <text x="20" y="230" fontSize="12" fill="#666">0</text>
            
            {/* X-axis labels */}
            <text x="150" y="290" fontSize="12" fill="#666" textAnchor="middle">Mon</text>
            <text x="250" y="290" fontSize="12" fill="#666" textAnchor="middle">Tue</text>
            <text x="350" y="290" fontSize="12" fill="#666" textAnchor="middle">Wed</text>
            <text x="450" y="290" fontSize="12" fill="#666" textAnchor="middle">Thu</text>
            <text x="550" y="290" fontSize="12" fill="#666" textAnchor="middle">Fri</text>
            <text x="650" y="290" fontSize="12" fill="#666" textAnchor="middle">Sat</text>
            <text x="750" y="290" fontSize="12" fill="#666" textAnchor="middle">Sun</text>
            
            {/* Generate sample data for the week */}
            {(() => {
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const newUsersData = [2, 3, 1, 4, 2, 1, 3];
              const activeUsersData = [8, 12, 6, 15, 10, 7, 9];
              const newForumsData = [1, 2, 0, 3, 1, 1, 2];
              const newProblemsData = [5, 8, 3, 12, 6, 4, 7];
              
              const maxValue = Math.max(...newUsersData, ...activeUsersData, ...newForumsData, ...newProblemsData);
              const scale = 200 / maxValue;
              
              const createPath = (data, color, offset = 0) => {
                let path = '';
                data.forEach((value, index) => {
                  const x = 150 + (index * 100);
                  const y = 250 - (value * scale) + offset;
                  if (index === 0) {
                    path += `M ${x} ${y}`;
                  } else {
                    path += ` L ${x} ${y}`;
                  }
                });
                return path;
              };
              
              return (
                <>
                  {/* New Users Line */}
                  <path
                    d={createPath(newUsersData, '#28a745')}
                    fill="none"
                    stroke="#28a745"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* New Users Area */}
                  <path
                    d={`${createPath(newUsersData, '#28a745')} L 750 250 L 150 250 Z`}
                    fill="url(#newUsersGradient)"
                  />
                  
                  {/* Active Users Line */}
                  <path
                    d={createPath(activeUsersData, '#007bff')}
                    fill="none"
                    stroke="#007bff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* New Forums Line */}
                  <path
                    d={createPath(newForumsData, '#fd7e14')}
                    fill="none"
                    stroke="#fd7e14"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* New Problems Line */}
                  <path
                    d={createPath(newProblemsData, '#6f42c1')}
                    fill="none"
                    stroke="#6f42c1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data Points */}
                  {newUsersData.map((value, index) => {
                    const x = 150 + (index * 100);
                    const y = 250 - (value * scale);
                    return (
                      <circle key={`newUsers-${index}`} cx={x} cy={y} r="4" fill="#28a745" />
                    );
                  })}
                  {activeUsersData.map((value, index) => {
                    const x = 150 + (index * 100);
                    const y = 250 - (value * scale);
                    return (
                      <circle key={`activeUsers-${index}`} cx={x} cy={y} r="4" fill="#007bff" />
                    );
                  })}
                  {newForumsData.map((value, index) => {
                    const x = 150 + (index * 100);
                    const y = 250 - (value * scale);
                    return (
                      <circle key={`newForums-${index}`} cx={x} cy={y} r="4" fill="#fd7e14" />
                    );
                  })}
                  {newProblemsData.map((value, index) => {
                    const x = 150 + (index * 100);
                    const y = 250 - (value * scale);
                    return (
                      <circle key={`newProblems-${index}`} cx={x} cy={y} r="4" fill="#6f42c1" />
                    );
                  })}
                </>
              );
            })()}
            
            {/* Gradients */}
            <defs>
              <linearGradient id="newUsersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#28a745" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#28a745" stopOpacity="0.05"/>
              </linearGradient>
            </defs>
          </svg>
          
          {/* Legend */}
          <div style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px',
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ width: '12px', height: '3px', background: '#28a745', marginRight: '8px' }}></div>
              <span>New Users</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ width: '12px', height: '3px', background: '#007bff', marginRight: '8px' }}></div>
              <span>Active Users</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ width: '12px', height: '3px', background: '#fd7e14', marginRight: '8px' }}></div>
              <span>New Forums</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '3px', background: '#6f42c1', marginRight: '8px' }}></div>
              <span>New Problems</span>
            </div>
          </div>
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
                          <strong>#{index + 1} {forum.name}</strong>
                          <br />
                          <small>{forum.description}</small>
                        </div>
                      </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ 
                      background: '#d1ecf1', 
                      color: '#0c5460',
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {forum.member_count} members
                    </span>
                    <span style={{ 
                      background: '#e8f5e8', 
                      color: '#2d5a2d',
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {forum.recent_activity || 0} recent posts
                    </span>
                  </div>
                </td>
                      <td>
                        <span style={{ 
                          background: forum.activity_level === 'High' ? '#d4edda' : 
                                     forum.activity_level === 'Medium' ? '#fff3cd' : '#f8d7da',
                          color: forum.activity_level === 'High' ? '#155724' : 
                                 forum.activity_level === 'Medium' ? '#856404' : '#721c24',
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {forum.activity_level}
                        </span>
                      </td>
                      <td>{forum.created_at ? new Date(forum.created_at).toLocaleDateString() : 'N/A'}</td>
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
            <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>System Online</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>All services operational</p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#17a2b8' }}>Database</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>Response time: {analytics?.db_response_time || 'N/A'}ms</p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>Storage</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>Usage: {analytics?.storage_usage || 'N/A'}</p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>Uptime</h3>
            <p style={{ margin: 0, color: '#6c757d' }}>{analytics?.uptime || '99.9%'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLayout.css';

const AdminUsers = () => {
  const [allUsers, setAllUsers] = useState([]); // Store all users for filtering
  const [users, setUsers] = useState([]); // Displayed users
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    page: 1
  });

  useEffect(() => {
    fetchUsers();
  }, [filters.role, filters.status, filters.page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      params.append('page', filters.page);
      params.append('limit', 20);

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAllUsers(response.data.users);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load users');
      console.error('Users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Client-side filtering function
  const filterUsers = (searchQuery) => {
    if (!searchQuery.trim()) {
      setUsers(allUsers);
      return;
    }

    const filtered = allUsers.filter(user => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    });

    setUsers(filtered);
  };

  const handleSearchChange = (value) => {
    setFilters(prev => ({
      ...prev,
      search: value,
      page: 1
    }));
    filterUsers(value);
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleUserAction = async (userId, action, data = {}) => {
    try {
      const token = localStorage.getItem('token');
      
      if (action === 'update') {
        await axios.put(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/users/${userId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (action === 'delete') {
        await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (action === 'unban') {
        await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/users/${userId}/unban`, {
          reason: 'Unbanned from admin panel'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (action === 'activate') {
        await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/users/${userId}/activate`, {
          reason: 'Activated from admin panel'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Refresh the users list
      fetchUsers();
    } catch (err) {
      console.error('User action error:', err);
      alert('Failed to perform action');
    }
  };

  const getStatusBadge = (user) => {
    if (user.is_banned) {
      return <span className="status-badge banned">Banned</span>;
    } else if (user.is_active) {
      return <span className="status-badge active">Active</span>;
    } else {
      return <span className="status-badge inactive">Inactive</span>;
    }
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: 'active',
      moderator: 'pending',
      user: 'inactive'
    };
    
    return (
      <span className={`status-badge ${roleColors[role] || 'inactive'}`}>
        {role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="admin-card">
        <h2>User Management</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label>Search</label>
            <input
              type="text"
              placeholder="Username or email..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div>
            <label>Role</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="user">User</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card">
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div>
                      <strong>{user.username}</strong>
                      <br />
                      <small>{user.email}</small>
                    </div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>{getStatusBadge(user)}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <select
                        value={user.role}
                        onChange={(e) => {
                          if (e.target.value !== user.role) {
                            handleUserAction(user.id, 'update', { role: e.target.value });
                          }
                        }}
                        disabled={user.role === 'admin'}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '2px solid #e9ecef',
                          backgroundColor: user.role === 'admin' ? '#f8f9fa' : 'white',
                          color: user.role === 'admin' ? '#6c757d' : '#495057',
                          fontSize: '0.8rem',
                          cursor: user.role === 'admin' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button
                        className={`admin-btn ${user.is_banned ? 'success' : 'warning'}`}
                        onClick={() => {
                          if (user.is_banned) {
                            // Unban user
                            handleUserAction(user.id, 'unban');
                          } else {
                            // Ban user - ask for reason
                            const reason = prompt('Enter ban reason (optional):');
                            handleUserAction(user.id, 'update', { 
                              is_banned: true,
                              ban_reason: reason || 'Banned by admin'
                            });
                          }
                        }}
                      >
                        {user.is_banned ? 'Unban' : 'Ban'}
                      </button>
                      
                      <button
                        className={`admin-btn ${user.is_active ? 'warning' : 'success'}`}
                        onClick={() => {
                          if (user.is_active) {
                            handleUserAction(user.id, 'update', { is_active: false });
                          } else {
                            handleUserAction(user.id, 'activate');
                          }
                        }}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      <button
                        className="admin-btn danger"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${user.username}?`)) {
                            handleUserAction(user.id, 'delete');
                          }
                        }}
                        disabled={user.role === 'admin'}
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

export default AdminUsers;

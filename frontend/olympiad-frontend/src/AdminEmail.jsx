import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLayout.css';

const AdminEmail = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    subject: '',
    content: '',
    target_audience: 'all',
    target_user_ids: []
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://127.0.0.1:8000/admin/email/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(response.data);
    } catch (err) {
      setError('Failed to load email campaigns');
      console.error('Email campaigns error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/admin/email/campaigns', newCampaign, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewCampaign({
        subject: '',
        content: '',
        target_audience: 'all',
        target_user_ids: []
      });
      setShowCreateForm(false);
      fetchCampaigns();
    } catch (err) {
      console.error('Create campaign error:', err);
      alert('Failed to create email campaign');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: 'pending',
      sent: 'resolved',
      scheduled: 'active',
      failed: 'banned'
    };
    
    return (
      <span className={`status-badge ${statusColors[status] || 'inactive'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not sent';
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
        <button className="admin-btn" onClick={fetchCampaigns}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Email Campaigns</h2>
          <button 
            className="admin-btn"
            onClick={() => setShowCreateForm(true)}
          >
            📧 Create Campaign
          </button>
        </div>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <div className="admin-card">
          <h3>Create New Email Campaign</h3>
          <form onSubmit={handleCreateCampaign} className="admin-form">
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject..."
                required
              />
            </div>
            
            <div className="form-group">
              <label>Content</label>
              <textarea
                value={newCampaign.content}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Email content..."
                rows={8}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Target Audience</label>
              <select
                value={newCampaign.target_audience}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, target_audience: e.target.value }))}
              >
                <option value="all">All Users</option>
                <option value="admins">Admins Only</option>
                <option value="moderators">Moderators Only</option>
                <option value="users">Regular Users Only</option>
                <option value="specific">Specific Users</option>
              </select>
            </div>
            
            {newCampaign.target_audience === 'specific' && (
              <div className="form-group">
                <label>User IDs (comma-separated)</label>
                <input
                  type="text"
                  value={newCampaign.target_user_ids.join(', ')}
                  onChange={(e) => setNewCampaign(prev => ({ 
                    ...prev, 
                    target_user_ids: e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                  }))}
                  placeholder="1, 2, 3, 4..."
                />
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="admin-btn">
                Create Campaign
              </button>
              <button 
                type="button" 
                className="admin-btn secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns List */}
      <div className="admin-card">
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Target</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Created By</th>
                <th>Created</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => (
                <tr key={campaign.id}>
                  <td>
                    <div>
                      <strong>{campaign.subject}</strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      background: '#e9ecef', 
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {campaign.target_audience}
                    </span>
                  </td>
                  <td>{getStatusBadge(campaign.status)}</td>
                  <td>
                    <span style={{ 
                      background: '#d1ecf1', 
                      color: '#0c5460',
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {campaign.recipient_count} users
                    </span>
                  </td>
                  <td>{campaign.created_by}</td>
                  <td>{formatDate(campaign.created_at)}</td>
                  <td>{formatDate(campaign.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {campaigns.length === 0 && (
          <div className="empty-state">
            <h3>No email campaigns</h3>
            <p>No email campaigns have been created yet.</p>
            <button 
              className="admin-btn"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmail;

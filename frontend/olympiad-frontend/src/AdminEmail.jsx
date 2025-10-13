import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLayout.css';

const AdminEmail = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
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
      const response = await axios.get('${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/email/campaigns', {
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
      await axios.post('${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/email/campaigns', newCampaign, {
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
    const getStatusStyle = (status) => {
      switch (status) {
        case 'draft':
          return {
            background: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeaa7'
          };
        case 'sent':
          return {
            background: '#d1ecf1',
            color: '#0c5460',
            border: '1px solid #bee5eb'
          };
        case 'scheduled':
          return {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb'
          };
        case 'failed':
          return {
            background: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb'
          };
        default:
          return {
            background: '#e2e3e5',
            color: '#383d41',
            border: '1px solid #d6d8db'
          };
      }
    };
    
    const style = getStatusStyle(status);
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: '500',
        ...style
      }}>
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

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to send this email campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/email/campaigns/${campaignId}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Campaign sent successfully! ${response.data.message}`);
      fetchCampaigns(); // Refresh the campaigns list
    } catch (err) {
      console.error('Send campaign error:', err);
      alert(`Failed to send campaign: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleViewCampaign = async (campaignId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/email/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedCampaign(response.data);
      setShowViewModal(true);
      
    } catch (err) {
      console.error('View campaign error:', err);
      alert(`Failed to load campaign details: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/email/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Campaign deleted successfully');
      fetchCampaigns(); // Refresh the campaigns list
    } catch (err) {
      console.error('Delete campaign error:', err);
      alert(`Failed to delete campaign: ${err.response?.data?.detail || err.message}`);
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
            Create Campaign
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
                <option value="marketing_opt_in">Marketing Opt-in Users</option>
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
                <th>Actions</th>
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
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {campaign.status === 'draft' && (
                        <button
                          className="admin-btn"
                          onClick={() => handleSendCampaign(campaign.id)}
                          style={{ 
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}
                        >
                          Send
                        </button>
                      )}
                      <button
                        className="admin-btn secondary"
                        onClick={() => handleViewCampaign(campaign.id)}
                        style={{ 
                          padding: '6px 12px',
                          fontSize: '0.8rem'
                        }}
                      >
                        View
                      </button>
                      {campaign.status === 'draft' && (
                        <button
                          className="admin-btn danger"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          style={{ 
                            padding: '6px 12px',
                            fontSize: '0.8rem'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
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

      {/* Campaign View Modal */}
      {showViewModal && selectedCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '90vw'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#1f2937',
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                Campaign Details
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCampaign(null);
                }}
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
                X
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#374151', fontSize: '0.9rem', fontWeight: '600' }}>
                Subject:
              </strong>
              <p style={{ 
                margin: '4px 0', 
                color: '#1f2937',
                fontSize: '1rem',
                fontWeight: '500'
              }}>
                {selectedCampaign.subject}
              </p>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#374151', fontSize: '0.9rem', fontWeight: '600' }}>
                Target Audience:
              </strong>
              <span style={{
                background: '#e9ecef',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                marginLeft: '8px',
                fontWeight: '500'
              }}>
                {selectedCampaign.target_audience}
              </span>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#374151', fontSize: '0.9rem', fontWeight: '600' }}>
                Status:
              </strong>
              <span style={{
                background: selectedCampaign.status === 'sent' ? '#d1ecf1' : 
                           selectedCampaign.status === 'draft' ? '#fff3cd' : 
                           selectedCampaign.status === 'scheduled' ? '#d4edda' : '#f8d7da',
                color: selectedCampaign.status === 'sent' ? '#0c5460' : 
                       selectedCampaign.status === 'draft' ? '#856404' : 
                       selectedCampaign.status === 'scheduled' ? '#155724' : '#721c24',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                marginLeft: '8px',
                fontWeight: '500'
              }}>
                {selectedCampaign.status}
              </span>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#374151', fontSize: '0.9rem', fontWeight: '600' }}>
                Recipients:
              </strong>
              <span style={{
                background: '#d1ecf1',
                color: '#0c5460',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                marginLeft: '8px',
                fontWeight: '500'
              }}>
                {selectedCampaign.recipient_count} users
              </span>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <strong style={{ color: '#374151', fontSize: '0.9rem', fontWeight: '600' }}>
                Content:
              </strong>
              <div style={{
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '8px',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {selectedCampaign.content}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCampaign(null);
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmail;

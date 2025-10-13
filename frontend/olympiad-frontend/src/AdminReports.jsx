import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReportDetailsModal from './ReportDetailsModal';
import './AdminLayout.css';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchReports();
    fetchCurrentUser();
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      params.append('page', filters.page);
      params.append('limit', 20);

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReports(response.data.reports);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load reports');
      console.error('Reports error:', err);
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

  const handleResolveReport = async (reportId, resolution) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/reports/${reportId}/resolve`, 
        { resolution }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the reports list
      fetchReports();
      alert('Report resolved successfully');
    } catch (err) {
      console.error('Resolve report error:', err);
      alert(`Failed to resolve report: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDismissReport = async (reportId, reason) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/admin/reports/${reportId}/dismiss`, 
        { reason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the reports list
      fetchReports();
      alert('Report dismissed successfully');
    } catch (err) {
      console.error('Dismiss report error:', err);
      alert(`Failed to dismiss report: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleViewReport = (reportId) => {
    setSelectedReportId(reportId);
    setShowReportModal(true);
  };

  const handleReportUpdate = () => {
    fetchReports();
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'pending',
      reviewed: 'active',
      resolved: 'resolved',
      dismissed: 'inactive'
    };
    
    return (
      <span className={`status-badge ${statusColors[status] || 'inactive'}`}>
        {status}
      </span>
    );
  };

  const getReportTypeIcon = (type) => {
    const icons = {
      user: '👤',
      forum: '💬',
      problem: '📝',
      comment: '💭',
      message: '💬'
    };
    return icons[type] || '📄';
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
        <button className="admin-btn" onClick={fetchReports}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="admin-card">
        <h2>Content Reports</h2>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Reports</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="admin-card">
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Reporter</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td>
                    <div>
                      <strong>
                        {getReportTypeIcon(report.report_type)} {report.report_type}
                      </strong>
                      <br />
                      <small>Target ID: {report.target_id}</small>
                      {report.description && (
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: '#6c757d', 
                          marginTop: '4px',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {report.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{report.reporter}</strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      background: '#e9ecef', 
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {report.report_type}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      background: '#f8d7da', 
                      color: '#721c24',
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {report.reason}
                    </span>
                  </td>
                  <td>{getStatusBadge(report.status)}</td>
                  <td>{formatDate(report.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className="admin-btn primary"
                        onClick={() => handleViewReport(report.id)}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        View Details
                      </button>
                      
                      {report.assigned_to && (
                        <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                          Assigned to {report.assigned_to}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {reports.length === 0 && (
          <div className="empty-state">
            <h3>No reports found</h3>
            <p>No reports match your current filters.</p>
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

        {/* Report Details Modal */}
        {showReportModal && (
          <ReportDetailsModal
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setSelectedReportId(null);
            }}
            reportId={selectedReportId}
            currentUser={currentUser}
            onReportUpdate={handleReportUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default AdminReports;

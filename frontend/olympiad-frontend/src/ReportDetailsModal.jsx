import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from './components/Button';

// Admin Panel Design System
const colors = {
    primary: "#667eea",
    secondary: "#764ba2", 
    accent: "#28a745",
    danger: "#dc3545",
    info: "#0ea5e9",
    error: "#dc3545",
    warning: "#ffc107",
    success: "#28a745",
    white: "#ffffff",
    gray: {
        50: "#f8f9fa",
        200: "#e9ecef",
        300: "#d1d5db",
        700: "#495057",
        800: "#2c3e50"
    }
};

const spacing = {
    xs: "4px",
    sm: "8px",
    md: "16px", 
    lg: "24px",
    xl: "32px"
};

const typography = {
    size: {
        sm: "14px",
        base: "16px",
        lg: "18px",
        xl: "20px"
    },
    weight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700"
    }
};

const borderRadius = {
    sm: "4px",
    md: "8px",
    lg: "12px"
};

const shadows = {
    sm: "0 2px 4px rgba(0,0,0,0.05)",
    md: "0 2px 10px rgba(0,0,0,0.08)",
    lg: "0 4px 20px rgba(0,0,0,0.12)"
};

const ReportDetailsModal = ({ isOpen, onClose, reportId, currentUser, onReportUpdate }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [investigationNotes, setInvestigationNotes] = useState('');
    const [resolution, setResolution] = useState('');
    const [emailContent, setEmailContent] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [userHistory, setUserHistory] = useState(null);
    const [showUserHistory, setShowUserHistory] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [banDuration, setBanDuration] = useState('permanent');
    const [showBanModal, setShowBanModal] = useState(false);
    const [targetUser, setTargetUser] = useState(null);

    useEffect(() => {
        if (isOpen && reportId) {
            fetchReportDetails();
        }
    }, [isOpen, reportId]);

    const fetchReportDetails = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://127.0.0.1:8000/admin/reports/${reportId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReport(response.data);
            setInvestigationNotes(response.data.investigation_notes || '');
            setResolution(response.data.resolution || '');
            
            // Set target user from the report data
            if (response.data.target_user) {
                setTargetUser(response.data.target_user);
            }
        } catch (err) {
            setError('Failed to load report details');
            console.error('Report details error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserHistory = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://127.0.0.1:8000/admin/users/${userId}/moderation-history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserHistory(response.data);
            setShowUserHistory(true);
        } catch (err) {
            console.error('User history error:', err);
            alert('Failed to load user history');
        }
    };

    const handleAssignReport = async () => {
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');
            await axios.put(`http://127.0.0.1:8000/admin/reports/${reportId}/assign`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Report assigned successfully');
            fetchReportDetails();
            if (onReportUpdate) onReportUpdate();
        } catch (err) {
            alert(`Failed to assign report: ${err.response?.data?.detail || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateNotes = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://127.0.0.1:8000/admin/reports/${reportId}/investigation-notes`, {
                notes: investigationNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Investigation notes updated');
        } catch (err) {
            alert(`Failed to update notes: ${err.response?.data?.detail || err.message}`);
        }
    };

    const handleResolveReport = async () => {
        if (!resolution.trim()) {
            alert('Please enter a resolution');
            return;
        }
        
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');
            await axios.put(`http://127.0.0.1:8000/admin/reports/${reportId}/resolve`, {
                resolution: resolution
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Report resolved successfully');
            fetchReportDetails();
            if (onReportUpdate) onReportUpdate();
        } catch (err) {
            alert(`Failed to resolve report: ${err.response?.data?.detail || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismissReport = async () => {
        if (!resolution.trim()) {
            alert('Please enter a dismissal reason');
            return;
        }
        
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');
            await axios.put(`http://127.0.0.1:8000/admin/reports/${reportId}/dismiss`, {
                reason: resolution
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Report dismissed successfully');
            fetchReportDetails();
            if (onReportUpdate) onReportUpdate();
        } catch (err) {
            alert(`Failed to dismiss report: ${err.response?.data?.detail || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleModerationAction = async (action, additionalData = {}) => {
        if (!report?.target_id) {
            alert('No target user found for this report');
            return;
        }
        
        const reason = prompt(`Enter reason for ${action}:`);
        if (!reason) return;

        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');
            const data = {
                reason,
                report_id: reportId,
                ...additionalData
            };

            await axios.post(`http://127.0.0.1:8000/admin/users/${report.target_id}/${action}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            alert(`User ${action} successfully`);
            
            // Refresh both report details and target user data
            await fetchReportDetails();
            
            // If this is a user report, refresh the target user data
            if (report.report_type === 'user' && report.target_id) {
                try {
                    const userResponse = await axios.get(`http://127.0.0.1:8000/auth/users/${report.target_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setTargetUser(userResponse.data);
                } catch (userErr) {
                    console.error('Failed to refresh target user:', userErr);
                }
            }
            
            if (onReportUpdate) onReportUpdate();
        } catch (err) {
            alert(`Failed to ${action} user: ${err.response?.data?.detail || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!emailContent.trim()) {
            alert('Please enter email content');
            return;
        }

        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');
            await axios.post(`http://127.0.0.1:8000/admin/reports/${reportId}/send-email`, {
                email_content: emailContent
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Email sent successfully');
            setShowEmailModal(false);
            fetchReportDetails();
        } catch (err) {
            alert(`Failed to send email: ${err.response?.data?.detail || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const generateEmailTemplate = () => {
        if (!report) return '';
        
        return `Hello ${report?.reporter?.username},

Your report regarding ${report?.report_type} has been reviewed and resolved.

Resolution: ${resolution}

Action Taken: [Describe what action was taken]

Thank you for helping keep our community safe.

Best regards,
${currentUser?.username || 'Admin'}`;
    };

    if (!isOpen) return null;

    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000
            }}>
                <div style={{
                    backgroundColor: colors.white,
                    padding: spacing.lg,
                    borderRadius: borderRadius.lg,
                    textAlign: 'center'
                }}>
                    <div>Loading report details...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000
            }}>
                <div style={{
                    backgroundColor: colors.white,
                    padding: spacing.lg,
                    borderRadius: borderRadius.lg,
                    textAlign: 'center'
                }}>
                    <div style={{ color: colors.error, marginBottom: spacing.md }}>{error}</div>
                    <button onClick={onClose} className="admin-btn">Close</button>
                </div>
            </div>
        );
    }

    const isAssignedToMe = report && report.assigned_to === currentUser?.username;
    const isAdminOrMod = currentUser && ['admin', 'moderator'].includes(currentUser.role);
    const canTakeReport = report && !report.assigned_to && report.status === 'pending' && isAdminOrMod;
    const canModerate = isAssignedToMe && report && report.status === 'under_review';
    const canResolve = isAssignedToMe && report && report.status === 'under_review';
    const canSendEmail = isAssignedToMe && report && report.status === 'resolved' && !report.email_sent;


    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: spacing.xl,
                    borderRadius: borderRadius.lg,
                    textAlign: 'center'
                }}>
                    Loading report details...
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: spacing.xl,
                    borderRadius: borderRadius.lg,
                    textAlign: 'center'
                }}>
                    <p style={{ color: colors.error, marginBottom: spacing.md }}>{error || 'Report not found'}</p>
                    <button onClick={onClose} className="admin-btn">Close</button>
                </div>
            </div>
        );
    }

    return (
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
            zIndex: 10000,
            padding: spacing.lg
        }}>
            <div style={{
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                boxShadow: shadows.lg,
                width: '100%',
                maxWidth: '1000px',
                maxHeight: '90vh',
                overflow: 'hidden',
                position: 'relative',
                border: `1px solid ${colors.gray[200]}`,
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                    color: colors.white,
                    padding: spacing.lg,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: typography.size.xl,
                            fontWeight: typography.weight.bold,
                            margin: 0,
                            color: colors.white
                        }}>
                            Report Details #{report?.id}
                        </h2>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: typography.size.sm,
                            opacity: 0.9
                        }}>
                            Investigation & Moderation Tools
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: colors.white,
                            padding: spacing.sm,
                            borderRadius: borderRadius.md,
                            transition: 'all 0.2s',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ 
                    padding: spacing.lg,
                    backgroundColor: colors.gray[50],
                    flex: 1,
                    overflow: 'auto',
                    maxHeight: 'calc(90vh - 120px)'
                }}>
                    {/* Report Info */}
                    <div style={{ 
                        marginBottom: spacing.lg,
                        backgroundColor: colors.white,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        border: `1px solid ${colors.gray[200]}`,
                        boxShadow: shadows.sm
                    }}>
                        <h3 style={{ 
                            marginBottom: spacing.md, 
                            color: colors.gray[800],
                            fontSize: typography.size.base,
                            fontWeight: typography.weight.semibold
                        }}>Report Information</h3>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: spacing.md 
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                <span style={{ fontSize: typography.size.sm, color: colors.gray[700], fontWeight: typography.weight.medium }}>Type</span>
                                <span style={{ fontSize: typography.size.base, color: colors.gray[800] }}>{report?.report_type}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                <span style={{ fontSize: typography.size.sm, color: colors.gray[700], fontWeight: typography.weight.medium }}>Reason</span>
                                <span style={{ fontSize: typography.size.base, color: colors.gray[800] }}>{report?.reason}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                <span style={{ fontSize: typography.size.sm, color: colors.gray[700], fontWeight: typography.weight.medium }}>Status</span>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    backgroundColor: report?.status === 'pending' ? colors.warning : 
                                                   report?.status === 'under_review' ? colors.info :
                                                   report?.status === 'resolved' ? colors.success : colors.gray[300],
                                    color: 'white',
                                    fontSize: typography.size.sm,
                                    fontWeight: typography.weight.medium,
                                    width: 'fit-content'
                                }}>
                                    {report?.status?.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                <span style={{ fontSize: typography.size.sm, color: colors.gray[700], fontWeight: typography.weight.medium }}>Assigned to</span>
                                <span style={{ fontSize: typography.size.base, color: colors.gray[800] }}>{report?.assigned_to || 'Unassigned'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                <span style={{ fontSize: typography.size.sm, color: colors.gray[700], fontWeight: typography.weight.medium }}>Reporter</span>
                                <span style={{ fontSize: typography.size.base, color: colors.gray[800] }}>{report?.reporter?.username}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                <span style={{ fontSize: typography.size.sm, color: colors.gray[700], fontWeight: typography.weight.medium }}>Reported User</span>
                                <span style={{ fontSize: typography.size.base, color: colors.gray[800] }}>
                                    {targetUser ? targetUser.username : (report?.target_user ? report.target_user.username : `User ID: ${report?.target_id}`)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                <span style={{ fontSize: typography.size.sm, color: colors.gray[700], fontWeight: typography.weight.medium }}>Created</span>
                                <span style={{ fontSize: typography.size.base, color: colors.gray[800] }}>{new Date(report?.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: spacing.lg }}>
                            <span style={{ 
                                fontSize: typography.size.sm, 
                                color: colors.gray[700], 
                                fontWeight: typography.weight.medium 
                            }}>Description</span>
                            <div style={{
                                marginTop: spacing.xs,
                                padding: spacing.md,
                                backgroundColor: colors.white,
                                borderRadius: borderRadius.md,
                                border: `1px solid ${colors.gray[200]}`,
                                minHeight: '60px',
                                fontSize: typography.size.base,
                                color: colors.gray[800],
                                lineHeight: '1.5'
                            }}>
                                {report?.description || 'No description provided'}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ 
                        marginBottom: spacing.lg,
                        backgroundColor: colors.white,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        border: `1px solid ${colors.gray[200]}`,
                        boxShadow: shadows.sm
                    }}>
                        <h3 style={{ 
                            marginBottom: spacing.md, 
                            color: colors.gray[800],
                            fontSize: typography.size.lg,
                            fontWeight: typography.weight.semibold
                        }}>Moderation Actions</h3>
                        
                        
                        {canTakeReport && (
                            <button
                                onClick={handleAssignReport}
                                disabled={actionLoading}
                                className="admin-btn"
                                style={{
                                    marginRight: spacing.sm,
                                    marginBottom: spacing.sm
                                }}
                            >
                                📋 Take Report
                            </button>
                        )}

                        {!canTakeReport && !isAssignedToMe && isAdminOrMod && report?.assigned_to && report?.assigned_to !== currentUser?.id && report?.status !== 'resolved' && report?.status !== 'dismissed' && (
                            <button
                                onClick={handleAssignReport}
                                disabled={actionLoading}
                                className="admin-btn"
                                style={{
                                    marginRight: spacing.sm,
                                    marginBottom: spacing.sm
                                }}
                            >
                                🔄 Take Over Report
                            </button>
                        )}

                        {isAssignedToMe && (
                            <>
                                <button
                                    onClick={() => fetchUserHistory(report?.reporter?.id)}
                                    className="admin-btn"
                                    style={{
                                        marginRight: spacing.sm,
                                        marginBottom: spacing.sm
                                    }}
                                >
                                    👤 View User History
                                </button>
                            </>
                        )}

                        {canModerate && (
                            <>
                                <button
                                    onClick={() => handleModerationAction('warn')}
                                    disabled={actionLoading}
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginRight: spacing.sm,
                                        marginBottom: spacing.sm
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    ⚠️ Warn User
                                </button>
                                <button
                                    onClick={() => setShowBanModal(true)}
                                    disabled={actionLoading}
                                    style={{
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginRight: spacing.sm,
                                        marginBottom: spacing.sm
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    🚫 Ban User
                                </button>
                                <button
                                    onClick={() => handleModerationAction('deactivate')}
                                    disabled={actionLoading}
                                    style={{
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginRight: spacing.sm,
                                        marginBottom: spacing.sm
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    🔒 Deactivate Account
                                </button>
                                {targetUser && targetUser.is_banned && (
                                    <button
                                        onClick={() => handleModerationAction('unban')}
                                        disabled={actionLoading}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            transition: 'all 0.2s',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginRight: spacing.sm,
                                            marginBottom: spacing.sm
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!actionLoading) {
                                                e.target.style.transform = 'translateY(-1px)';
                                                e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!actionLoading) {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        🔓 Unban User
                                    </button>
                                )}
                            </>
                        )}



                        {canSendEmail && (
                            <button
                                onClick={() => {
                                    setEmailContent(generateEmailTemplate());
                                    setShowEmailModal(true);
                                }}
                                className="admin-btn"
                                style={{
                                    marginRight: spacing.sm,
                                    marginBottom: spacing.sm
                                }}
                            >
                                📧 Send Email
                            </button>
                        )}

                        {canResolve && (
                            <>
                                <button
                                    onClick={handleDismissReport}
                                    disabled={actionLoading}
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginRight: spacing.sm,
                                        marginBottom: spacing.sm
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    ❌ Dismiss Report
                                </button>
                                <button
                                    onClick={handleResolveReport}
                                    disabled={actionLoading}
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginRight: spacing.sm,
                                        marginBottom: spacing.sm
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!actionLoading) {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    ✅ Resolve Report
                                </button>
                            </>
                        )}

                    </div>

                    {/* Investigation Notes */}
                    {isAssignedToMe && (
                        <div style={{ marginBottom: spacing.lg }}>
                            <h3 style={{ marginBottom: spacing.md, color: colors.gray[800] }}>Investigation Notes</h3>
                            <textarea
                                value={investigationNotes}
                                onChange={(e) => setInvestigationNotes(e.target.value)}
                                placeholder="Add investigation notes..."
                                rows="4"
                                style={{
                                    width: '100%',
                                    padding: spacing.sm,
                                    borderRadius: borderRadius.md,
                                    border: `1px solid ${colors.gray[300]}`,
                                    fontSize: typography.size.base,
                                    resize: 'vertical'
                                }}
                            />
                            <button
                                onClick={handleUpdateNotes}
                                className="admin-btn"
                                style={{
                                    marginTop: spacing.sm
                                }}
                            >
                                📝 Update Notes
                            </button>
                        </div>
                    )}

                    {/* Resolution */}
                    {canResolve && (
                        <div style={{ marginBottom: spacing.lg }}>
                            <h3 style={{ marginBottom: spacing.md, color: colors.gray[800] }}>Resolution</h3>
                            <textarea
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                placeholder="Enter resolution details..."
                                rows="3"
                                style={{
                                    width: '100%',
                                    padding: spacing.sm,
                                    borderRadius: borderRadius.md,
                                    border: `1px solid ${colors.gray[300]}`,
                                    fontSize: typography.size.base,
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                    )}

                    {/* Email History */}
                    {report?.email_sent && (
                        <div style={{ marginBottom: spacing.lg }}>
                            <h3 style={{ marginBottom: spacing.md, color: colors.gray[800] }}>Email Sent</h3>
                            <div style={{
                                padding: spacing.sm,
                                backgroundColor: colors.gray[50],
                                borderRadius: borderRadius.md,
                                border: `1px solid ${colors.gray[200]}`
                            }}>
                                <div style={{ marginBottom: spacing.xs }}>
                                    <strong>Sent:</strong> {new Date(report?.email_sent_at).toLocaleString()}
                                </div>
                                <div>
                                    <strong>Content:</strong>
                                    <pre style={{
                                        marginTop: spacing.xs,
                                        whiteSpace: 'pre-wrap',
                                        fontSize: typography.size.sm,
                                        color: colors.gray[700]
                                    }}>
                                        {report?.email_content}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Email Modal */}
            {showEmailModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10001
                }}>
                    <div style={{
                        backgroundColor: colors.white,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        boxShadow: shadows.lg,
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginBottom: spacing.md }}>Send Email to Reporter</h3>
                        <textarea
                            value={emailContent}
                            onChange={(e) => setEmailContent(e.target.value)}
                            rows="10"
                            style={{
                                width: '100%',
                                padding: spacing.sm,
                                borderRadius: borderRadius.md,
                                border: `1px solid ${colors.gray[300]}`,
                                fontSize: typography.size.base,
                                resize: 'vertical'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md }}>
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="admin-btn secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={actionLoading}
                                className="admin-btn"
                            >
                                📧 Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User History Modal */}
            {showUserHistory && userHistory && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10001
                }}>
                    <div style={{
                        backgroundColor: colors.white,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        boxShadow: shadows.lg,
                        width: '90%',
                        maxWidth: '800px',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                            <h3>User History: {userHistory.user.username}</h3>
                            <button
                                onClick={() => setShowUserHistory(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: spacing.md }}>
                            <strong>Current Status:</strong>
                            <div style={{ marginTop: spacing.xs }}>
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: userHistory.user.is_banned ? colors.error : colors.success,
                                    color: 'white',
                                    fontSize: '12px',
                                    marginRight: spacing.sm
                                }}>
                                    {userHistory.user.is_banned ? 'BANNED' : 'ACTIVE'}
                                </span>
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: userHistory.user.is_active ? colors.success : colors.error,
                                    color: 'white',
                                    fontSize: '12px'
                                }}>
                                    {userHistory.user.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <h4>Moderation History:</h4>
                            {userHistory.history.length === 0 ? (
                                <p>No moderation history found.</p>
                            ) : (
                                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                                    {userHistory.history.map((entry, index) => (
                                        <div key={index} style={{
                                            padding: spacing.sm,
                                            border: `1px solid ${colors.gray[200]}`,
                                            borderRadius: borderRadius.md,
                                            marginBottom: spacing.sm
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: colors.primary,
                                                    color: 'white',
                                                    fontSize: '12px'
                                                }}>
                                                    {entry.action_type.toUpperCase()}
                                                </span>
                                                <span style={{ fontSize: '12px', color: colors.gray[600] }}>
                                                    {new Date(entry.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ marginTop: spacing.xs }}>
                                                <strong>Reason:</strong> {entry.reason}
                                            </div>
                                            {entry.duration && (
                                                <div style={{ marginTop: spacing.xs }}>
                                                    <strong>Duration:</strong> {entry.duration} days
                                                </div>
                                            )}
                                            <div style={{ marginTop: spacing.xs, fontSize: '12px', color: colors.gray[600] }}>
                                                By: {entry.moderator}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Ban Duration Modal */}
            {showBanModal && (
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
                    zIndex: 10001
                }}>
                    <div style={{
                        backgroundColor: colors.white,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        boxShadow: shadows.lg,
                        width: '400px',
                        maxWidth: '90vw'
                    }}>
                        <h3 style={{
                            marginBottom: spacing.md,
                            color: colors.gray[800],
                            fontSize: typography.size.lg,
                            fontWeight: typography.weight.semibold
                        }}>
                            🚫 Ban User
                        </h3>
                        
                        <div style={{ marginBottom: spacing.md }}>
                            <label style={{
                                display: 'block',
                                marginBottom: spacing.xs,
                                fontWeight: typography.weight.medium,
                                color: colors.gray[700]
                            }}>
                                Ban Duration:
                            </label>
                            <select
                                value={banDuration}
                                onChange={(e) => setBanDuration(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: `2px solid ${colors.gray[200]}`,
                                    borderRadius: borderRadius.md,
                                    fontSize: typography.size.base,
                                    backgroundColor: colors.white
                                }}
                            >
                                <option value="1">1 Day</option>
                                <option value="2">2 Days</option>
                                <option value="7">1 Week</option>
                                <option value="30">1 Month</option>
                                <option value="365">1 Year</option>
                                <option value="permanent">Permanent</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
                            <button
                                onClick={() => setShowBanModal(false)}
                                className="admin-btn secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleModerationAction('ban', { duration: banDuration === 'permanent' ? null : parseInt(banDuration) });
                                    setShowBanModal(false);
                                }}
                                disabled={actionLoading}
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🚫 Ban User
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReportDetailsModal;

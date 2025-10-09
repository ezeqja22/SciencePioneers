import React, { useState } from 'react';
import axios from 'axios';

const ReportModal = ({ isOpen, onClose, reportType, targetId, targetUser }) => {
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reportCategories = [
        { value: 'harassment', label: 'Harassment - Bullying, threats, personal attacks' },
        { value: 'spam', label: 'Spam - Repetitive, unwanted content' },
        { value: 'inappropriate', label: 'Inappropriate Content - NSFW, offensive material' },
        { value: 'copyright', label: 'Copyright Violation - Plagiarism, stolen content' },
        { value: 'fake', label: 'Fake Information - Misleading or false content' },
        { value: 'other', label: 'Other - Miscellaneous violations' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category || !description.trim()) {
            alert('Please select a category and provide a description');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const reportData = {
                category,
                description: description.trim()
            };

            let endpoint = '';
            let data = {};

            if (reportType === 'comment') {
                endpoint = `/reports/comment`;
                data = { comment_id: targetId, ...reportData };
            } else if (reportType === 'message') {
                endpoint = `/reports/message`;
                data = { message_id: targetId, ...reportData };
            } else if (reportType === 'user') {
                endpoint = `/reports/user`;
                data = { user_id: targetId, ...reportData };
            }

            const response = await axios.post(`http://127.0.0.1:8000/auth${endpoint}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Report submitted successfully! We will review it and contact you via email if further action is needed.');
            onClose();
            setCategory('');
            setDescription('');
        } catch (error) {
            console.error('Error submitting report:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            alert(`Failed to submit report: ${error.response?.data?.detail || error.message}. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                        Report {reportType === 'user' ? 'User' : reportType === 'comment' ? 'Comment' : 'Message'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#666'
                        }}
                    >
                        ×
                    </button>
                </div>

                {targetUser && (
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <strong>Reporting:</strong> {targetUser.username}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '500',
                            fontSize: '0.9rem'
                        }}>
                            Category *
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #e9ecef',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                backgroundColor: 'white'
                            }}
                            required
                        >
                            <option value="">Select a category</option>
                            {reportCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '500',
                            fontSize: '0.9rem'
                        }}>
                            Description *
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please provide details about why you're reporting this content..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #e9ecef',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                minHeight: '120px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                            }}
                            required
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '12px 24px',
                                border: '2px solid #e9ecef',
                                borderRadius: '8px',
                                backgroundColor: 'white',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                backgroundColor: isSubmitting ? '#ccc' : '#dc3545',
                                color: 'white',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;

import React, { useState } from 'react';
import axios from 'axios';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const ForumProblemModal = ({ isOpen, onClose, forumId, onProblemCreated }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subject: '',
        level: 'Any Level',
        year: '',
        tags: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const subjects = [
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 
        'Computer Science', 'Engineering', 'Other'
    ];


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim() || !formData.subject) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setError('Please log in to create a problem');
                return;
            }

            // Create the problem directly in the forum
            const problemData = {
                ...formData,
                year: formData.year ? parseInt(formData.year) : null
            };

            const response = await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/problems`, problemData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Send the problem as a message to the forum
            await axios.post(`http://127.0.0.1:8000/auth/forums/${forumId}/messages`, {
                content: `Posted a new problem: "${formData.title}"`,
                message_type: "problem",
                problem_id: response.data.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Reset form and close modal
            setFormData({
                title: '',
                description: '',
                subject: '',
                level: 'Any Level',
                year: '',
                tags: ''
            });
            onClose();
            if (onProblemCreated) {
                onProblemCreated(response.data);
            }
        } catch (error) {
            console.error('Error creating problem:', error);
            setError(error.response?.data?.detail || 'Failed to create problem');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                title: '',
                description: '',
                subject: '',
                level: 'Any Level',
                year: '',
                tags: ''
            });
            setError('');
            onClose();
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
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                padding: spacing.xl,
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: shadows.xl
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.lg
                }}>
                    <h2 style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.dark,
                        margin: 0
                    }}>
                        Create Problem for Forum
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            color: colors.gray[500],
                            padding: spacing.xs
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: colors.error + '20',
                        color: colors.error,
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing.lg,
                        border: `1px solid ${colors.error}40`
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                        {/* Title */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.medium,
                                color: colors.dark,
                                marginBottom: spacing.xs
                            }}>
                                Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Enter problem title..."
                                required
                                style={{
                                    width: '100%',
                                    padding: spacing.sm,
                                    border: `1px solid ${colors.gray[300]}`,
                                    borderRadius: borderRadius.md,
                                    fontSize: typography.fontSize.base,
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Subject and Level */}
                        <div style={{ display: 'flex', gap: spacing.md }}>
                            <div style={{ flex: 1 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.medium,
                                    color: colors.dark,
                                    marginBottom: spacing.xs
                                }}>
                                    Subject *
                                </label>
                                <select
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">Select subject...</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.medium,
                                    color: colors.dark,
                                    marginBottom: spacing.xs
                                }}>
                                    Level
                                </label>
                                <input
                                    type="text"
                                    name="level"
                                    value={formData.level}
                                    onChange={handleChange}
                                    placeholder="e.g., High School, Undergraduate"
                                    style={{
                                        width: '100%',
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Year and Tags */}
                        <div style={{ display: 'flex', gap: spacing.md }}>
                            <div style={{ flex: 1 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.medium,
                                    color: colors.dark,
                                    marginBottom: spacing.xs
                                }}>
                                    Year
                                </label>
                                <input
                                    type="number"
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    placeholder="e.g., 2024"
                                    style={{
                                        width: '100%',
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.medium,
                                    color: colors.dark,
                                    marginBottom: spacing.xs
                                }}>
                                    Tags
                                </label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    placeholder="e.g., algebra, geometry"
                                    style={{
                                        width: '100%',
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.medium,
                                color: colors.dark,
                                marginBottom: spacing.xs
                            }}>
                                Description *
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the problem in detail..."
                                required
                                rows={6}
                                style={{
                                    width: '100%',
                                    padding: spacing.sm,
                                    border: `1px solid ${colors.gray[300]}`,
                                    borderRadius: borderRadius.md,
                                    fontSize: typography.fontSize.base,
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: spacing.md,
                        justifyContent: 'flex-end',
                        marginTop: spacing.xl
                    }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            style={{
                                padding: `${spacing.sm} ${spacing.lg}`,
                                backgroundColor: colors.gray[200],
                                color: colors.gray[700],
                                border: 'none',
                                borderRadius: borderRadius.md,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.medium
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: `${spacing.sm} ${spacing.lg}`,
                                backgroundColor: loading ? colors.gray[400] : colors.primary,
                                color: colors.white,
                                border: 'none',
                                borderRadius: borderRadius.md,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.medium
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Problem'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForumProblemModal;

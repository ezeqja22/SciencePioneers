import React, { useState } from 'react';
import axios from 'axios';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import MathEditor from './MathEditor';
import './MathEditor.css';

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
    const [showMathEditor, setShowMathEditor] = useState(false);
    const [mathEditorTarget, setMathEditorTarget] = useState(null); // 'title' or 'description'
    const [images, setImages] = useState([]); // Array of uploaded image files
    const [uploadingImages, setUploadingImages] = useState(false);

    const subjects = [
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 
        'Computer Science', 'Engineering', 'Other'
    ];

    const openMathEditor = (target) => {
        setMathEditorTarget(target);
        setShowMathEditor(true);
    };

    const handleMathInsert = (mathContent) => {
        if (mathEditorTarget) {
            setFormData({
                ...formData,
                [mathEditorTarget]: formData[mathEditorTarget] + mathContent
            });
        }
        setShowMathEditor(false);
        setMathEditorTarget(null);
    };

    const closeMathEditor = () => {
        setShowMathEditor(false);
        setMathEditorTarget(null);
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                alert(`${file.name} is not an image file`);
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} is too large. Maximum size is 5MB`);
                return false;
            }
            return true;
        });

        if (images.length + validFiles.length > 10) {
            alert('Maximum 10 images allowed');
            return;
        }

        setImages(prev => [...prev, ...validFiles]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

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

            const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/problems`, problemData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Upload images if any
            if (images.length > 0) {
                setUploadingImages(true);
                try {
                    for (const file of images) {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const uploadUrl = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${response.data.id}/images`;
                        
                        await axios.post(
                            uploadUrl,
                            formData,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'multipart/form-data'
                                }
                            }
                        );
                    }
                } catch (error) {
                    console.error("Error uploading images:", error);
                    alert(`Problem created but images failed to upload: ${error.response?.data?.detail || error.message}. You can add them later by editing the problem.`);
                } finally {
                    setUploadingImages(false);
                }
            }

            // Send the problem as a message to the forum
            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages`, {
                content: `Posted a new problem: `${formData.title}``,
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
            setImages([]);
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
                            <div style={{ display: 'flex', gap: spacing.sm }}>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter problem title..."
                                    required
                                    style={{
                                        flex: 1,
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => openMathEditor('title')}
                                    style={{
                                        padding: "12px 16px",
                                        backgroundColor: colors.secondary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: borderRadius.md,
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        whiteSpace: "nowrap"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = colors.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = colors.secondary;
                                    }}
                                >
                                    Math
                                </button>
                            </div>
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
                            <div style={{ display: 'flex', gap: spacing.sm }}>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe the problem in detail..."
                                    required
                                    rows={6}
                                    style={{
                                        flex: 1,
                                        padding: spacing.sm,
                                        border: `1px solid ${colors.gray[300]}`,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.base,
                                        outline: 'none',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => openMathEditor('description')}
                                    style={{
                                        padding: "12px 16px",
                                        backgroundColor: colors.secondary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: borderRadius.md,
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        whiteSpace: "nowrap",
                                        alignSelf: "flex-start"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = colors.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = colors.secondary;
                                    }}
                                >
                                    Math
                                </button>
                            </div>
                        </div>

                        {/* Images */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.medium,
                                color: colors.dark,
                                marginBottom: spacing.xs
                            }}>
                                Images (Optional) - {images.length}/10
                            </label>
                            <div style={{
                                border: `2px dashed ${colors.gray[300]}`,
                                borderRadius: borderRadius.md,
                                padding: spacing.lg,
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: images.length > 0 ? colors.gray[50] : 'transparent'
                            }}
                            onClick={() => document.getElementById('image-upload').click()}
                            onMouseEnter={(e) => {
                                e.target.style.borderColor = colors.primary;
                                e.target.style.backgroundColor = colors.primary + '10';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.borderColor = colors.gray[300];
                                e.target.style.backgroundColor = images.length > 0 ? colors.gray[50] : 'transparent';
                            }}
                            >
                                <input
                                    id="image-upload"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />
                                <div style={{ fontSize: '24px', marginBottom: spacing.sm }}>📷</div>
                                <div style={{ fontSize: typography.fontSize.base, color: colors.dark, marginBottom: spacing.xs }}>
                                    {images.length > 0 ? `${images.length} image(s) selected` : 'Add Image'}
                                </div>
                                <div style={{ fontSize: typography.fontSize.sm, color: colors.gray[600] }}>
                                    Upload up to 10 diagrams, graphs, or other images to help illustrate your problem
                                </div>
                            </div>

                            {/* Image Preview */}
                            {images.length > 0 && (
                                <div style={{ marginTop: spacing.md }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                                        {images.map((file, index) => (
                                            <div key={index} style={{
                                                position: 'relative',
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: borderRadius.md,
                                                overflow: 'hidden',
                                                border: `1px solid ${colors.gray[300]}`
                                            }}>
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Preview ${index + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '4px',
                                                        right: '4px',
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        backgroundColor: colors.error,
                                                        color: 'white',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                            disabled={loading || uploadingImages}
                            style={{
                                padding: `${spacing.sm} ${spacing.lg}`,
                                backgroundColor: (loading || uploadingImages) ? colors.gray[400] : colors.primary,
                                color: colors.white,
                                border: 'none',
                                borderRadius: borderRadius.md,
                                cursor: (loading || uploadingImages) ? 'not-allowed' : 'pointer',
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.medium
                            }}
                        >
                            {uploadingImages ? 'Uploading Images...' : loading ? 'Creating...' : 'Create Problem'}
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Math Editor Modal */}
            <MathEditor
                isOpen={showMathEditor}
                onClose={closeMathEditor}
                onInsert={handleMathInsert}
                initialValue=""
            />
        </div>
    );
};

export default ForumProblemModal;

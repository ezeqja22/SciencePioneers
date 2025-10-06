import React from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const ForumProblemCard = ({ problem, author, forumId }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (problem?.id) {
            navigate(`/problem/${problem.id}?from=forum&forumId=${forumId}`);
        }
    };

    if (!problem) {
        return (
            <div style={{
                backgroundColor: colors.gray[100],
                border: `1px solid ${colors.gray[200]}`,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                textAlign: 'center',
                color: colors.gray[600]
            }}>
                Loading problem...
            </div>
        );
    }

    const getDifficultyColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'elementary':
                return colors.success;
            case 'middle school':
                return colors.warning;
            case 'high school':
                return colors.primary;
            case 'undergraduate':
                return colors.secondary;
            case 'graduate':
                return colors.error;
            default:
                return colors.gray[500];
        }
    };

    const getSubjectColor = (subject) => {
        const colors_map = {
            'mathematics': colors.primary,
            'physics': colors.secondary,
            'chemistry': colors.success,
            'biology': colors.warning,
            'computer science': colors.error,
            'engineering': colors.gray[600],
            'other': colors.gray[500]
        };
        return colors_map[subject?.toLowerCase()] || colors.gray[500];
    };

    const renderMathContent = (text) => {
        if (!text) return '';
        
        const latexPattern = /\\[a-zA-Z]+|\\[^a-zA-Z]|\$\$|\\\(|\\\)|\\\[|\\\]|\^|\_|\{|\}|\[|\]|∫|∑|∏|√|α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω|∞|±|∓|×|÷|≤|≥|≠|≈|≡|∈|∉|⊂|⊃|∪|∩|∅|∇|∂|∆|Ω|Φ|Ψ|Λ|Σ|Π|Θ|Ξ|Γ|Δ/;
        if (!latexPattern.test(text)) {
            return text;
        }
        
        try {
            return <InlineMath math={text} />;
        } catch (error) {
            console.error('Math rendering error:', error);
            return text;
        }
    };

    return (
        <div
            onClick={handleClick}
            style={{
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray[200]}`,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: shadows.sm,
                margin: `${spacing.xs} 0`
            }}
            onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = shadows.md;
            }}
            onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = shadows.sm;
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: spacing.sm
            }}>
                <h3 style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.dark,
                    margin: 0,
                    flex: 1,
                    lineHeight: 1.3
                }}>
                    {renderMathContent(problem.title)}
                </h3>
            </div>

            {/* Description Preview */}
            <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.gray[600],
                margin: `0 0 ${spacing.sm} 0`,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
            }}>
                {renderMathContent(problem.description)}
            </p>

            {/* Tags and Badges */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: spacing.xs,
                alignItems: 'center',
                marginBottom: spacing.sm
            }}>
                {/* Subject Badge */}
                {problem.subject && (
                    <span style={{
                        backgroundColor: getSubjectColor(problem.subject) + '20',
                        color: getSubjectColor(problem.subject),
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium
                    }}>
                        {problem.subject}
                    </span>
                )}

                {/* Difficulty Badge */}
                {problem.level && problem.level !== 'Any Level' && (
                    <span style={{
                        backgroundColor: getDifficultyColor(problem.level) + '20',
                        color: getDifficultyColor(problem.level),
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium
                    }}>
                        {problem.level}
                    </span>
                )}

                {/* Year Badge */}
                {problem.year && (
                    <span style={{
                        backgroundColor: colors.gray[100],
                        color: colors.gray[600],
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium
                    }}>
                        {problem.year}
                    </span>
                )}
            </div>

            {/* Tags */}
            {problem.tags && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing.xs,
                    marginBottom: spacing.sm
                }}>
                    {problem.tags.split(',').map((tag, index) => (
                        <span
                            key={index}
                            style={{
                                backgroundColor: colors.gray[50],
                                color: colors.gray[600],
                                padding: `${spacing.xs} ${spacing.sm}`,
                                borderRadius: borderRadius.sm,
                                fontSize: typography.fontSize.xs,
                                fontWeight: typography.fontWeight.medium
                            }}
                        >
                            #{tag.trim()}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: typography.fontSize.xs,
                color: colors.gray[500]
            }}>
                <span>
                    Click to view full problem
                </span>
                <span>
                    {new Date(problem.created_at).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};

export default ForumProblemCard;

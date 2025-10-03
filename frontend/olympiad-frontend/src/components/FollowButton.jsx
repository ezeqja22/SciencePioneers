import React from 'react';
import { colors, spacing, typography, borderRadius } from '../designSystem';

const FollowButton = ({ 
    isFollowing, 
    onFollow, 
    onUnfollow, 
    loading = false, 
    size = 'md',
    style = {}
}) => {
    const sizes = {
        sm: {
            padding: `${spacing.xs} ${spacing.sm}`,
            fontSize: typography.fontSize.xs,
            minWidth: '80px'
        },
        md: {
            padding: `${spacing.sm} ${spacing.md}`,
            fontSize: typography.fontSize.sm,
            minWidth: '100px'
        },
        lg: {
            padding: `${spacing.md} ${spacing.lg}`,
            fontSize: typography.fontSize.md,
            minWidth: '120px'
        }
    };

    const currentSize = sizes[size];

    const handleClick = (e) => {
        e.stopPropagation();
        if (loading) return;
        
        if (isFollowing) {
            onUnfollow();
        } else {
            onFollow();
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            style={{
                ...currentSize,
                backgroundColor: isFollowing ? colors.gray[200] : colors.primary,
                color: isFollowing ? colors.gray[700] : colors.white,
                border: "none",
                borderRadius: borderRadius.md,
                cursor: loading ? 'not-allowed' : "pointer",
                fontWeight: typography.fontWeight.medium,
                transition: "all 0.2s ease",
                opacity: loading ? 0.6 : 1,
                ...style
            }}
            onMouseEnter={(e) => {
                if (loading) return;
                
                if (isFollowing) {
                    e.target.style.backgroundColor = colors.danger;
                    e.target.style.color = colors.white;
                    e.target.textContent = "Unfollow";
                } else {
                    e.target.style.backgroundColor = colors.primaryDark;
                }
            }}
            onMouseLeave={(e) => {
                if (loading) return;
                
                if (isFollowing) {
                    e.target.style.backgroundColor = colors.gray[200];
                    e.target.style.color = colors.gray[700];
                    e.target.textContent = "✓ Following";
                } else {
                    e.target.style.backgroundColor = colors.primary;
                }
            }}
        >
            {loading ? 'Loading...' : (isFollowing ? "✓ Following" : "+ Follow")}
        </button>
    );
};

export default FollowButton;

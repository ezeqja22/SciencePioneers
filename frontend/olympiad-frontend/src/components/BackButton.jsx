// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { colors, spacing, typography } from "../designSystem";

const BackButton = ({ 
    fallbackPath = "/homepage", 
    style = {}, 
    hoverStyle = {},
    className = "",
    children = "← Back"
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        // If we have a specific fallback path (like /feed?tab=following), use it
        // This ensures smart navigation with context preservation
        if (fallbackPath !== "/homepage") {
            navigate(fallbackPath);
        } else {
            // Only use browser history for default homepage fallback
            if (window.history.length > 1) {
                navigate(-1); // Go back one step in browser history
            } else {
                // Final fallback if no history
                navigate(fallbackPath);
            }
        }
    };

    const defaultStyle = {
        display: "inline-flex",
        alignItems: "center",
        gap: spacing.xs,
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: "transparent",
        color: colors.gray[600],
        border: `1px solid ${colors.gray[300]}`,
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        textDecoration: "none",
        transition: "all 0.2s ease",
        ...style
    };

    const defaultHoverStyle = {
        backgroundColor: colors.primary,
        color: colors.white,
        borderColor: colors.primary,
        transform: "translateY(-1px)",
        ...hoverStyle
    };

    return (
        <button
            onClick={handleBack}
            className={className}
            style={defaultStyle}
            onMouseEnter={(e) => {
                Object.assign(e.target.style, defaultHoverStyle);
            }}
            onMouseLeave={(e) => {
                Object.assign(e.target.style, defaultStyle);
            }}
        >
            {children}
        </button>
    );
};

export default BackButton;

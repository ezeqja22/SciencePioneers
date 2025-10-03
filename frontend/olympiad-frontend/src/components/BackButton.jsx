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
        // Always use the fallback path to ensure consistent navigation
        // This prevents issues with browser history getting confused after navigation
        navigate(fallbackPath);
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

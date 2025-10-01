import React from "react";
import { colors, spacing, borderRadius, shadows } from "../designSystem";

function Card({ 
    children, 
    padding = "lg", 
    style = {},
    hover = false,
    ...props 
}) {
    const getPadding = () => {
        switch (padding) {
            case "sm": return spacing.md;
            case "md": return spacing.lg;
            case "lg": return spacing.xl;
            case "xl": return spacing.xxl;
            default: return spacing.lg;
        }
    };

    const cardStyles = {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.md,
        padding: getPadding(),
        border: `1px solid ${colors.gray[200]}`,
        transition: hover ? "all 0.2s ease" : "none",
        ...style
    };

    const hoverStyles = hover ? {
        "&:hover": {
            boxShadow: shadows.lg,
            transform: "translateY(-2px)"
        }
    } : {};

    return (
        <div
            style={cardStyles}
            onMouseEnter={hover ? (e) => {
                e.target.style.boxShadow = shadows.lg;
                e.target.style.transform = "translateY(-2px)";
            } : undefined}
            onMouseLeave={hover ? (e) => {
                e.target.style.boxShadow = shadows.md;
                e.target.style.transform = "translateY(0)";
            } : undefined}
            {...props}
        >
            {children}
        </div>
    );
}

export default Card;

import React from "react";
import { colors, spacing, typography, borderRadius, shadows } from "../designSystem";

function Button({ 
    children, 
    variant = "primary", 
    size = "md", 
    onClick, 
    disabled = false,
    type = "button",
    style = {},
    ...props 
}) {
    const getVariantStyles = () => {
        switch (variant) {
            case "primary":
                return {
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: `1px solid ${colors.primary}`,
                    "&:hover": {
                        backgroundColor: colors.secondary
                    }
                };
            case "secondary":
                return {
                    backgroundColor: colors.secondary,
                    color: colors.white,
                    border: `1px solid ${colors.secondary}`,
                    "&:hover": {
                        backgroundColor: colors.primary
                    }
                };
            case "accent":
                return {
                    backgroundColor: colors.accent,
                    color: colors.white,
                    border: `1px solid ${colors.accent}`,
                    "&:hover": {
                        backgroundColor: "#218838"
                    }
                };
            case "danger":
                return {
                    backgroundColor: colors.danger,
                    color: colors.white,
                    border: `1px solid ${colors.danger}`,
                    "&:hover": {
                        backgroundColor: "#c82333"
                    }
                };
            case "outline":
                return {
                    backgroundColor: "transparent",
                    color: colors.primary,
                    border: `1px solid ${colors.primary}`,
                    "&:hover": {
                        backgroundColor: colors.primary,
                        color: colors.white
                    }
                };
            case "ghost":
                return {
                    backgroundColor: "transparent",
                    color: colors.primary,
                    border: "none",
                    "&:hover": {
                        backgroundColor: colors.gray[100]
                    }
                };
            default:
                return {
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: `1px solid ${colors.primary}`
                };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case "sm":
                return {
                    padding: `${spacing.sm} ${spacing.md}`,
                    fontSize: typography.fontSize.sm
                };
            case "md":
                return {
                    padding: `${spacing.md} ${spacing.lg}`,
                    fontSize: typography.fontSize.base
                };
            case "lg":
                return {
                    padding: `${spacing.lg} ${spacing.xl}`,
                    fontSize: typography.fontSize.lg
                };
            default:
                return {
                    padding: `${spacing.md} ${spacing.lg}`,
                    fontSize: typography.fontSize.base
                };
        }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    const buttonStyles = {
        ...variantStyles,
        ...sizeStyles,
        borderRadius: borderRadius.md,
        fontWeight: typography.fontWeight.medium,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease",
        boxShadow: shadows.sm,
        fontFamily: typography.fontFamily,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        textDecoration: "none",
        ...style
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={buttonStyles}
            onMouseEnter={(e) => {
                if (!disabled) {
                    if (variant === "primary") e.target.style.backgroundColor = colors.secondary;
                    if (variant === "secondary") e.target.style.backgroundColor = colors.primary;
                    if (variant === "accent") e.target.style.backgroundColor = "#218838";
                    if (variant === "danger") e.target.style.backgroundColor = "#c82333";
                    if (variant === "outline") {
                        e.target.style.backgroundColor = colors.primary;
                        e.target.style.color = colors.white;
                    }
                    if (variant === "ghost") e.target.style.backgroundColor = colors.gray[100];
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    e.target.style.backgroundColor = variantStyles.backgroundColor;
                    e.target.style.color = variantStyles.color;
                }
            }}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;

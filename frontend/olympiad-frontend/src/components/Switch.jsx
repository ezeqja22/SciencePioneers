import React from "react";
import { colors, spacing, typography, borderRadius } from "../designSystem";

function Switch({ checked, onChange, disabled = false, size = "md" }) {
    const sizes = {
        sm: {
            width: "36px",
            height: "20px",
            thumbSize: "16px",
            thumbOffset: "2px"
        },
        md: {
            width: "44px", 
            height: "24px",
            thumbSize: "20px",
            thumbOffset: "2px"
        },
        lg: {
            width: "52px",
            height: "28px", 
            thumbSize: "24px",
            thumbOffset: "2px"
        }
    };

    const currentSize = sizes[size];

    return (
        <label style={{
            position: "relative",
            display: "inline-block",
            width: currentSize.width,
            height: currentSize.height,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1
        }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                    position: "absolute"
                }}
            />
            <span style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: checked ? colors.primary : colors.gray[300],
                borderRadius: "9999px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: checked 
                    ? `0 0 0 2px ${colors.primary}20` 
                    : "inset 0 2px 4px rgba(0,0,0,0.1)"
            }}>
                <span style={{
                    position: "absolute",
                    top: currentSize.thumbOffset,
                    left: checked 
                        ? `calc(100% - ${currentSize.thumbSize} - ${currentSize.thumbOffset})` 
                        : currentSize.thumbOffset,
                    width: currentSize.thumbSize,
                    height: currentSize.thumbSize,
                    backgroundColor: colors.white,
                    borderRadius: "50%",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)",
                    transform: checked ? "scale(1.1)" : "scale(1)"
                }} />
            </span>
        </label>
    );
}

export default Switch;

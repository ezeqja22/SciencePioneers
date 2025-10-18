// src/components/AnimatedLoader.jsx
import React, { useEffect, useState } from "react";
import { colors, spacing, typography } from "../designSystem";

const AnimatedLoader = ({ 
    type = "generic", 
    message = "Loading...", 
    size = "large" 
}) => {
    const [animationStep, setAnimationStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationStep(prev => (prev + 1) % 4);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const getAnimation = () => {
        const logoSize = size === "large" ? "80px" : "40px";
        
        return (
            <div style={{ 
                marginBottom: spacing.lg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: logoSize
            }}>
                <img 
                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760809847/Olimpiada_Logo_green_1_n9agy9.png"
                    alt="Loading"
                    style={{
                        height: logoSize,
                        width: logoSize,
                        objectFit: "contain",
                        display: "inline-block",
                        backgroundColor: "transparent",
                        border: "none"
                    }}
                    onError={(e) => {
                        console.error("Logo failed to load:", e);
                        console.error("Error details:", e.target.src);
                        // Show fallback text
                        e.target.style.display = "none";
                        const fallback = document.createElement('div');
                        fallback.textContent = 'π';
                        fallback.style.cssText = `
                            font-size: ${logoSize};
                            color: #2d7a5f;
                            font-weight: bold;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: ${logoSize};
                            width: ${logoSize};
                            background-color: yellow;
                            border: 2px solid orange;
                        `;
                        e.target.parentNode.appendChild(fallback);
                    }}
                    onLoad={(e) => {
                        console.log("Logo loaded successfully");
                        console.log("Image dimensions:", e.target.naturalWidth, "x", e.target.naturalHeight);
                    }}
                />
            </div>
        );
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.xl,
            textAlign: "center",
            minHeight: size === "large" ? "300px" : "150px"
        }}>
            {getAnimation()}
            
            <h2 style={{
                fontSize: size === "large" ? typography.fontSize["2xl"] : typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary,
                margin: 0,
                marginBottom: spacing.sm
            }}>
                {message}
            </h2>
            
            <div style={{
                width: "60px",
                height: "4px",
                backgroundColor: colors.gray[200],
                borderRadius: "2px",
                overflow: "hidden",
                position: "relative"
            }}>
                <div style={{
                    width: "30px",
                    height: "100%",
                    backgroundColor: colors.primary,
                    borderRadius: "2px",
                    transform: `translateX(${[-30, 0, 30, 60][animationStep]}px)`,
                    transition: "transform 0.5s ease"
                }} />
            </div>
        </div>
    );
};

export default AnimatedLoader;

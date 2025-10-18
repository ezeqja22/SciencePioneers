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
                justifyContent: "center"
            }}>
                <img 
                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760786648/Logo_Olimpiada_csdp71.svg"
                    alt="Loading"
                    style={{
                        height: logoSize,
                        width: logoSize,
                        objectFit: "contain",
                        display: "inline-block",
                        transform: `scale(${1 + (animationStep % 2) * 0.1})`,
                        opacity: 1 - (animationStep % 2) * 0.2,
                        transition: "all 0.5s ease"
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

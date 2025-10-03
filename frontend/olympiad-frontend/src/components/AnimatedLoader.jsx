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
        const fontSize = size === "large" ? "4rem" : "2rem";
        
        switch (type) {
            case "problems":
                return (
                    <div style={{ 
                        fontSize,
                        marginBottom: spacing.lg,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2em"
                    }}>
                        <span style={{ 
                            display: "inline-block",
                            transform: `translateY(${animationStep % 2 === 0 ? '0px' : '-10px'})`,
                            transition: "transform 0.5s ease"
                        }}>📚</span>
                        <span style={{ 
                            display: "inline-block",
                            transform: `translateX(${['0px', '5px', '0px', '-5px'][animationStep]}) rotate(${[0, -5, 0, 5][animationStep]}deg)`,
                            transition: "transform 0.5s ease"
                        }}>✏️</span>
                    </div>
                );
            
            case "profile":
                return (
                    <div style={{ 
                        fontSize,
                        marginBottom: spacing.lg,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.1em"
                    }}>
                        <span style={{ 
                            display: "inline-block",
                            transform: `scale(${1 + (animationStep % 2) * 0.1})`,
                            opacity: 1 - (animationStep % 2) * 0.2,
                            transition: "all 0.5s ease"
                        }}>👤</span>
                        <span style={{ 
                            display: "inline-block",
                            transform: `translateX(${animationStep % 2 === 0 ? '0px' : '10px'}) scale(${1 + (animationStep % 2) * 0.2})`,
                            transition: "transform 0.5s ease"
                        }}>🔍</span>
                    </div>
                );
            
            case "verify":
                return (
                    <div style={{ 
                        fontSize,
                        marginBottom: spacing.lg,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.1em"
                    }}>
                        <span style={{ 
                            display: "inline-block",
                            transform: `translateX(${[-2, 2, -1, 1][animationStep]}px)`,
                            transition: "transform 0.2s ease"
                        }}>🔐</span>
                        <span style={{ 
                            display: "inline-block",
                            transform: `translateX(${animationStep % 2 === 0 ? '0px' : '-8px'}) rotate(${animationStep % 2 === 0 ? '0deg' : '-15deg'})`,
                            transition: "transform 0.5s ease"
                        }}>🔑</span>
                    </div>
                );
            
            case "upload":
                return (
                    <div style={{ 
                        fontSize,
                        marginBottom: spacing.lg,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.1em"
                    }}>
                        <span style={{ 
                            display: "inline-block",
                            transform: `translateY(${animationStep % 2 === 0 ? '0px' : '-15px'})`,
                            transition: "transform 0.5s ease"
                        }}>📤</span>
                        <span style={{ 
                            display: "inline-block",
                            transform: `translateY(${animationStep % 2 === 0 ? '0px' : '-20px'}) scale(${1 + (animationStep % 2) * 0.3})`,
                            transition: "transform 0.5s ease"
                        }}>⬆️</span>
                    </div>
                );
            
            case "subject":
                return (
                    <div style={{ 
                        fontSize,
                        marginBottom: spacing.lg,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2em"
                    }}>
                        <span style={{ 
                            display: "inline-block",
                            transform: `rotate(${animationStep * 90}deg)`,
                            transition: "transform 0.5s ease"
                        }}>🔬</span>
                        <span style={{ 
                            display: "inline-block",
                            transform: `rotateY(${animationStep % 2 === 0 ? '0deg' : '180deg'})`,
                            transition: "transform 0.5s ease"
                        }}>📖</span>
                    </div>
                );
            
            default:
                return (
                    <div style={{ 
                        fontSize,
                        marginBottom: spacing.lg,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2em"
                    }}>
                        <span style={{ 
                            display: "inline-block",
                            transform: `rotate(${animationStep * 90}deg)`,
                            transition: "transform 0.5s ease"
                        }}>⏳</span>
                        <span style={{ 
                            display: "inline-block",
                            transform: `scale(${1 + (animationStep % 2) * 0.5}) rotate(${animationStep * 45}deg)`,
                            opacity: 1 - (animationStep % 2) * 0.4,
                            transition: "all 0.5s ease"
                        }}>💫</span>
                    </div>
                );
        }
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

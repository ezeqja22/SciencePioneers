import React from "react";
import Header from "./Header";
import { colors, spacing } from "../designSystem";

function Layout({ children, showHomeButton = false, maxWidth = "1200px" }) {
    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: colors.gray[50],
            display: "flex",
            flexDirection: "column"
        }}>
            <Header showHomeButton={showHomeButton} />
            <main style={{
                flex: 1,
                padding: spacing.xl,
                maxWidth: maxWidth,
                margin: "0 auto",
                width: "100%",
                boxSizing: "border-box"
            }}>
                {children}
            </main>
        </div>
    );
}

export default Layout;

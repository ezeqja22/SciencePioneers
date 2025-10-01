import React from "react";
import { Link } from "react-router-dom";

function Forums() {
    return (
        <div style={{ 
            minHeight: "100vh", 
            backgroundColor: "#f8f9fa",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: "#1a4d3a",
                color: "white",
                padding: "1rem 2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}>
                <Link to="/" style={{ textDecoration: "none", color: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "40px",
                            height: "40px",
                            backgroundColor: "#2d7a5f",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            fontWeight: "bold"
                        }}>
                            SP
                        </div>
                        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
                            SciencePioneers
                        </h1>
                    </div>
                </Link>
            </header>

            {/* Main Content */}
            <main style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                    <h1 style={{ 
                        fontSize: "3rem", 
                        fontWeight: "700", 
                        marginBottom: "1.5rem",
                        color: "#1a4d3a"
                    }}>
                        Forums
                    </h1>
                    <p style={{ 
                        fontSize: "1.25rem", 
                        marginBottom: "2rem", 
                        color: "#666",
                        lineHeight: "1.6"
                    }}>
                        This is the Forums page. Community discussions and forums will be implemented here in the future.
                    </p>
                    <Link to="/">
                        <button style={{
                            backgroundColor: "#1a4d3a",
                            color: "white",
                            border: "none",
                            padding: "12px 24px",
                            borderRadius: "8px",
                            fontSize: "16px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}>
                            Back to Homepage
                        </button>
                    </Link>
                </div>
            </main>
        </div>
    );
}

export default Forums;

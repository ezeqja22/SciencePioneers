import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './components/Layout';
import Card from './components/Card';
import Button from './components/Button';
import BackButton from './components/BackButton';
import AnimatedLoader from './components/AnimatedLoader';
import { colors, spacing, typography, borderRadius, shadows } from './designSystem';
import { getUserInitial, getDisplayName } from './utils';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render math content
const renderMathContent = (text) => {
    if (!text) return '';
    
    const latexPattern = /\\[a-zA-Z]+|\\[^a-zA-Z]|\$\$|\\\(|\\\)|\\\[|\\\]|\^|\_|\{|\}|\[|\]|∫|∑|∏|√|α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω|∞|±|∓|×|÷|≤|≥|≠|≈|≡|∈|∉|⊂|⊃|∪|∩|∅|∇|∂|∆|Ω|Φ|Ψ|Λ|Σ|Π|Θ|Ξ|Γ|Δ/;
    if (!latexPattern.test(text)) {
        return text;
    }
    
    try {
        return <InlineMath math={text} />;
    } catch (error) {
        return text;
    }
};

const ForumInfo = () => {
    const { forumId } = useParams();
    const navigate = useNavigate();
    const [forum, setForum] = useState(null);
    const [problems, setProblems] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('members'); // 'members', 'problems'

    useEffect(() => {
        fetchCurrentUser();
        fetchForum();
        fetchProblems();
        fetchMembers();
    }, [forumId]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            
            const response = await axios.get("http://127.0.0.1:8000/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    };

    const fetchForum = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setError("Please log in to view forum");
                return;
            }

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setForum(response.data);
        } catch (error) {
            console.error("Error fetching forum:", error);
            if (error.response?.status === 403) {
                setError("Access denied to this forum");
            } else if (error.response?.status === 404) {
                setError("Forum not found");
            } else {
                setError(`Failed to load forum: ${error.response?.data?.detail || error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchProblems = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}/problems`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProblems(response.data);
        } catch (error) {
            console.error("Error fetching problems:", error);
        }
    };

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`http://127.0.0.1:8000/auth/forums/${forumId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    };

    const handleLeaveForum = async () => {
        if (!window.confirm("Are you sure you want to leave this forum?")) return;
        
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`http://127.0.0.1:8000/auth/forums/${forumId}/leave`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            navigate('/forums');
        } catch (error) {
            console.error("Error leaving forum:", error);
            alert("Failed to leave forum");
        }
    };

    if (loading) {
        return (
            <Layout showHomeButton={true}>
                <AnimatedLoader type="profile" message="Loading forum info..." size="large" />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout showHomeButton={true}>
                <div style={{ textAlign: "center", padding: spacing.xl }}>
                    <h2 style={{ color: colors.error }}>{error}</h2>
                    <Button onClick={() => navigate('/forums')} style={{ marginTop: spacing.md }}>
                        Back to Forums
                    </Button>
                </div>
            </Layout>
        );
    }

    if (!forum) return null;

    return (
        <Layout showHomeButton={true}>
            <div style={{ maxWidth: "1000px", margin: "0 auto", padding: spacing.lg }}>
                <BackButton fallbackPath={`/forum/${forumId}`} />
                
                {/* Forum Header */}
                <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: spacing.xl,
                    padding: spacing.lg,
                    backgroundColor: colors.light,
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.gray[200]}`
                }}>
                    <div>
                        <h1 style={{ 
                            fontSize: "2rem", 
                            fontWeight: "700", 
                            color: colors.primary,
                            margin: "0 0 8px 0"
                        }}>
                            {forum.title}
                        </h1>
                        <p style={{ 
                            color: colors.gray[600], 
                            margin: "0 0 12px 0",
                            fontSize: "1.1rem"
                        }}>
                            {forum.description}
                        </p>
                        <div style={{ display: "flex", gap: spacing.md, alignItems: "center" }}>
                            <span style={{ color: colors.gray[500] }}>
                                {forum.member_count}/{forum.max_members} members
                            </span>
                            <span style={{ 
                                color: forum.is_private ? colors.warning : colors.success,
                                fontWeight: "600"
                            }}>
                                {forum.is_private ? "Private" : "Public"}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: spacing.sm }}>
                        <Button 
                            onClick={() => navigate(`/forum/${forumId}`)}
                            style={{ backgroundColor: colors.primary }}
                        >
                            Open Chat
                        </Button>
                        <Button 
                            onClick={handleLeaveForum}
                            style={{ backgroundColor: colors.error }}
                        >
                            Leave Forum
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ 
                    display: "flex", 
                    borderBottom: `1px solid ${colors.gray[300]}`,
                    marginBottom: spacing.lg
                }}>
                    <button
                        onClick={() => setActiveTab('members')}
                        style={{
                            padding: "12px 24px",
                            border: "none",
                            backgroundColor: activeTab === 'members' ? colors.primary : "transparent",
                            color: activeTab === 'members' ? colors.white : colors.gray[600],
                            cursor: "pointer",
                            borderBottom: activeTab === 'members' ? `3px solid ${colors.primary}` : "3px solid transparent",
                            transition: "all 0.2s ease"
                        }}
                    >
                        Members ({members.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('problems')}
                        style={{
                            padding: "12px 24px",
                            border: "none",
                            backgroundColor: activeTab === 'problems' ? colors.primary : "transparent",
                            color: activeTab === 'problems' ? colors.white : colors.gray[600],
                            cursor: "pointer",
                            borderBottom: activeTab === 'problems' ? `3px solid ${colors.primary}` : "3px solid transparent",
                            transition: "all 0.2s ease"
                        }}
                    >
                        Problems ({problems.length})
                    </button>
                </div>

                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div>
                        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                            {members.map((member) => (
                                <Card key={member.id} style={{ padding: spacing.md }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                                        <div style={{
                                            width: "50px",
                                            height: "50px",
                                            borderRadius: "50%",
                                            backgroundColor: colors.primary,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: colors.white,
                                            fontWeight: "bold",
                                            fontSize: "18px"
                                        }}>
                                            {getUserInitial(member.user?.username || '?')}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: "0 0 4px 0", color: colors.gray[800] }}>
                                                {getDisplayName(member.user?.username || 'Unknown')}
                                            </h4>
                                            <span style={{ 
                                                color: colors.gray[500], 
                                                fontSize: "0.9rem" 
                                            }}>
                                                Joined {new Date(member.joined_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span style={{
                                            backgroundColor: member.role === 'creator' ? colors.primary : 
                                                          member.role === 'moderator' ? colors.warning : colors.gray[400],
                                            color: colors.white,
                                            padding: "4px 12px",
                                            borderRadius: borderRadius.sm,
                                            fontSize: "0.8rem",
                                            fontWeight: "600",
                                            textTransform: "capitalize"
                                        }}>
                                            {member.role}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Problems Tab */}
                {activeTab === 'problems' && (
                    <div>
                        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                            {problems.map((problem) => (
                                <Card 
                                    key={problem.id}
                                    hover={true}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => navigate(`/forum-problem/${problem.id}?from=forum&forumId=${forumId}`)}
                                >
                                    <h4 style={{ margin: "0 0 8px 0", color: colors.gray[800] }}>
                                        {renderMathContent(problem.title)}
                                    </h4>
                                    <p style={{ 
                                        margin: "0 0 12px 0", 
                                        color: colors.gray[600],
                                        lineHeight: "1.5"
                                    }}>
                                        {renderMathContent(problem.description.substring(0, 300))}
                                        {problem.description.length > 300 && "..."}
                                    </p>
                                    <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                                        {problem.subject && (
                                            <span style={{
                                                backgroundColor: colors.light,
                                                color: colors.primary,
                                                padding: "4px 8px",
                                                borderRadius: borderRadius.sm,
                                                fontSize: "0.8rem",
                                                fontWeight: "600"
                                            }}>
                                                {problem.subject}
                                            </span>
                                        )}
                                        <span style={{ color: colors.gray[500], fontSize: "0.8rem" }}>
                                            Posted {new Date(problem.posted_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ForumInfo;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './components/Layout';
import Card from './components/Card';
import Button from './components/Button';
import { colors, spacing, typography, borderRadius } from './designSystem';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render math content
const renderMathContent = (text) => {
    if (!text) return '';
    
    // Check if text contains LaTeX patterns or math symbols
    const latexPattern = /\\[a-zA-Z]+|\\[^a-zA-Z]|\$\$|\\\(|\\\)|\\\[|\\\]|\^|\_|\{|\}|\[|\]|∫|∑|∏|√|α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω|∞|±|∓|×|÷|≤|≥|≠|≈|≡|∈|∉|⊂|⊃|∪|∩|∅|∇|∂|∆|Ω|Φ|Ψ|Λ|Σ|Π|Θ|Ξ|Γ|Δ/;
    if (!latexPattern.test(text)) {
        return text;
    }
    
    try {
        // If text contains LaTeX, render it with InlineMath
        return <InlineMath math={text} />;
    } catch (error) {
        // If KaTeX fails, return plain text
        return text;
    }
};

const PublicUserProfile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        fetchUserProfile();
    }, [username]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://127.0.0.1:8000/auth/user/${username}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserProfile(response.data);
            setFollowing(response.data.is_following);
        } catch (err) {
            setError('User not found');
            console.error('Error fetching user profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!userProfile) return;
        
        try {
            setFollowLoading(true);
            const token = localStorage.getItem('token');
            
            if (following) {
                // Unfollow
                await axios.delete(`http://127.0.0.1:8000/auth/follow/${userProfile.user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFollowing(false);
                setUserProfile(prev => ({
                    ...prev,
                    follower_count: prev.follower_count - 1
                }));
            } else {
                // Follow
                await axios.post(`http://127.0.0.1:8000/auth/follow/${userProfile.user.id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFollowing(true);
                setUserProfile(prev => ({
                    ...prev,
                    follower_count: prev.follower_count + 1
                }));
            }
        } catch (err) {
            console.error('Error following/unfollowing:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate("/homepage", { replace: true });
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Loading user profile...</h2>
            </div>
        );
    }

    if (error || !userProfile) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>User not found</h2>
                <button onClick={() => navigate('/feed')} style={{ 
                    padding: '10px 20px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}>
                    Back to Feed
                </button>
            </div>
        );
    }

    return (
        <Layout showHomeButton={true}>
            <div style={{ marginBottom: spacing.xl }}>
                <h1 style={{
                    fontSize: typography.fontSize["3xl"],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.primary,
                    marginBottom: spacing.lg,
                    textAlign: "center"
                }}>
                    User Profile
                </h1>
            </div>

            {/* User Info */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '10px'
            }}>
                <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '50%', 
                    backgroundColor: '#007bff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginRight: '20px',
                    backgroundImage: userProfile.user.profile_picture ? 
                        `url(http://127.0.0.1:8000/auth/serve-image/${userProfile.user.profile_picture.split('/').pop()})` : 
                        'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}>
                    {!userProfile.user.profile_picture && 
                        (userProfile.user.username ? userProfile.user.username[0].toUpperCase() : '?')
                    }
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
                        {userProfile.user.username}
                    </h2>
                    {userProfile.user.bio && (
                        <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                            {userProfile.user.bio}
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '20px', color: '#666' }}>
                        <span><strong>{userProfile.follower_count}</strong> followers</span>
                        <span><strong>{userProfile.following_count}</strong> following</span>
                        <span><strong>{userProfile.problems.length}</strong> problems</span>
                    </div>
                </div>
                <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: following ? '#28a745' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: followLoading ? 'not-allowed' : 'pointer',
                        opacity: followLoading ? 0.6 : 1
                    }}
                >
                    {followLoading ? 'Loading...' : (following ? '✓ Following' : '+ Follow')}
                </button>
            </div>

            {/* Problems */}
            <div>
                <h3 style={{ marginBottom: '20px', color: '#333' }}>
                    Problems by {userProfile.user.username}
                </h3>
                {userProfile.problems.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                        This user hasn't posted any problems yet.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {userProfile.problems.map(problem => (
                            <div key={problem.id} style={{
                                border: '1px solid #ddd',
                                borderRadius: '10px',
                                padding: '20px',
                                backgroundColor: 'white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <h4 style={{ margin: 0, color: '#333' }}>{renderMathContent(problem.title)}</h4>
                                    <span style={{ color: '#666', fontSize: '14px' }}>
                                        {new Date(problem.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p style={{ margin: '0 0 15px 0', color: '#555' }}>
                                    {renderMathContent(problem.description)}
                                </p>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                    {problem.tags && problem.tags.split(',').map((tag, index) => (
                                        <span key={index} style={{
                                            backgroundColor: '#e9ecef',
                                            color: '#495057',
                                            padding: '4px 8px',
                                            borderRadius: '15px',
                                            fontSize: '12px'
                                        }}>
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '15px', color: '#666' }}>
                                        <span>👍 0</span>
                                        <span>👎 0</span>
                                        <span>💬 {problem.comment_count}</span>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/problem/${problem.id}`)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        View Problem
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PublicUserProfile;

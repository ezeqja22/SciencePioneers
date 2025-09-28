import React, { useRef,useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function UserProfile() {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("problems"); // problems, comments, bookmarks
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [editFormData, setEditFormData] = useState({
        bio: "",
        profile_picture: ""
    });

    useEffect(() => {
        // Validate authentication before fetching data
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login", { replace: true });
            return;
        }
        
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("No token found");
                setLoading(false);
                return;
            }
            
            console.log("Fetching user profile with token:", token.substring(0, 20) + "...");
            const response = await axios.get("http://127.0.0.1:8000/auth/user/profile", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log("Profile data received:", response.data);
            setProfileData(response.data);
        } catch (error) {
            console.error("Error fetching user profile:", error);
            console.error("Error response:", error.response?.data);
            console.error("Error status:", error.response?.status);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProfile = () => {
        setEditFormData({
            bio: profileData?.user?.bio || "",
            profile_picture: profileData?.user?.profile_picture || ""
        });
        setIsEditingProfile(true);
    };

    const handleSaveProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.put("http://127.0.0.1:8000/auth/user/profile", editFormData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Update the profile data with the new information
            setProfileData(prev => ({
                ...prev,
                user: {
                    ...prev.user,
                    bio: editFormData.bio,
                    profile_picture: editFormData.profile_picture
                }
            }));
            
            setIsEditingProfile(false);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error updating profile. Please try again.");
        }
    };

    const handleCancelEdit = () => {
        setIsEditingProfile(false);
        setEditFormData({
            bio: "",
            profile_picture: ""
        });
    };

    const handleBookmark = async (problemId, isBookmarked) => {
        try {
            const token = localStorage.getItem("token");
            if (isBookmarked) {
                await axios.delete(`http://127.0.0.1:8000/auth/problems/${problemId}/bookmark`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            } else {
                await axios.post(`http://127.0.0.1:8000/auth/problems/${problemId}/bookmark`, {}, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }
            // Refresh profile data
            fetchUserProfile();
        } catch (error) {
            console.error("Error toggling bookmark:", error);
        }
    };

    const handleFileUpload = async (file) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const token = localStorage.getItem("token");
            const response = await axios.post(
                "http://127.0.0.1:8000/auth/user/profile-picture",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            // Update profile data with new picture
            setProfileData(prev => ({
                ...prev,
                user: {
                    ...prev.user,
                    profile_picture: response.data.file_path
                }
            }));
            
            alert("Profile picture updated successfully!");
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Error uploading file. Please try again.");
        } finally {
            setUploading(false);
        }
    };
    
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            handleFileUpload(file);
        }
    };

    const handleLogout = () => {
        // Clear all user data
        localStorage.removeItem("token");
        
        // Clear any cached data
        setProfileData(null);
        setActiveTab("problems");
        setIsEditingProfile(false);
        setEditFormData({ bio: "", profile_picture: "" });
        setSelectedFile(null);
        
        // Replace current history entry to prevent back navigation
        navigate("/", { replace: true });
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", marginTop: "50px" }}>
                <h2>Loading profile...</h2>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div style={{ textAlign: "center", marginTop: "50px" }}>
                <h2>Error loading profile</h2>
            </div>
        );
    }

    const { user, problems, comments, bookmarks } = profileData;

    return (
        <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
            {/* Navigation Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <h2>My Profile</h2>
                <div style={{ display: "flex", gap: "10px" }}>
                    <Link to="/feed">
                        <button style={{ 
                            padding: "10px 20px", 
                            backgroundColor: "#28a745", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "5px",
                            cursor: "pointer"
                        }}>
                            Back to Feed
                        </button>
                    </Link>
                    <button 
                        onClick={handleLogout}
                        style={{ 
                            padding: "10px 20px", 
                            backgroundColor: "#dc3545", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "5px",
                            cursor: "pointer"
                        }}>
                        Logout
                    </button>
                </div>
            </div>
            
            {/* Hidden file input */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                ref={fileInputRef}
                style={{ display: 'none' }}
            />
            
            {/* User Header */}
            <div style={{
                backgroundColor: "#f8f9fa",
                padding: "30px",
                borderRadius: "10px",
                marginBottom: "30px",
                border: "1px solid #e9ecef"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    {/* Profile Picture Placeholder */}
                    <div style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        backgroundColor: "#007bff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "32px",
                        fontWeight: "bold",
                        backgroundImage: user.profile_picture ? `url(http://127.0.0.1:8000/auth/serve-image/${user.profile_picture.split('/').pop()})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                    }}>
                        {!user.profile_picture && user.username.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Change Profile Picture Button */}
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={uploading}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: uploading ? "#ccc" : "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: uploading ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            marginTop: "10px"
                        }}
                    >
                        {uploading ? "Uploading..." : "📷 Change Profile Picture"}
                    </button>
                    
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <h1 style={{ margin: "0 0 10px 0", color: "#333" }}>{user.username}</h1>
                            <button
                                onClick={handleEditProfile}
                                style={{
                                    padding: "5px 15px",
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "12px"
                                }}
                            >
                                Edit Profile
                            </button>
                        </div>
                        <p style={{ margin: "0 0 10px 0", color: "#666", fontSize: "14px" }}>{user.email}</p>
                        {user.bio && (
                            <p style={{ margin: "0", color: "#555", fontSize: "16px" }}>{user.bio}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Form */}
            {isEditingProfile && (
                <div style={{
                    backgroundColor: "#f8f9fa",
                    padding: "30px",
                    borderRadius: "10px",
                    marginBottom: "30px",
                    border: "1px solid #e9ecef"
                }}>
                    <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Edit Profile</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                                Bio:
                            </label>
                            <textarea
                                value={editFormData.bio}
                                onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                                placeholder="Tell us about yourself..."
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    border: "1px solid #ddd",
                                    borderRadius: "5px",
                                    fontSize: "14px",
                                    minHeight: "80px",
                                    resize: "vertical"
                                }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                                Profile Picture URL (Coming Soon):
                            </label>
                            <input
                                type="text"
                                value={editFormData.profile_picture}
                                onChange={(e) => setEditFormData({...editFormData, profile_picture: e.target.value})}
                                placeholder="Profile picture URL (feature coming soon)"
                                disabled
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    border: "1px solid #ddd",
                                    borderRadius: "5px",
                                    fontSize: "14px",
                                    backgroundColor: "#f5f5f5",
                                    color: "#999"
                                }}
                            />
                            <p style={{ fontSize: "12px", color: "#666", margin: "5px 0 0 0" }}>
                                Profile picture upload will be available in a future update
                            </p>
                        </div>
                        
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={handleSaveProfile}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "14px"
                                }}
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "14px"
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div style={{
                display: "flex",
                gap: "20px",
                marginBottom: "30px",
                justifyContent: "center"
            }}>
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "8px", minWidth: "100px" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1976d2" }}>{problems.length}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Problems</div>
                </div>
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#f3e5f5", borderRadius: "8px", minWidth: "100px" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7b1fa2" }}>{comments.length}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Comments</div>
                </div>
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#fff3e0", borderRadius: "8px", minWidth: "100px" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f57c00" }}>{bookmarks.length}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Bookmarks</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: "flex",
                borderBottom: "2px solid #e9ecef",
                marginBottom: "20px"
            }}>
                <button
                    onClick={() => setActiveTab("problems")}
                    style={{
                        padding: "12px 24px",
                        border: "none",
                        backgroundColor: activeTab === "problems" ? "#007bff" : "transparent",
                        color: activeTab === "problems" ? "white" : "#666",
                        cursor: "pointer",
                        borderRadius: "8px 8px 0 0",
                        fontWeight: "bold"
                    }}
                >
                    My Problems ({problems.length})
                </button>
                <button
                    onClick={() => setActiveTab("comments")}
                    style={{
                        padding: "12px 24px",
                        border: "none",
                        backgroundColor: activeTab === "comments" ? "#007bff" : "transparent",
                        color: activeTab === "comments" ? "white" : "#666",
                        cursor: "pointer",
                        borderRadius: "8px 8px 0 0",
                        fontWeight: "bold"
                    }}
                >
                    My Comments ({comments.length})
                </button>
                <button
                    onClick={() => setActiveTab("bookmarks")}
                    style={{
                        padding: "12px 24px",
                        border: "none",
                        backgroundColor: activeTab === "bookmarks" ? "#007bff" : "transparent",
                        color: activeTab === "bookmarks" ? "white" : "#666",
                        cursor: "pointer",
                        borderRadius: "8px 8px 0 0",
                        fontWeight: "bold"
                    }}
                >
                    My Bookmarks ({bookmarks.length})
                </button>
            </div>

            {/* Content based on active tab */}
            <div>
                {activeTab === "problems" && (
                    <div>
                        <h3 style={{ marginBottom: "20px", color: "#333" }}>My Problems</h3>
                        {problems.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                                <p>You haven't created any problems yet.</p>
                                <Link to="/create-problem">
                                    <button style={{
                                        padding: "10px 20px",
                                        backgroundColor: "#007bff",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer"
                                    }}>
                                        Create Your First Problem
                                    </button>
                                </Link>
                            </div>
                        ) : (
                            <div>
                                {problems.map((problem) => (
                                    <div key={problem.id} style={{
                                        border: "1px solid #ddd",
                                        borderRadius: "8px",
                                        padding: "20px",
                                        marginBottom: "15px",
                                        backgroundColor: "#f9f9f9"
                                    }}>
                                        <Link to={`/problem/${problem.id}`} style={{ textDecoration: "none" }}>
                                            <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>{problem.title}</h4>
                                        </Link>
                                        <p style={{ color: "#666", margin: "0 0 15px 0" }}>{problem.description.substring(0, 150)}...</p>
                                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                            <span style={{
                                                backgroundColor: "#e3f2fd",
                                                color: "#1976d2",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px"
                                            }}>
                                                {problem.subject}
                                            </span>
                                            <span style={{
                                                backgroundColor: "#fff3e0",
                                                color: "#f57c00",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px"
                                            }}>
                                                {problem.level}
                                            </span>
                                            <span style={{ fontSize: "12px", color: "#666" }}>
                                                {new Date(problem.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "comments" && (
                    <div>
                        <h3 style={{ marginBottom: "20px", color: "#333" }}>My Comments</h3>
                        {comments.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                                <p>You haven't made any comments yet.</p>
                            </div>
                        ) : (
                            <div>
                                {comments.map((comment) => (
                                    <div key={comment.id} style={{
                                        border: "1px solid #ddd",
                                        borderRadius: "8px",
                                        padding: "15px",
                                        marginBottom: "15px",
                                        backgroundColor: "#f9f9f9"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                            <Link to={`/problem/${comment.problem.id}`} style={{ textDecoration: "none" }}>
                                                <h5 style={{ margin: "0", color: "#007bff" }}>{comment.problem.title}</h5>
                                            </Link>
                                            <span style={{ fontSize: "12px", color: "#666" }}>
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p style={{ color: "#333", margin: "0" }}>{comment.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "bookmarks" && (
                    <div>
                        <h3 style={{ marginBottom: "20px", color: "#333" }}>My Bookmarks</h3>
                        {bookmarks.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                                <p>You haven't bookmarked any problems yet.</p>
                                <p>Click the bookmark button on problems to save them here!</p>
                            </div>
                        ) : (
                            <div>
                                {bookmarks.map((bookmark) => (
                                    <div key={bookmark.id} style={{
                                        border: "1px solid #ddd",
                                        borderRadius: "8px",
                                        padding: "20px",
                                        marginBottom: "15px",
                                        backgroundColor: "#f9f9f9"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                            <Link to={`/problem/${bookmark.problem.id}`} style={{ textDecoration: "none" }}>
                                                <h4 style={{ margin: "0", color: "#333" }}>{bookmark.problem.title}</h4>
                                            </Link>
                                            <button
                                                onClick={() => handleBookmark(bookmark.problem.id, true)}
                                                style={{
                                                    padding: "5px 10px",
                                                    backgroundColor: "#dc3545",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "12px"
                                                }}
                                            >
                                                Remove Bookmark
                                            </button>
                                        </div>
                                        <p style={{ color: "#666", margin: "0 0 15px 0" }}>{bookmark.problem.description.substring(0, 150)}...</p>
                                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                            <span style={{
                                                backgroundColor: "#e3f2fd",
                                                color: "#1976d2",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px"
                                            }}>
                                                {bookmark.problem.subject}
                                            </span>
                                            <span style={{
                                                backgroundColor: "#fff3e0",
                                                color: "#f57c00",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px"
                                            }}>
                                                {bookmark.problem.level}
                                            </span>
                                            <span style={{ fontSize: "12px", color: "#666" }}>
                                                Bookmarked {new Date(bookmark.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserProfile;

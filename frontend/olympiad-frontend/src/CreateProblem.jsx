// src/CreateProblem.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import MathEditor from "./MathEditor";
import "./MathEditor.css";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";

function CreateProblem() {
  const location = useLocation();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    level: "",
    year: ""
  });
  const [tags, setTags] = useState([""]); // Array of tag strings

  // Pre-fill subject from URL parameter if coming from SubjectPage
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const subjectParam = urlParams.get('subject');
    if (subjectParam) {
      setFormData(prev => ({
        ...prev,
        subject: subjectParam
      }));
    }
  }, [location]);
  const [images, setImages] = useState([]); // Array of uploaded image filenames
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [mathEditorTarget, setMathEditorTarget] = useState(null); // 'title' or 'description'
  const navigate = useNavigate();

  // Function to determine where to redirect after successful creation
  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get('from');
    
    // If there's a specific 'from' parameter, use it
    if (from) {
      return from;
    }
    
    // Check if we came from a specific subject page
    const subject = searchParams.get('subject');
    if (subject) {
      return `/subject/${encodeURIComponent(subject)}`;
    }
    
    // Default to feed if no specific referrer
    return '/feed';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openMathEditor = (target) => {
    setMathEditorTarget(target);
    setShowMathEditor(true);
  };

  const handleMathInsert = (mathContent) => {
    if (mathEditorTarget) {
      setFormData({
        ...formData,
        [mathEditorTarget]: formData[mathEditorTarget] + mathContent
      });
    }
    setShowMathEditor(false);
    setMathEditorTarget(null);
  };

  const closeMathEditor = () => {
    setShowMathEditor(false);
    setMathEditorTarget(null);
  };

  const handleTagChange = (index, value) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const addTag = () => {
    if (tags.length < 5) {
      setTags([...tags, ""]);
    } else {
      alert("Maximum 5 tags allowed");
    }
  };

  const removeTag = (index) => {
    if (tags.length > 1) {
      const newTags = tags.filter((_, i) => i !== index);
      setTags(newTags);
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // Check if adding these files would exceed the limit
    if (images.length + files.length > 10) {
      alert("Maximum 10 images allowed. Please select fewer images.");
      return;
    }
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      return true;
    });
    
    // Store files for later upload
    setImages([...images, ...validFiles]);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate tags
      const validTags = tags.filter(tag => tag.trim() !== "");
      if (validTags.length > 5) {
        alert("Maximum 5 tags allowed");
        setLoading(false);
        return;
      }
      
      // Process tags: filter out empty tags and join with commas
      const processedTags = validTags.join(", ");
      
      const token = localStorage.getItem("token");
      
      // Ensure year is a number or null
      const requestData = {
        ...formData,
        tags: processedTags,
        year: formData.year ? parseInt(formData.year) : null
      };
      
      
      
      const response = await axios.post(
        "http://127.0.0.1:8000/auth/problems/",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Upload images if any
      if (images.length > 0) {
        setUploadingImages(true);
        try {
          for (const file of images) {
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadUrl = `http://127.0.0.1:8000/auth/problems/${response.data.id}/images`;
            
            const uploadResponse = await axios.post(
              uploadUrl,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
          }
        } catch (error) {
          console.error("Error uploading images:", error);
          console.error("Error response:", error.response?.data);
          console.error("Error status:", error.response?.status);
          alert(`Problem created but images failed to upload: ${error.response?.data?.detail || error.message}. You can add them later by editing the problem.`);
        } finally {
          setUploadingImages(false);
        }
      }

      alert("Problem created successfully!");
      navigate(getRedirectPath());
    } catch (error) {
      console.error("Error creating problem:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      alert("Error creating problem: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

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
          Create New Problem
        </h1>
        <p style={{ color: "#666" }}>Share a science problem with the community</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "600", 
            color: colors.dark,
            fontSize: "16px"
          }}>
            Title *
          </label>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={{
                flex: 1,
                padding: "12px 16px",
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.2s ease",
                fontFamily: "inherit"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.primary;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e9ecef";
            }}
            placeholder="Enter a descriptive title for your problem"
          />
            <button
              type="button"
              onClick={() => openMathEditor('title')}
              style={{
                padding: "12px 16px",
                backgroundColor: colors.secondary,
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(30, 64, 175, 0.3)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(30, 64, 175, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 8px rgba(30, 64, 175, 0.3)";
              }}
            >
              📐 Math
            </button>
          </div>
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "600", 
            color: colors.dark,
            fontSize: "16px"
          }}>
            Description *
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="6"
            style={{
                  flex: 1,
                  padding: "12px 16px",
                  whiteSpace: "pre-wrap",
                  border: "2px solid #e9ecef",
                  borderRadius: "8px",
              fontSize: "16px",
                  resize: "vertical",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.primary;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e9ecef";
            }}
            placeholder="Describe the problem in detail. Include any relevant information, constraints, or context."
          />
              <button
                type="button"
                onClick={() => openMathEditor('description')}
                style={{
                  padding: "12px 16px",
                  backgroundColor: colors.secondary,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  alignSelf: "flex-start",
                  boxShadow: "0 2px 8px rgba(30, 64, 175, 0.3)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(30, 64, 175, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 8px rgba(30, 64, 175, 0.3)";
                }}
              >
                📐 Math
              </button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "600", 
            color: colors.dark,
            fontSize: "16px"
          }}>
            Subject *
          </label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e9ecef",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s ease",
              fontFamily: "inherit",
              backgroundColor: "white"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e9ecef";
            }}
          >
            <option value="">Select a subject</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Engineering">Engineering</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "600", 
            color: colors.dark,
            fontSize: "16px"
          }}>
            Level
          </label>
          <input
            type="text"
            name="level"
            value={formData.level}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e9ecef",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s ease",
              fontFamily: "inherit"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e9ecef";
            }}
            placeholder="e.g., National Albanian Olympiad 5th Class Phase 1, EGMO Phase 2, IMO, etc."
          />
          <small style={{ color: colors.gray[600], fontSize: "14px", marginTop: "4px", display: "block" }}>
            Specify the competition level or difficulty (defaults to "Any Level" if left blank)
          </small>
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "600", 
            color: colors.dark,
            fontSize: "16px"
          }}>
            Year (Optional)
          </label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e9ecef",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s ease",
              fontFamily: "inherit"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e9ecef";
            }}
            placeholder="e.g., 2024, 2023, 2022..."
            min="1900"
            max="2030"
          />
          <small style={{ color: colors.gray[600], fontSize: "14px", marginTop: "4px", display: "block" }}>
            Year of the olympiad or competition (optional)
          </small>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Tags (Optional) - {tags.length}/5
          </label>
          {tags.map((tag, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <input
                type="text"
                value={tag}
                onChange={(e) => handleTagChange(index, e.target.value)}
                style={{
                  flex: 1,
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
            }}
                placeholder={`Tag ${index + 1}`}
              />
              {tags.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  style={{
                    padding: "10px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {tags.length < 5 && (
            <button
              type="button"
              onClick={addTag}
              style={{
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              + Add Tag
            </button>
          )}
          <small style={{ color: "#666", fontSize: "12px" }}>
            Add up to 5 tags to help categorize your problem
          </small>
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "600", 
            color: colors.dark,
            fontSize: "16px"
          }}>
            Images (Optional) - {images.length}/10
          </label>
          
          {/* Hidden file input */}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
            id="image-upload-input"
          />
          
          {/* Image previews and upload area */}
          <div style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            gap: "16px",
            alignItems: "flex-start"
          }}>
            {/* Existing images */}
            {images.map((file, index) => (
              <div key={index} style={{ 
                position: "relative",
                border: "1px solid #ddd", 
                borderRadius: "8px", 
                overflow: "hidden",
                backgroundColor: "white",
                width: "150px",
                height: "100px"
              }}>
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    padding: "2px 6px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "600"
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            
            {/* Upload box - only show if under max limit */}
            {images.length < 10 && (
              <div
                onClick={() => document.getElementById('image-upload-input').click()}
                style={{
                  width: "150px",
                  height: "100px",
                  border: "2px dashed #3b82f6",
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#dbeafe";
                  e.target.style.borderColor = "#1d4ed8";
                  e.target.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#eff6ff";
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.transform = "scale(1)";
                }}
              >
                <div style={{
                  fontSize: "32px",
                  color: "#3b82f6",
                  fontWeight: "bold",
                  marginBottom: "6px",
                  transition: "all 0.2s ease"
                }}>
                  +
                </div>
                <div style={{
                  fontSize: "12px",
                  color: "#3b82f6",
                  fontWeight: "600",
                  textAlign: "center"
                }}>
                  Add Image
                </div>
              </div>
            )}
          </div>
          
          {images.length >= 10 && (
            <div style={{ 
              padding: "10px", 
              backgroundColor: "#f8f9fa", 
              borderRadius: "4px",
              color: "#666",
              fontSize: "12px",
              marginTop: "10px"
            }}>
              Maximum 10 images reached
            </div>
          )}
          <small style={{ color: "#666", fontSize: "12px" }}>
            Upload up to 10 diagrams, graphs, or other images to help illustrate your problem
          </small>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button
            type="submit"
            disabled={loading || uploadingImages}
            style={{
              padding: "16px 32px",
              backgroundColor: loading ? colors.gray[400] : colors.primary,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              flex: 1,
              boxShadow: loading ? "none" : "0 4px 12px rgba(26, 77, 58, 0.3)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (!loading && !uploadingImages) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 16px rgba(26, 77, 58, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !uploadingImages) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(26, 77, 58, 0.3)";
              }
            }}
          >
            {loading ? "Creating..." : uploadingImages ? "Uploading Images..." : "Create Problem"}
          </button>
          <button
            type="button"
            onClick={() => navigate(getRedirectPath())}
            style={{
              padding: "16px 32px",
              backgroundColor: colors.gray[500],
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      
      {/* Math Editor Modal */}
      <MathEditor
        isOpen={showMathEditor}
        onClose={closeMathEditor}
        onInsert={handleMathInsert}
        initialValue=""
      />
    </Layout>
  );
}

export default CreateProblem;

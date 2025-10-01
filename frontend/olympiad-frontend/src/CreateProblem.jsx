// src/CreateProblem.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import MathEditor from "./MathEditor";
import "./MathEditor.css";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";

function CreateProblem() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    level: "",
    year: ""
  });
  const [tags, setTags] = useState([""]); // Array of tag strings
  const [images, setImages] = useState([]); // Array of uploaded image filenames
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [mathEditorTarget, setMathEditorTarget] = useState(null); // 'title' or 'description'
  const navigate = useNavigate();

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
      navigate("/homepage");
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

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Title *
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              style={{
                flex: 1,
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px"
              }}
              placeholder="Enter a descriptive title for your problem"
            />
            <button
              type="button"
              onClick={() => openMathEditor('title')}
              style={{
                padding: "10px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                whiteSpace: "nowrap"
              }}
            >
              📐 Math
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Description *
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="6"
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  resize: "vertical"
                }}
                placeholder="Describe the problem in detail. Include any relevant information, constraints, or context."
              />
              <button
                type="button"
                onClick={() => openMathEditor('description')}
                style={{
                  padding: "10px 12px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  alignSelf: "flex-start"
                }}
              >
                📐 Math
              </button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Subject *
          </label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
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
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Level
          </label>
          <input
            type="text"
            name="level"
            value={formData.level}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
            }}
            placeholder="e.g., National Albanian Olympiad 5th Class Phase 1, EGMO Phase 2, IMO, etc."
          />
          <small style={{ color: "#666", fontSize: "12px" }}>
            Specify the competition level or difficulty (defaults to "Any Level" if left blank)
          </small>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Year (Optional)
          </label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
            }}
            placeholder="e.g., 2024, 2023, 2022..."
            min="1900"
            max="2030"
          />
          <small style={{ color: "#666", fontSize: "12px" }}>
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
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Images (Optional) - {images.length}/10
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
            }}
          />
          {images.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>
                Selected Images ({images.length}):
              </div>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
                gap: "10px" 
              }}>
                {images.map((file, index) => (
                  <div key={index} style={{ 
                    position: "relative",
                    border: "1px solid #ddd", 
                    borderRadius: "8px", 
                    overflow: "hidden",
                    backgroundColor: "white"
                  }}>
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "80px",
                        objectFit: "cover"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        padding: "4px 8px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="submit"
            disabled={loading || uploadingImages}
            style={{
              padding: "12px 24px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              flex: 1
            }}
          >
            {loading ? "Creating..." : uploadingImages ? "Uploading Images..." : "Create Problem"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/homepage")}
            style={{
              padding: "12px 24px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              cursor: "pointer"
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

// src/CreateProblem.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CreateProblem() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    subject: "",
    level: "Any Level"
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:8000/auth/problems/",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Problem created successfully!");
      navigate("/feed");
    } catch (error) {
      console.error("Error creating problem:", error);
      alert("Error creating problem: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h2>Create New Problem</h2>
        <p style={{ color: "#666" }}>Share a science problem with the community</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
            }}
            placeholder="Enter a descriptive title for your problem"
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="6"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
              resize: "vertical"
            }}
            placeholder="Describe the problem in detail. Include any relevant information, constraints, or context."
          />
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
            Tags (Optional)
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
            }}
            placeholder="e.g., algebra, mechanics, organic chemistry (separate with commas)"
          />
          <small style={{ color: "#666", fontSize: "12px" }}>
            Separate multiple tags with commas
          </small>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="submit"
            disabled={loading}
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
            {loading ? "Creating..." : "Create Problem"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/feed")}
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
    </div>
  );
}

export default CreateProblem;

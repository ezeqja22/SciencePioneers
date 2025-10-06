import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SearchBar({ placeholder = "Search...", showAdvanced = true, initialQuery = "" }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    const query = encodeURIComponent(searchQuery.trim());
    navigate(`/search?q=${query}&category=all`);
  };


  const openAdvancedSearch = () => {
    setShowAdvancedModal(true);
  };

  const closeAdvancedSearch = () => {
    setShowAdvancedModal(false);
  };

  const handleAdvancedSearch = (advancedData) => {
    const params = new URLSearchParams();
    
    if (advancedData.query) params.append('q', advancedData.query);
    if (advancedData.category) params.append('category', advancedData.category);
    if (advancedData.subjects && advancedData.subjects.length > 0) {
      params.append('subjects', advancedData.subjects.join(','));
    }
    if (advancedData.level) params.append('level', advancedData.level);
    if (advancedData.year) params.append('year', advancedData.year);
    if (advancedData.tags) params.append('tags', advancedData.tags);
    
    navigate(`/search?${params.toString()}`);
    closeAdvancedSearch();
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

        {/* Search Input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '12px 20px',
            border: '2px solid #e9ecef',
            borderRadius: '25px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#1a4d3a';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e9ecef';
          }}
        />

        {/* Search Button */}
        <button
          type="submit"
          style={{
            padding: '12px 24px',
            backgroundColor: '#1a4d3a',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2d7a5f';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#1a4d3a';
          }}
        >
          🔍 Search
        </button>

        {/* Advanced Search Button */}
        {showAdvanced && (
          <button
            type="button"
            onClick={openAdvancedSearch}
            style={{
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#138496';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#17a2b8';
            }}
          >
            Advanced
          </button>
        )}
      </form>

      {/* Advanced Search Modal */}
      {showAdvancedModal && (
        <AdvancedSearchModal
          onClose={closeAdvancedSearch}
          onSearch={handleAdvancedSearch}
          initialData={{
            query: searchQuery,
            category: 'all'
          }}
        />
      )}
    </div>
  );
}

// Advanced Search Modal Component
function AdvancedSearchModal({ onClose, onSearch, initialData = {} }) {
  const [formData, setFormData] = useState({
    query: initialData.query || '',
    category: 'problems', // Advanced search always focuses on problems
    subjects: [],
    level: '',
    year: '',
    tags: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubjectChange = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject) 
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(formData);
  };

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Other'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Advanced Search</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Search Query */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Search Query (Optional)
            </label>
            <input
              type="text"
              name="query"
              value={formData.query}
              onChange={handleChange}
              placeholder="Enter keywords to search for (optional)..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Advanced search focuses on problems only */}
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px',
            marginBottom: '10px'
          }}>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
              <strong>Advanced Search</strong> - Filter problems by specific criteria
            </p>
          </div>

          {/* Subjects */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Subjects (Optional)
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '10px',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa'
            }}>
              {subjects.map(subject => (
                <label key={subject} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={formData.subjects.includes(subject)}
                    onChange={() => handleSubjectChange(subject)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{subject}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Level (Optional)
            </label>
            <input
              type="text"
              name="level"
              value={formData.level}
              onChange={handleChange}
              placeholder="e.g., IMO, EGMO Phase 2, etc."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Year */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Year (Optional)
            </label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="e.g., 2024"
              min="1900"
              max="2030"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Tags (Optional)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., algebra, geometry, combinatorics"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Search
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SearchBar;

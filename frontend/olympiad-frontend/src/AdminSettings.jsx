import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLayout.css';

const AdminSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://127.0.0.1:8000/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSetting = (key, currentValue) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const handleSaveSetting = async (key) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://127.0.0.1:8000/admin/settings/${key}`, {
        value: editValue,
        description: settings[key]?.description || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEditingKey(null);
      setEditValue('');
      fetchSettings();
    } catch (err) {
      console.error('Save setting error:', err);
      alert('Failed to save setting');
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const getSettingType = (key) => {
    if (key.includes('email') || key.includes('url')) return 'text';
    if (key.includes('enabled') || key.includes('active')) return 'boolean';
    if (key.includes('limit') || key.includes('count') || key.includes('timeout')) return 'number';
    return 'text';
  };

  const getSettingIcon = (key) => {
    if (key.includes('email')) return '📧';
    if (key.includes('security')) return '🔒';
    if (key.includes('maintenance')) return '🔧';
    if (key.includes('feature')) return '⭐';
    if (key.includes('limit')) return '📊';
    return '⚙️';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="admin-btn" onClick={fetchSettings}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-card">
        <h2>System Settings</h2>
        <p style={{ color: '#6c757d', marginBottom: '20px' }}>
          Configure system-wide settings and preferences. Changes take effect immediately.
        </p>
      </div>

      {/* Settings Categories */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {/* General Settings */}
        <div className="admin-card">
          <h3>🔧 General Settings</h3>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(settings).filter(([key]) => 
                  key.includes('site') || key.includes('general') || key.includes('name')
                ).map(([key, setting]) => (
                  <tr key={key}>
                    <td>
                      <div>
                        <strong>{getSettingIcon(key)} {key.replace(/_/g, ' ').toUpperCase()}</strong>
                      </div>
                    </td>
                    <td>
                      {editingKey === key ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {getSettingType(key) === 'boolean' ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : (
                            <input
                              type={getSettingType(key)}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
                            />
                          )}
                        </div>
                      ) : (
                        <span style={{ 
                          background: '#e9ecef', 
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '0.9rem'
                        }}>
                          {setting.value}
                        </span>
                      )}
                    </td>
                    <td>
                      <small style={{ color: '#6c757d' }}>
                        {setting.description || 'No description available'}
                      </small>
                    </td>
                    <td>
                      {editingKey === key ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="admin-btn success"
                            onClick={() => handleSaveSetting(key)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Save
                          </button>
                          <button
                            className="admin-btn secondary"
                            onClick={handleCancelEdit}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="admin-btn secondary"
                          onClick={() => handleEditSetting(key, setting.value)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Settings */}
        <div className="admin-card">
          <h3>🔒 Security Settings</h3>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(settings).filter(([key]) => 
                  key.includes('security') || key.includes('auth') || key.includes('password')
                ).map(([key, setting]) => (
                  <tr key={key}>
                    <td>
                      <div>
                        <strong>{getSettingIcon(key)} {key.replace(/_/g, ' ').toUpperCase()}</strong>
                      </div>
                    </td>
                    <td>
                      {editingKey === key ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type={key.includes('password') ? 'password' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
                          />
                        </div>
                      ) : (
                        <span style={{ 
                          background: '#e9ecef', 
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '0.9rem'
                        }}>
                          {key.includes('password') ? '••••••••' : setting.value}
                        </span>
                      )}
                    </td>
                    <td>
                      <small style={{ color: '#6c757d' }}>
                        {setting.description || 'No description available'}
                      </small>
                    </td>
                    <td>
                      {editingKey === key ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="admin-btn success"
                            onClick={() => handleSaveSetting(key)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Save
                          </button>
                          <button
                            className="admin-btn secondary"
                            onClick={handleCancelEdit}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="admin-btn secondary"
                          onClick={() => handleEditSetting(key, setting.value)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="admin-card">
          <h3>⭐ Feature Flags</h3>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(settings).filter(([key]) => 
                  key.includes('feature') || key.includes('enable')
                ).map(([key, setting]) => (
                  <tr key={key}>
                    <td>
                      <div>
                        <strong>{getSettingIcon(key)} {key.replace(/_/g, ' ').toUpperCase()}</strong>
                      </div>
                    </td>
                    <td>
                      {editingKey === key ? (
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      ) : (
                        <span className={`status-badge ${setting.value === 'true' ? 'active' : 'inactive'}`}>
                          {setting.value === 'true' ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </td>
                    <td>
                      <small style={{ color: '#6c757d' }}>
                        {setting.description || 'No description available'}
                      </small>
                    </td>
                    <td>
                      {editingKey === key ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="admin-btn success"
                            onClick={() => handleSaveSetting(key)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Save
                          </button>
                          <button
                            className="admin-btn secondary"
                            onClick={handleCancelEdit}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="admin-btn secondary"
                          onClick={() => handleEditSetting(key, setting.value)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Toggle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Actions */}
      <div className="admin-card">
        <h2>🚀 System Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <button className="admin-btn warning">
            🔄 Clear Cache
          </button>
          <button className="admin-btn secondary">
            📊 Generate Report
          </button>
          <button className="admin-btn danger">
            🗑️ Cleanup Data
          </button>
          <button className="admin-btn">
            💾 Backup Database
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

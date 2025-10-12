import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('site');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Settings categories
  const categories = {
    site: { name: 'Site Settings', icon: '🌐', color: '#3b82f6' },
    email: { name: 'Email Settings', icon: '📧', color: '#10b981' },
    security: { name: 'Security', icon: '🔒', color: '#ef4444' },
    content: { name: 'Content', icon: '📝', color: '#8b5cf6' },
    forum: { name: 'Forums', icon: '💬', color: '#f59e0b' },
    notification: { name: 'Notifications', icon: '🔔', color: '#06b6d4' },
    analytics: { name: 'Analytics', icon: '📊', color: '#84cc16' },
    maintenance: { name: 'Maintenance', icon: '🔧', color: '#6b7280' },
    feature: { name: 'Features', icon: '⚙️', color: '#ec4899' },
    privacy: { name: 'Privacy', icon: '🛡️', color: '#14b8a6' },
    integration: { name: 'Integrations', icon: '🔗', color: '#f97316' },
    advanced: { name: 'Advanced', icon: '⚡', color: '#6366f1' }
  };

  // Settings definitions with types and validation
  const settingsConfig = {
    site: {
      site_name: { type: 'text', label: 'Site Name', required: true },
      site_description: { type: 'textarea', label: 'Site Description', rows: 3 },
      site_logo: { type: 'url', label: 'Site Logo URL' },
      site_favicon: { type: 'url', label: 'Favicon URL' },
      site_theme: { type: 'select', label: 'Theme', options: ['light', 'dark', 'auto'] },
      site_language: { type: 'select', label: 'Language', options: ['en', 'es', 'fr', 'de'] }
    },
    email: {
      smtp_server: { type: 'text', label: 'SMTP Server', required: true },
      smtp_port: { type: 'number', label: 'SMTP Port', min: 1, max: 65535 },
      smtp_username: { type: 'text', label: 'SMTP Username' },
      smtp_password: { type: 'password', label: 'SMTP Password' },
      smtp_use_tls: { type: 'boolean', label: 'Use TLS' },
      email_from_name: { type: 'text', label: 'From Name' },
      email_from_address: { type: 'email', label: 'From Address' }
    },
    security: {
      password_min_length: { type: 'number', label: 'Min Password Length', min: 6, max: 50 },
      password_require_special: { type: 'boolean', label: 'Require Special Characters' },
      session_timeout_hours: { type: 'number', label: 'Session Timeout (hours)', min: 1, max: 168 },
      max_login_attempts: { type: 'number', label: 'Max Login Attempts', min: 3, max: 20 },
      lockout_duration_minutes: { type: 'number', label: 'Lockout Duration (minutes)', min: 5, max: 1440 }
    },
    content: {
      max_problem_length: { type: 'number', label: 'Max Problem Length', min: 100, max: 50000 },
      max_comment_length: { type: 'number', label: 'Max Comment Length', min: 10, max: 5000 },
      max_forum_description_length: { type: 'number', label: 'Max Forum Description Length', min: 50, max: 10000 },
      auto_moderate_content: { type: 'boolean', label: 'Auto Moderate Content' },
      require_approval_for_problems: { type: 'boolean', label: 'Require Approval for Problems' }
    },
    forum: {
      max_members_per_forum: { type: 'number', label: 'Max Members per Forum', min: 10, max: 1000 },
      forum_creation_requires_approval: { type: 'boolean', label: 'Forum Creation Requires Approval' },
      default_forum_visibility: { type: 'select', label: 'Default Forum Visibility', options: ['public', 'private', 'invite_only'] }
    },
        notification: {
          email_notifications_enabled: { type: 'boolean', label: 'Email Notifications' },
          in_app_notifications_enabled: { type: 'boolean', label: 'In-App Notifications' },
          notification_retention_days: { type: 'number', label: 'Notification Retention (days)', min: 7, max: 365 }
        },
    analytics: {
      analytics_enabled: { type: 'boolean', label: 'Analytics Enabled' },
      track_user_activity: { type: 'boolean', label: 'Track User Activity' },
      data_retention_days: { type: 'number', label: 'Data Retention (days)', min: 30, max: 1095 },
      export_data_enabled: { type: 'boolean', label: 'Allow Data Export' }
    },
    maintenance: {
      maintenance_mode: { type: 'boolean', label: 'Maintenance Mode' },
      maintenance_message: { type: 'textarea', label: 'Maintenance Message', rows: 3 },
      backup_frequency_hours: { type: 'number', label: 'Backup Frequency (hours)', min: 1, max: 168 },
      auto_cleanup_enabled: { type: 'boolean', label: 'Auto Cleanup Enabled' }
    },
    feature: {
      forums_enabled: { type: 'boolean', label: 'Forums Enabled' },
      comments_enabled: { type: 'boolean', label: 'Comments Enabled' },
      voting_enabled: { type: 'boolean', label: 'Voting Enabled' },
      bookmarks_enabled: { type: 'boolean', label: 'Bookmarks Enabled' },
      following_enabled: { type: 'boolean', label: 'Following Enabled' },
      notifications_enabled: { type: 'boolean', label: 'Notifications Enabled' },
      reports_enabled: { type: 'boolean', label: 'Reports Enabled' }
    },
    privacy: {
      profile_visibility: { type: 'select', label: 'Profile Visibility', options: ['public', 'private', 'friends_only'] },
      show_online_status: { type: 'boolean', label: 'Show Online Status', disabled: true },
      allow_data_export: { type: 'boolean', label: 'Allow Data Export', disabled: true },
      gdpr_compliance: { type: 'boolean', label: 'GDPR Compliance', disabled: true }
    },
    integration: {
      google_analytics_id: { type: 'text', label: 'Google Analytics ID' },
      facebook_app_id: { type: 'text', label: 'Facebook App ID' },
      twitter_handle: { type: 'text', label: 'Twitter Handle' },
      discord_webhook: { type: 'url', label: 'Discord Webhook URL' }
    },
    advanced: {
      cache_enabled: { type: 'boolean', label: 'Cache Enabled' },
      cache_ttl_minutes: { type: 'number', label: 'Cache TTL (minutes)', min: 1, max: 1440 },
      cdn_enabled: { type: 'boolean', label: 'CDN Enabled' },
      cdn_url: { type: 'url', label: 'CDN URL' },
      ssl_required: { type: 'boolean', label: 'SSL Required' },
      cors_origins: { type: 'textarea', label: 'CORS Origins', rows: 2 }
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/get-settings');
      
      // Parse the nested settings structure
      const parsedSettings = {};
      Object.keys(response.data).forEach(category => {
        if (response.data[category]) {
          parsedSettings[category] = {};
          Object.keys(response.data[category]).forEach(key => {
            const settingData = response.data[category][key];
            parsedSettings[category][key] = {
              value: settingData.value || '',
              updated_at: settingData.updated_at,
              updated_by: settingData.updated_by
            };
          });
        }
      });
      
      setSettings(parsedSettings);
    } catch (err) {
      console.error('Error fetching settings:', err);
      alert('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: {
          ...prev[category]?.[key],
          value: value
        }
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Flatten settings for API
      const settingsToSave = {};
      Object.keys(settings).forEach(category => {
        if (settings[category]) {
          Object.keys(settings[category]).forEach(key => {
            if (settings[category][key]?.value !== undefined) {
              // For password fields, only save if user has entered a new password
              if (key === 'smtp_password') {
                const passwordValue = settings[category][key].value;
                // Only save if it's not "ENCRYPTED" and not empty
                if (passwordValue !== 'ENCRYPTED' && passwordValue.trim() !== '') {
                  settingsToSave[key] = passwordValue;
                }
              } else {
                settingsToSave[key] = settings[category][key].value;
              }
            }
          });
        }
      });
      
      const saveResponse = await axios.post('http://127.0.0.1:8000/save-settings', {
        settings: settingsToSave
      });

      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const initializeSettings = async () => {
    const confirmed = window.confirm('This will initialize default settings. Continue?');
    if (confirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.post('http://127.0.0.1:8000/admin/settings/initialize', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Default settings initialized!');
        fetchSettings();
      } catch (err) {
        console.error('Error initializing settings:', err);
        alert('Failed to initialize settings');
      }
    }
  };

  const resetSettings = async () => {
    const confirmed = window.confirm('This will reset ALL settings to defaults. This cannot be undone. Continue?');
    if (confirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.post('http://127.0.0.1:8000/admin/settings/reset', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Settings reset to defaults!');
        fetchSettings();
      } catch (err) {
        console.error('Error resetting settings:', err);
        alert('Failed to reset settings');
      }
    }
  };

  const exportSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://127.0.0.1:8000/admin/settings/export', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting settings:', err);
      alert('Failed to export settings');
    }
  };

        const testSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                // Testing settings
                
                const response = await axios.get('http://127.0.0.1:8000/test-settings');
                
                // Test completed
                
                // Check if response has the expected structure
                if (!response.data || !response.data.results) {
                    throw new Error('Invalid response structure from server');
                }
                
                const results = response.data.results;
                const message = `
🧪 Settings Test Results:

✅ Settings Loaded: ${results.settings_loaded ? 'Yes' : 'No'}
📝 Site Name: ${results.site_name || 'Not Set'}
🔧 Maintenance Mode: ${results.maintenance_mode ? 'ON' : 'OFF'}
💬 Forums Enabled: ${results.forums_enabled ? 'Yes' : 'No'}
👥 Registration Enabled: ${results.registration_enabled ? 'Yes' : 'No'}

📧 EMAIL SETTINGS:
🌐 SMTP Server: ${results.smtp_server || 'Not Set'}
🔌 SMTP Port: ${results.smtp_port || 'Not Set'}
👤 SMTP Username: ${results.smtp_username || 'Not Set'}
🔒 SMTP Password: ${results.smtp_password || 'Not Set'}
🔐 Use TLS: ${results.smtp_use_tls ? 'Yes' : 'No'}
📨 From Name: ${results.email_from_name || 'Not Set'}
📧 From Address: ${results.email_from_address || 'Not Set'}

📈 Total Settings: ${results.total_settings || 0}

All settings are working correctly! 🎉
              `;
                
                alert(message);
            } catch (err) {
                console.error('Error testing settings:', err);
                console.error('Error details:', err.response?.data);
                console.error('Full response:', err.response);
                
                let errorMessage = 'Failed to test settings';
                if (err.response?.data?.detail) {
                    errorMessage += `: ${err.response.data.detail}`;
                } else if (err.message) {
                    errorMessage += `: ${err.message}`;
                }
                
                alert(errorMessage);
            }
        };

  const renderSettingField = (category, key, config) => {
    const setting = settings[category]?.[key];
    const value = setting?.value || '';
    
    // Rendering field

    switch (config.type) {
      case 'boolean':
        // Check if this is a non-implemented feature or explicitly disabled
        const nonImplementedFeatures = [
          'auto_moderate_content', 
          'require_approval_for_problems',
          'forum_creation_requires_approval'
        ];
        const isDisabled = nonImplementedFeatures.includes(key) || config.disabled;
        
        return (
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? 'not-allowed' : 'default'
          }}>
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => !isDisabled && handleSettingChange(category, key, e.target.checked.toString())}
              disabled={isDisabled}
              style={{ 
                transform: 'scale(1.2)',
                cursor: isDisabled ? 'not-allowed' : 'default'
              }}
            />
            <span style={{ 
              color: isDisabled ? '#999' : 'inherit',
              fontStyle: isDisabled ? 'italic' : 'normal'
            }}>
              {config.label}
              {isDisabled && <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>(Not implemented yet)</span>}
            </span>
          </label>
        );

      case 'select':
        // Check if this is a non-implemented feature or explicitly disabled
        const nonImplementedSelectFeatures = [];
        const isSelectDisabled = nonImplementedSelectFeatures.includes(key) || config.disabled;
        
        return (
          <select
            value={value}
            onChange={(e) => !isSelectDisabled && handleSettingChange(category, key, e.target.value)}
            disabled={isSelectDisabled}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              opacity: isSelectDisabled ? 0.5 : 1,
              cursor: isSelectDisabled ? 'not-allowed' : 'default'
            }}
          >
            {config.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleSettingChange(category, key, e.target.value)}
            rows={config.rows || 3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(category, key, e.target.value)}
            min={config.min}
            max={config.max}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        );

      case 'password':
        return (
          <div>
            <input
              type="password"
              value={value && value !== 'ENCRYPTED' ? value : ''}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              placeholder={value && value !== 'ENCRYPTED' ? '••••••••' : 'Enter password'}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {value === 'ENCRYPTED' && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Password is encrypted. Enter a new password to change it.
              </div>
            )}
          </div>
        );

      default:
        // Check if this is a non-implemented feature
        const nonImplementedNumberFeatures = [];
        const isNumberDisabled = nonImplementedNumberFeatures.includes(key);
        
        return (
          <input
            type={config.type}
            value={value || ''}
            onChange={(e) => !isNumberDisabled && handleSettingChange(category, key, e.target.value)}
            placeholder={config.placeholder}
            disabled={isNumberDisabled}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              opacity: isNumberDisabled ? 0.5 : 1,
              cursor: isNumberDisabled ? 'not-allowed' : 'default'
            }}
          />
        );
    }
  };

  const filteredCategories = Object.keys(categories).filter(category => {
    if (!showAdvanced && category === 'advanced') return false;
    if (searchTerm) {
      const categoryName = categories[category].name.toLowerCase();
      const hasMatchingSettings = Object.keys(settingsConfig[category] || {}).some(key => {
        const settingName = settingsConfig[category][key].label.toLowerCase();
        return settingName.includes(searchTerm.toLowerCase());
      });
      return categoryName.includes(searchTerm.toLowerCase()) || hasMatchingSettings;
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚙️</div>
          <div>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '28px', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ⚙️ System Settings
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Configure system-wide settings and preferences
        </p>
      </div>

      {/* Search and Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input
            type="text"
            placeholder="Search settings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? '💾 Saving...' : '💾 Save All'}
          </button>
          
          <button
            onClick={exportSettings}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            📤 Export
          </button>
          
          <button
            onClick={testSettings}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🧪 Test Settings
          </button>
          
          <button
            onClick={fetchSettings}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Refresh
          </button>
          
          <button
            onClick={initializeSettings}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Initialize
          </button>
          
          <button
            onClick={resetSettings}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Advanced Toggle */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <span style={{ fontWeight: '500' }}>Show Advanced Settings</span>
        </label>
      </div>

      {/* Settings Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '16px'
      }}>
        {filteredCategories.map(category => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            style={{
              background: activeTab === category 
                ? `linear-gradient(135deg, ${categories[category].color}, ${categories[category].color}dd)`
                : '#f9fafb',
              color: activeTab === category ? 'white' : '#374151',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <span>{categories[category].icon}</span>
            <span>{categories[category].name}</span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="admin-card">
        <h2 style={{ 
          margin: '0 0 24px 0', 
          fontSize: '20px',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {categories[activeTab].icon} {categories[activeTab].name}
        </h2>
        
        {/* Debug Info */}
        <div style={{
          background: '#f3f4f6',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <strong>Debug Info:</strong> Active tab: {activeTab} | 
          Settings for this tab: {settings[activeTab] ? Object.keys(settings[activeTab]).length : 0} | 
          Total settings loaded: {Object.keys(settings).length}
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          {settingsConfig[activeTab] && Object.keys(settingsConfig[activeTab]).map(key => {
            const config = settingsConfig[activeTab][key];
            const setting = settings[activeTab]?.[key];
            
            return (
              <div key={key} style={{
                padding: '20px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                background: '#fafafa'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: '600', 
                    marginBottom: '8px',
                    color: config.disabled ? '#9ca3af' : '#374151'
                  }}>
                    {config.label}
                    {config.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                    {config.disabled && <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '8px' }}>(Coming soon)</span>}
                  </label>
                  
                  {renderSettingField(activeTab, key, config)}
                  
                  {setting?.description && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      {setting.description}
                    </div>
                  )}
                  
                  {setting?.updated_at && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: '#9ca3af'
                    }}>
                      Last updated: {new Date(setting.updated_at).toLocaleString()}
                      {setting.updated_by && ` by ${setting.updated_by}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Show message if no settings for this tab */}
          {(!settingsConfig[activeTab] || Object.keys(settingsConfig[activeTab]).length === 0) && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '2px dashed #d1d5db'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
              <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                No settings available for this category
              </div>
              <div style={{ fontSize: '14px' }}>
                Settings will appear here once they are initialized
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
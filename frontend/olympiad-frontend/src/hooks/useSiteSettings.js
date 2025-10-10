import { useState, useEffect } from 'react';
import axios from 'axios';

export const useSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState({
    site_name: 'Science Pioneers',
    site_description: 'A platform for science enthusiasts',
    site_logo: '',
    site_favicon: '',
    site_theme: 'light',
    maintenance_mode: false,
    maintenance_message: 'Site under maintenance'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  const fetchSiteSettings = async () => {
    try {
      console.log('Fetching site settings from:', 'http://127.0.0.1:8000/site-info');
      const response = await axios.get('http://127.0.0.1:8000/site-info');
      console.log('Site settings response:', response.data);
      setSiteSettings(response.data);
    } catch (err) {
      console.error('Error fetching site settings:', err);
      console.error('Error details:', err.response?.data);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = () => {
    setLoading(true);
    fetchSiteSettings();
  };

  return {
    siteSettings,
    loading,
    error,
    refreshSettings
  };
};

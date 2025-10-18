import { useState, useEffect } from 'react';
import axios from 'axios';

export const useSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState({
    site_name: 'Olimpiada',
    site_description: 'Master the art of problem-solving through challenging olympiad problems. Join a community of passionate learners and sharpen your analytical skills.',
    site_logo: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760809847/Olimpiada_Logo_green_1_n9agy9.png',
    site_favicon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760809847/Olimpiada_Logo_green_1_n9agy9.png',
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
      const response = await axios.get('https://olimpiada-backend.onrender.com/site-info');
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

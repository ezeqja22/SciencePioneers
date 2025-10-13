import { useState, useEffect } from 'react';
import axios from 'axios';

export const useFeatureSettings = () => {
  const [featureSettings, setFeatureSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeatureSettings();
  }, []);

  const fetchFeatureSettings = async () => {
    try {
      const response = await axios.get('https://olimpiada-backend.onrender.com/site-info');
      setFeatureSettings(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const checkFeatureEnabled = (feature) => {
    // If still loading, default to enabled to avoid blocking features
    if (loading) {
      return true;
    }
    
    const isEnabled = featureSettings[feature] !== false;
    return isEnabled;
  };

  const showFeatureDisabledAlert = (featureName) => {
    alert(`${featureName} have been temporarily disabled, please try again later.`);
  };

  return {
    featureSettings,
    loading,
    error,
    checkFeatureEnabled,
    showFeatureDisabledAlert
  };
};

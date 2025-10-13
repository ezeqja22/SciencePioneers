import { useState, useEffect } from 'react';
import axios from 'axios';

export const useProfileVisibility = () => {
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfileVisibility();
  }, []);

  const fetchProfileVisibility = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/site-info`);
      setProfileVisibility(response.data.profile_visibility || 'public');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const canViewProfile = (profileOwner, currentUser, isFollowing = false, isFollowedByProfileOwner = false) => {
    // Admins can always view profiles
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      return true;
    }

    // If no current user, only public profiles are visible
    if (!currentUser) {
      return profileVisibility === 'public';
    }

    // User can always view their own profile
    if (currentUser.id === profileOwner.id) {
      return true;
    }

    // Check visibility settings
    switch (profileVisibility) {
      case 'public':
        return true;
      case 'private':
        return false;
      case 'friends_only':
        return isFollowing && isFollowedByProfileOwner; // Mutual following
      default:
        return true;
    }
  };

  const canViewProblems = (profileOwner, currentUser, isFollowing = false, isFollowedByProfileOwner = false) => {
    // Same logic as canViewProfile
    return canViewProfile(profileOwner, currentUser, isFollowing, isFollowedByProfileOwner);
  };

  return {
    profileVisibility,
    loading,
    error,
    canViewProfile,
    canViewProblems
  };
};

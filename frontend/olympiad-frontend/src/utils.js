// Utility functions for Olimpiada

/**
 * Get the display initial for a user's profile picture
 * Handles deleted users by showing "?" instead of "["
 */
export const getUserInitial = (username) => {
    if (!username) return "?";
    
    // Convert to string if it's a number
    const usernameStr = String(username);
    
    // Handle deleted users (database format: __deleted_user_{id}__)
    if (usernameStr.startsWith("__deleted_user_")) {
        return "?";
    }
    
    return usernameStr.charAt(0).toUpperCase();
};

/**
 * Check if a user is deleted
 */
export const isDeletedUser = (username) => {
    if (!username) return false;
    return String(username).startsWith("__deleted_user_");
};

/**
 * Get display name for a user (handles deleted users)
 * Shows clean "[deleted user]" to users regardless of database format
 */
export const getDisplayName = (username) => {
    if (!username) return "Unknown";
    if (isDeletedUser(username)) {
        return "[deleted user]";
    }
    return String(username);
};

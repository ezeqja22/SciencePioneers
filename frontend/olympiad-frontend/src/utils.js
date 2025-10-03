// Utility functions for SciencePioneers

/**
 * Get the display initial for a user's profile picture
 * Handles deleted users by showing "?" instead of "["
 */
export const getUserInitial = (username) => {
    if (!username) return "?";
    
    // Handle deleted users (database format: __deleted_user_{id}__)
    if (username.startsWith("__deleted_user_")) {
        return "?";
    }
    
    return username.charAt(0).toUpperCase();
};

/**
 * Check if a user is deleted
 */
export const isDeletedUser = (username) => {
    return username.startsWith("__deleted_user_");
};

/**
 * Get display name for a user (handles deleted users)
 * Shows clean "[deleted user]" to users regardless of database format
 */
export const getDisplayName = (username) => {
    if (isDeletedUser(username)) {
        return "[deleted user]";
    }
    return username;
};

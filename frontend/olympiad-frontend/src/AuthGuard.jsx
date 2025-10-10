import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import LoginPopup from "./LoginPopup";
import AnimatedLoader from "./components/AnimatedLoader";
import { useSiteSettings } from "./hooks/useSiteSettings";

function AuthGuard({ children }) {
  const [isValidating, setIsValidating] = useState(true);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get site settings for maintenance mode check
  const { siteSettings } = useSiteSettings();

  useEffect(() => {
    validateSession();
  }, [location.pathname, siteSettings]);

  // Check maintenance mode
  useEffect(() => {
    if (siteSettings.maintenance_mode) {
      // Allow admin access to admin routes
      const isAdminRoute = location.pathname.startsWith('/admin');
      const isAdmin = currentUser && currentUser.role === 'admin';
      
      if (!isAdminRoute && !isAdmin) {
        // Show maintenance message
        return;
      }
    }
  }, [siteSettings.maintenance_mode, location.pathname, currentUser]);

  const validateSession = async () => {
    const token = localStorage.getItem("token");
    
    // Allow homepage, login, and signup to be accessible without authentication
    if (location.pathname === "/" || 
        location.pathname === "/homepage" || 
        location.pathname === "/login" || 
        location.pathname === "/signup" ||
        location.pathname === "/verify-email") {
      setIsAuthenticated(false);
      setIsValidating(false);
      return;
    }
    
    // During maintenance mode, allow login/signup pages even if not authenticated
    if (siteSettings.maintenance_mode && 
        (location.pathname === "/login" || location.pathname === "/signup")) {
      setIsAuthenticated(false);
      setIsValidating(false);
      return;
    }
    
    // If no token and trying to access protected route, show login popup
    if (!token && isProtectedRoute(location.pathname)) {
      setShowLoginPopup(true);
      setIsAuthenticated(false);
      setIsValidating(false);
      return;
    }

    // If token exists, validate it
    if (token) {
      try {
        const response = await axios.get("http://127.0.0.1:8000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data) {
          // Token is valid
          setCurrentUser(response.data);
          setIsAuthenticated(true);
          setShowLoginPopup(false);
        } else {
          // Token is invalid
          localStorage.removeItem("token");
          if (isProtectedRoute(location.pathname)) {
            setShowLoginPopup(true);
          }
          setIsAuthenticated(false);
        }
        setIsValidating(false);
      } catch (error) {
        // Check if user is banned
        if (error.response?.status === 403 && error.response?.data?.detail?.includes("Account has been banned")) {
          // Show ban message and redirect to login
          alert("🚫 " + error.response.data.detail);
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        
        // Check if user is deactivated
        if (error.response?.status === 403 && error.response?.data?.detail?.includes("Account has been deactivated")) {
          // Show deactivation message and redirect to login
          alert("⚠️ " + error.response.data.detail);
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        
        // Token is invalid or expired
        localStorage.removeItem("token");
        if (isProtectedRoute(location.pathname)) {
          setShowLoginPopup(true);
        }
        setIsAuthenticated(false);
        setIsValidating(false);
      }
    } else {
      setIsAuthenticated(false);
      setIsValidating(false);
    }
  };

  const isProtectedRoute = (pathname) => {
    const protectedRoutes = [
      "/feed", 
      "/create-problem", 
      "/profile", 
      "/user/", 
      "/problem/", 
      "/search", 
      "/forums", 
      "/subject/"
    ];
    return protectedRoutes.some(route => pathname.startsWith(route));
  };

  const handleLoginSuccess = () => {
    setShowLoginPopup(false);
    setIsAuthenticated(true);
    // The LoginPopup component will handle the redirect
  };

  const handleClosePopup = () => {
    setShowLoginPopup(false);
    // If they close the popup, redirect to homepage
    if (isProtectedRoute(location.pathname)) {
      navigate("/homepage");
    }
  };


  // Don't show children if popup is open and user is not authenticated
  if (showLoginPopup && !isAuthenticated) {
    return (
      <LoginPopup 
        isOpen={showLoginPopup}
        onClose={handleClosePopup}
        redirectTo={location.pathname}
      />
    );
  }

  if (isValidating) {
    return (
      <AnimatedLoader 
        type="verify" 
        message="Validating session..." 
        size="large"
      />
    );
  }

  return children;
}

export default AuthGuard;

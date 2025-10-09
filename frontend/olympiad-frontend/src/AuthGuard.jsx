import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import LoginPopup from "./LoginPopup";
import AnimatedLoader from "./components/AnimatedLoader";

function AuthGuard({ children }) {
  const [isValidating, setIsValidating] = useState(true);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    validateSession();
  }, [location.pathname]);

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

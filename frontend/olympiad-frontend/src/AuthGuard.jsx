import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import LoginPopup from "./LoginPopup";

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
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Validating session...</h2>
      </div>
    );
  }

  return children;
}

export default AuthGuard;

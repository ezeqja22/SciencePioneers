import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

function AuthGuard({ children }) {
  const [isValidating, setIsValidating] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    validateSession();
  }, [location.pathname]);

  const validateSession = async () => {
    const token = localStorage.getItem("token");
    
    // If no token and trying to access protected route, redirect to login
    if (!token && isProtectedRoute(location.pathname)) {
      navigate("/login", { replace: true });
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
          setIsValidating(false);
        } else {
          // Token is invalid
          localStorage.removeItem("token");
          if (isProtectedRoute(location.pathname)) {
            navigate("/login", { replace: true });
          }
          setIsValidating(false);
        }
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem("token");
        if (isProtectedRoute(location.pathname)) {
          navigate("/login", { replace: true });
        }
        setIsValidating(false);
      }
    } else {
      setIsValidating(false);
    }
  };

  const isProtectedRoute = (pathname) => {
    const protectedRoutes = ["/feed", "/create-problem", "/profile"];
    return protectedRoutes.some(route => pathname.startsWith(route));
  };

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

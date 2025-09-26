import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Signup from "./Signup";
import Login from "./Login";
import Feed from "./Feed";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route 
        path="/feed" 
        element={
          <ProtectedRoute>
        <Feed />
        </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Signup from "./Signup";
import Login from "./Login";
import Feed from "./Feed";
import CreateProblem from "./CreateProblem";
import ProtectedRoute from "./ProtectedRoute";
import ProblemDetail from "./ProblemDetail";
import UserProfile from "./UserProfile";
import PublicUserProfile from "./PublicUserProfile";
import AuthGuard from "./AuthGuard";

function App() {
  return (
    <Router>
      <AuthGuard>
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
          <Route 
          path="/create-problem" 
          element={
            <ProtectedRoute>
          <CreateProblem />
          </ProtectedRoute>
          } />
          <Route 
          path="/problem/:id" 
          element={
            <ProtectedRoute>
          <ProblemDetail />
          </ProtectedRoute>
          } />
          <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
          <UserProfile />
          </ProtectedRoute>
          } />
          <Route 
          path="/user/:username" 
          element={
            <ProtectedRoute>
          <PublicUserProfile />
          </ProtectedRoute>
          } />
        </Routes>
      </AuthGuard>
    </Router>
  );
}

export default App;

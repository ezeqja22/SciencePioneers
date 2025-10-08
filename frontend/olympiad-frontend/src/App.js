import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import Signup from "./Signup";
import Login from "./Login";
import Homepage from "./Homepage";
import Feed from "./Feed";
import CreateProblem from "./CreateProblem";
import ProtectedRoute from "./ProtectedRoute";
import ProblemDetail from "./ProblemDetail";
import UserProfile from "./UserProfile";
import PublicUserProfile from "./PublicUserProfile";
import EmailVerification from "./EmailVerification";
import SearchResults from "./SearchResults";
import Forums from "./Forums";
import ForumDetail from "./ForumDetail";
import ThreadPage from "./ThreadPage";
import SubjectPage from "./SubjectPage";
import Settings from "./Settings";
import ResetPassword from "./ResetPassword";
import FollowersFollowing from "./components/FollowersFollowing";
import AuthGuard from "./AuthGuard";

function App() {
  return (
    <Router>
      <AuthGuard>
        <Routes>
          <Route path="/" element={<Navigate to="/homepage" replace />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route 
          path="/homepage" 
          element={<Homepage />} />
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
          <Route 
          path="/verify-email" 
          element={<EmailVerification />} />
          <Route 
          path="/search" 
          element={
            <ProtectedRoute>
          <SearchResults />
          </ProtectedRoute>
          } />
          <Route 
          path="/forums" 
          element={
            <ProtectedRoute>
          <Forums />
          </ProtectedRoute>
          } />
          <Route 
          path="/forum/:forumId" 
          element={
            <ProtectedRoute>
          <ForumDetail />
          </ProtectedRoute>
          } />
          <Route 
          path="/forum/:forumId/info" 
          element={
            <ProtectedRoute>
          <ForumDetail />
          </ProtectedRoute>
          } />
          <Route 
          path="/forum/:forumId/thread/:messageId" 
          element={
            <ProtectedRoute>
          <ThreadPage />
          </ProtectedRoute>
          } />
          <Route 
          path="/subject/:subject" 
          element={
            <ProtectedRoute>
          <SubjectPage />
          </ProtectedRoute>
          } />
          <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
          <Settings />
          </ProtectedRoute>
          } />
          <Route 
          path="/followers/:userId" 
          element={
            <ProtectedRoute>
          <FollowersFollowing type="followers" />
          </ProtectedRoute>
          } />
          <Route 
          path="/following/:userId" 
          element={
            <ProtectedRoute>
          <FollowersFollowing type="following" />
          </ProtectedRoute>
          } />
        </Routes>
      </AuthGuard>
    </Router>
  );
}

export default App;

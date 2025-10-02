import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import BackButton from './components/BackButton';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from location state (passed from signup)
  const email = location.state?.email || '';
  const username = location.state?.username || '';
  const redirectTo = location.state?.redirectTo || '/homepage';
  
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/auth/verify-email', {
        email: email,
        verification_code: verificationCode
      });

      if (response.status === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate(redirectTo);
        }, 2000);
      }
    } catch (err) {
      console.error('Verification error:', err);
      if (err.response?.data?.detail) {
        // Handle both string and object responses
        const errorDetail = err.response.data.detail;
        setError(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/auth/send-verification', {
        email: email
      });

      if (response.status === 200) {
        setError(''); // Clear any previous errors
        
        // Check if email sending failed and code is provided
        if (response.data.verification_code) {
          alert(`Email sending failed, but here's your verification code: ${response.data.verification_code}`);
        } else {
          alert('Verification code sent! Please check your email.');
        }
      }
    } catch (err) {
      console.error('Resend error:', err);
      if (err.response?.data?.detail) {
        // Handle both string and object responses
        const errorDetail = err.response.data.detail;
        setError(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
      } else {
        setError('Failed to resend verification code. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#28a745', marginBottom: '20px' }}>Email Verified!</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Your email has been successfully verified. You can now log in to your account.
          </p>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Verify Your Email</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            We've sent a 6-digit verification code to:
          </p>
          <p style={{ color: '#007bff', fontWeight: 'bold', margin: '10px 0' }}>
            {email}
          </p>
        </div>

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength="6"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                textAlign: 'center',
                letterSpacing: '2px',
                fontFamily: 'monospace'
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !verificationCode.trim()}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '15px'
            }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              style={{
                backgroundColor: 'transparent',
                color: '#007bff',
                border: '1px solid #007bff',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: resending ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #eee'
          }}>
            <BackButton 
              fallbackPath="/login"
              style={{
                backgroundColor: 'transparent',
                color: '#6c757d',
                border: 'none',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailVerification;

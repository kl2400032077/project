import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./apiClient";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simple validation
      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required');
      }
      
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Call backend API to create account
      const requestBody = {
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      
      console.log('Sending signup request:', { email: requestBody.email, role: requestBody.role, passwordLength: requestBody.password.length });
      
      const response = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status, response.statusText);

      // Parse JSON response safely
      let data;
      const text = await response.text();
      console.log('Response text:', text);
      
      // Check if response is ok first
      if (!response.ok) {
        // Try to parse error message from response
        if (text) {
          try {
            data = JSON.parse(text);
            const errorMsg = data.error || `Failed to create account (${response.status})`;
            console.error('Backend error:', errorMsg);
            throw new Error(errorMsg);
          } catch (parseError) {
            // If it's the error we just threw, re-throw it
            if (parseError instanceof Error && parseError.message && !parseError.message.includes('JSON')) {
              throw parseError;
            }
            // JSON parse failed, use the text as error
            console.error('Parse error, using text as error:', text);
            throw new Error(text || `Server error (${response.status})`);
          }
        } else {
          // Empty error response
          console.error('Empty error response');
          throw new Error(`Server error (${response.status}). Please try again.`);
        }
      }

      // Success response - parse the data
      if (text) {
        try {
          data = JSON.parse(text);
          console.log('Account created successfully:', data);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Invalid response from server. Please try again.');
        }
      } else {
        throw new Error('Empty response from server');
      }

      // Success! Store user info and navigate
      localStorage.setItem('user', JSON.stringify(data));
      setCreatedUser(data);
      setSuccess(true);
      console.log('Account created:', data);
      
      // Dispatch event to notify header of login
      window.dispatchEvent(new Event('userLogin'));
      
      // Auto-navigate after 2 seconds
      setTimeout(() => {
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      }, 2000);
      
    } catch (err) {
      // Handle network errors (backend not running)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please make sure the backend server is running on port 5174.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        backgroundColor: "#f9fafb"
      }}>
        <div className="signin-container" style={{
          maxWidth: "600px",
          width: "100%",
          padding: "48px",
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
        }}>
        <h2 style={{ marginTop: 0, color: "#22c55e" }}>✅ Account Created!</h2>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Welcome to NutriTrack, {formData.email}!
        </p>
        <div style={{ padding: 16, backgroundColor: "#f0f9ff", borderRadius: 8, marginTop: 16 }}>
          <h4>Account Details:</h4>
          <p><strong>Email:</strong> {createdUser?.email || formData.email}</p>
          <p><strong>Role:</strong> {createdUser?.role || formData.role}</p>
          <p><strong>Status:</strong> Active</p>
        </div>
        <button 
          onClick={() => {
            if (createdUser?.role === 'admin' || formData.role === 'admin') {
              navigate('/admin');
            } else {
              navigate('/user');
            }
          }}
          style={{ width: "100%", marginTop: 16, padding: "18px", fontSize: "18px", fontWeight: "600", borderRadius: "8px" }}
        >
          Go to Dashboard
        </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      backgroundColor: "#f9fafb"
    }}>
      <div className="signin-container" style={{
        maxWidth: "600px",
        width: "100%",
        padding: "48px",
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
      }}>
        <h2 style={{ marginTop: 0, fontSize: "32px" }}>Create Account</h2>
        <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 24, fontSize: "18px" }}>
          Join NutriTrack to track your nutrition
        </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "12px", color: "#374151", fontWeight: "600", fontSize: "16px" }}>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            style={{ width: "100%", padding: "16px", fontSize: "18px", boxSizing: "border-box", borderRadius: "8px", border: "2px solid #e5e7eb" }}
          />
        </div>
        
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "12px", color: "#374151", fontWeight: "600", fontSize: "16px" }}>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password (min 6 characters)"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            disabled={loading}
            style={{ width: "100%", padding: "16px", fontSize: "18px", boxSizing: "border-box", borderRadius: "8px", border: "2px solid #e5e7eb" }}
          />
        </div>
        
        <div style={{ marginBottom: "28px" }}>
          <label style={{ display: "block", marginBottom: "12px", color: "#374151", fontWeight: "600", fontSize: "16px" }}>Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={loading}
            style={{ width: "100%", padding: "16px", fontSize: "18px", boxSizing: "border-box", borderRadius: "8px", border: "2px solid #e5e7eb" }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: "100%", padding: "18px", fontSize: "18px", fontWeight: "600", borderRadius: "8px" }}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
        
        {error && (
          <div className="error" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}
      </form>
      </div>
    </div>
  );
};

export default SignUp;

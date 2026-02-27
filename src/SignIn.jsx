// src/SignIn.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./apiClient";

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const requestBody = { email, password };
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const text = await response.text();
      let data;

      if (!response.ok) {
        try {
          data = JSON.parse(text);
          throw new Error(data.error || "Invalid email or password");
        } catch {
          throw new Error(text || "Server error");
        }
      }

      data = JSON.parse(text);

      localStorage.setItem("user", JSON.stringify(data));
      window.dispatchEvent(new Event("userLogin"));

      if (data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Cannot connect to server. Make sure backend is running.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        backgroundColor: "#f9fafb",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          padding: "48px",
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}
      >
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🥗</div>
            <h2
              style={{
                marginTop: 0,
                fontSize: "32px",
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Welcome to Diet Balance
            </h2>
            <p style={{ color: "#6b7280", marginTop: 0, fontSize: "18px" }}>
              Analyze meals, spot deficits, and get smart personalized recommendations.
            </p>
          </div>
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  color: "#374151",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "18px",
                  boxSizing: "border-box",
                  borderRadius: "8px",
                  border: "2px solid #e5e7eb",
                }}
              />
            </div>
            <div style={{ marginBottom: "28px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  color: "#374151",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "18px",
                  boxSizing: "border-box",
                  borderRadius: "8px",
                  border: "2px solid #e5e7eb",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "18px",
                fontSize: "18px",
                fontWeight: "600",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: "8px",
              }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 16,
                padding: "12px",
                background: "#f0f9ff",
                borderRadius: "6px",
                border: "1px solid #bae6fd",
                textAlign: "center",
              }}
            >
              <strong>Don't have an account?</strong>
              <br />
              <a
                href="/signup"
                style={{
                  color: "#22c55e",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
              >
                Create a new account
              </a>
            </div>
            {error && (
              <p className="error" style={{ marginTop: "16px" }}>
                {error}
              </p>
            )}
          </form>
        </div>
    </div>
  );
};

export default SignIn;

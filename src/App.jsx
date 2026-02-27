import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link } from "react-router-dom";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import HomePage from "./HomePage";
import NutrientDeficient from "./NutrientDeficient";
import "./App.css";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [healthCondition, setHealthCondition] = useState(() => {
    try {
      return localStorage.getItem("userHealthCondition") || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  });

  const nutritionalInfoItems = [
    "Nutrient Requirements",
    "Fat",
    "Protein",
    "Starchy Foods",
    "Fibre",
    "Sugar",
    "Vitamins and Minerals",
    "Hydration"
  ];

  const nutritionForItems = [
    "Children",
    "Adolescents",
    "Adults",
    "Seniors",
    "Pregnant Women",
    "Athletes"
  ];

  const healthConditionsItems = [
    "Diabetes",
    "Heart Disease",
    "Obesity",
    "Anemia",
    "Osteoporosis",
    "Hypertension"
  ];

  const healthyDietItems = [
    "Meal Planning",
    "Portion Control",
    "Balanced Diet",
    "Weight Management",
    "Special Diets"
  ];

  // Check user directly from localStorage on every render
  const getUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Sync user state with localStorage
  useEffect(() => {
    const currentUser = getUser();
    if (currentUser !== user) {
      setUser(currentUser);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Listen for custom login/logout events from the same tab
    const handleAuthChange = () => {
      const currentUser = getUser();
      setUser(currentUser);
    };
    
    window.addEventListener('userLogin', handleAuthChange);
    window.addEventListener('userLogout', handleAuthChange);
    
    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      const currentUser = getUser();
      setUser(currentUser);
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('userLogin', handleAuthChange);
      window.removeEventListener('userLogout', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('[data-profile-menu]')) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear all user-related data
    localStorage.removeItem('user');
    localStorage.removeItem('userHealthCondition');
    localStorage.removeItem('selectedNavContent');
    
    // Update state immediately
    setUser(null);
    setShowProfileMenu(false);
    setHealthCondition(null);
    
    // Dispatch event to notify of logout
    window.dispatchEvent(new Event('userLogout'));
    
    // Navigate to home page
    navigate('/home');
  };

  const getInitials = (email) => {
    if (!email) return 'U';
    const parts = email.split('@')[0];
    return parts.substring(0, 2).toUpperCase();
  };

  const truncateEmail = (email, maxLength = 20) => {
    if (!email) return '';
    if (email.length <= maxLength) return email;
    return email.substring(0, maxLength) + '...';
  };

  // Close menu when navigating
  useEffect(() => {
    setShowProfileMenu(false);
  }, [location.pathname]);

  const handleNavItemClick = (category, item) => {
    // Store selected content in localStorage for HomePage to read
    localStorage.setItem("selectedNavContent", JSON.stringify({ category, item }));
    // Dispatch event to notify HomePage
    window.dispatchEvent(new CustomEvent("navContentSelected", { detail: { category, item } }));
    setActiveDropdown(null);
    
    if (category === "healthConditions") {
      setHealthCondition(item);
      localStorage.setItem("userHealthCondition", item);
    }
    
    // Navigate if needed
    if (category === "nutritional" && (item === "Nutrient Requirements" || item === "Vitamins and Minerals")) {
      navigate("/nutrient-deficient");
    } else if (category === "nutritionFor" && user) {
      navigate("/user");
    } else if (category === "healthyDiet" && item === "Meal Planning") {
      navigate(user ? "/user" : "/");
    } else if (location.pathname === "/home") {
      // If on home page, scroll to content section
      setTimeout(() => {
        const element = document.getElementById("content-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      // Navigate to home page to show content
      navigate("/home");
      setTimeout(() => {
        const element = document.getElementById("content-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    }
  };

  return (
    <>
      <header className="app-header" style={{ padding: "16px 24px", position: "relative", zIndex: 1000 }}>
        <div className="brand" style={{ cursor: "pointer", fontSize: "28px", fontWeight: "700" }} onClick={() => navigate("/home")}>
          🥗 NutriTrack
        </div>
        <nav className="nav">
          {!user ? (
            <>
              <Link to="/home" className="nav-button signin-btn">Home</Link>
              <Link to="/signup" className="nav-button signup-btn">Sign Up</Link>
              <Link to="/" className="nav-button signin-btn">Sign In</Link>
            </>
          ) : (
            <>
              <Link to="/home" className="nav-button signin-btn">Home</Link>
              <div style={{ position: "relative" }} data-profile-menu>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowProfileMenu(!showProfileMenu);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--primary-dark)"}
                onMouseLeave={(e) => e.target.style.background = "var(--primary)"}
              >
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  {getInitials(user.email)}
                </div>
                <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {truncateEmail(user.email, 15)}
                </span>
                <span style={{ fontSize: "10px" }}>▼</span>
              </button>
              {showProfileMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    background: "white",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    minWidth: "200px",
                    zIndex: 10000,
                    animation: "fadeIn 0.2s ease"
                  }}
                >
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                      {user?.email || "User"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {user?.role === 'admin' ? 'Administrator' : 'User'}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontWeight: "500",
                      borderTop: "1px solid var(--border)",
                      borderRadius: "0 0 8px 8px"
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#fef2f2"}
                    onMouseLeave={(e) => e.target.style.background = "transparent"}
                  >
                    🚪 Log Out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        </nav>
      </header>
      
      {/* Navigation Bar with Dropdowns */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "24px 0",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
          <nav style={{ display: "flex", gap: "48px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Nutritional Information */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setActiveDropdown("nutritional")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 0",
                  fontSize: "20px",
                  fontWeight: "500",
                  color: activeDropdown === "nutritional" ? "#ec4899" : "#1f2937",
                  cursor: "pointer",
                  borderBottom: activeDropdown === "nutritional" ? "3px solid #ec4899" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Nutritional Information
                <span style={{ fontSize: "12px" }}>▼</span>
              </button>
              {activeDropdown === "nutritional" && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  minWidth: "220px",
                  marginTop: "8px",
                  padding: "8px 0",
                  zIndex: 1000
                }}>
                  {nutritionalInfoItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleNavItemClick("nutritional", item)}
                      style={{
                        padding: "12px 20px",
                        cursor: "pointer",
                        fontSize: "15px",
                        color: "#374151",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f3f4f6"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nutrition for... */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setActiveDropdown("nutritionFor")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 0",
                  fontSize: "20px",
                  fontWeight: "500",
                  color: activeDropdown === "nutritionFor" ? "#ec4899" : "#1f2937",
                  cursor: "pointer",
                  borderBottom: activeDropdown === "nutritionFor" ? "3px solid #ec4899" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Nutrition for...
                <span style={{ fontSize: "12px" }}>▼</span>
              </button>
              {activeDropdown === "nutritionFor" && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  minWidth: "200px",
                  marginTop: "8px",
                  padding: "8px 0",
                  zIndex: 1000
                }}>
                  {nutritionForItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleNavItemClick("nutritionFor", item)}
                      style={{
                        padding: "12px 20px",
                        cursor: "pointer",
                        fontSize: "15px",
                        color: "#374151",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f3f4f6"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Health Conditions */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setActiveDropdown("healthConditions")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 0",
                  fontSize: "20px",
                  fontWeight: "500",
                  color: activeDropdown === "healthConditions" ? "#ec4899" : "#1f2937",
                  cursor: "pointer",
                  borderBottom: activeDropdown === "healthConditions" ? "3px solid #ec4899" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Health Conditions
                <span style={{ fontSize: "12px" }}>▼</span>
              </button>
              {activeDropdown === "healthConditions" && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  minWidth: "200px",
                  marginTop: "8px",
                  padding: "8px 0",
                  zIndex: 1000
                }}>
                  {healthConditionsItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleNavItemClick("healthConditions", item)}
                      style={{
                        padding: "12px 20px",
                        cursor: "pointer",
                        fontSize: "15px",
                        color: healthCondition === item ? "#ec4899" : "#374151",
                        fontWeight: healthCondition === item ? "600" : "400",
                        background: healthCondition === item ? "#fce7f3" : "transparent",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (healthCondition !== item) {
                          e.target.style.background = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (healthCondition !== item) {
                          e.target.style.background = "transparent";
                        }
                      }}
                    >
                      {item} {healthCondition === item && "✓"}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Creating a Healthy Diet */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setActiveDropdown("healthyDiet")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 0",
                  fontSize: "20px",
                  fontWeight: "500",
                  color: activeDropdown === "healthyDiet" ? "#ec4899" : "#1f2937",
                  cursor: "pointer",
                  borderBottom: activeDropdown === "healthyDiet" ? "3px solid #ec4899" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Creating a Healthy Diet
                <span style={{ fontSize: "12px" }}>▼</span>
              </button>
              {activeDropdown === "healthyDiet" && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  minWidth: "220px",
                  marginTop: "8px",
                  padding: "8px 0",
                  zIndex: 1000
                }}>
                  {healthyDietItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleNavItemClick("healthyDiet", item)}
                      style={{
                        padding: "12px 20px",
                        cursor: "pointer",
                        fontSize: "15px",
                        color: "#374151",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f3f4f6"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

function AppContent() {
  return (
    <>
      <Header />
      <div className="container">
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/user" element={<div className="card"><UserDashboard /></div>} />
          <Route path="/admin" element={<div className="card"><AdminDashboard /></div>} />
          <Route path="/nutrient-deficient" element={<NutrientDeficient />} />
        </Routes>
        <footer style={{ textAlign: "center", color: "#6b7280", margin: "24px 0", padding: "24px 0" }}>
          <p style={{ margin: "8px 0" }}>© {new Date().getFullYear()} NutriTrack - Advanced Nutrition Analysis System</p>
          <p style={{ margin: "8px 0", fontSize: "14px" }}>
            Helping everyone achieve optimal nutritional health
          </p>
        </footer>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_FOODS, findRdaForAge } from "./nutritionData";
import { estimateMealNutrients, computeDeficits, suggestFoodsForDeficits, generateDailyPlan } from "./recommendationEngine";
import { apiFetch } from "./apiClient";

const NutrientDeficient = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState(25);
  const [entries, setEntries] = useState([]);
  const [foods, setFoods] = useState(DEFAULT_FOODS);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
        // Load user's meal entries if available
        loadUserData(u);
      }
    } catch (e) {
      console.error("Error loading user:", e);
    }
  }, []);

  const loadUserData = async (userData) => {
    try {
      const userId = userData.id || userData.email || "demo-user";
      const response = await apiFetch(`/api/user/health-history/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const latest = data[data.length - 1];
          setAge(latest.age || 25);
          // Convert health data back to entries format if needed
        }
      }
    } catch (e) {
      console.error("Error loading user data:", e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/foods");
        if (res.ok) {
          const data = await res.json();
          setFoods([...DEFAULT_FOODS, ...data.filter(f => !DEFAULT_FOODS.some(df => df.id === f.id))]);
        }
      } catch {}
    })();
  }, []);

  const totals = useMemo(() => estimateMealNutrients(entries, foods), [entries, foods]);
  const { rda, deficits } = useMemo(() => computeDeficits(Number(age) || 25, totals), [age, totals]);
  const suggestions = useMemo(() => suggestFoodsForDeficits(deficits, foods, 5), [deficits, foods]);

  const criticalDeficits = useMemo(() => {
    return Object.entries(deficits)
      .filter(([k]) => k !== "calories")
      .filter(([_, d]) => d.gap > 0)
      .sort((a, b) => b[1].gap - a[1].gap);
  }, [deficits]);

  const dietPlans = [
    {
      name: "Balanced Nutrition Plan",
      description: "A well-rounded diet focusing on all essential nutrients",
      meals: [
        "Breakfast: Whole grain cereal with milk and fruit",
        "Lunch: Grilled chicken with vegetables and brown rice",
        "Dinner: Salmon with quinoa and steamed broccoli",
        "Snacks: Nuts, yogurt, and fresh fruits"
      ],
      facts: [
        "Includes all major food groups",
        "Provides 2000-2400 calories daily",
        "Rich in fiber, vitamins, and minerals"
      ]
    },
    {
      name: "High Protein Plan",
      description: "Designed for muscle building and recovery",
      meals: [
        "Breakfast: Scrambled eggs with whole grain toast",
        "Lunch: Lean beef with sweet potato and greens",
        "Dinner: Turkey breast with lentils and vegetables",
        "Snacks: Greek yogurt, protein shake, almonds"
      ],
      facts: [
        "Provides 1.6-2.2g protein per kg body weight",
        "Supports muscle repair and growth",
        "Helps maintain satiety and metabolism"
      ]
    },
    {
      name: "Iron-Rich Plan",
      description: "Focuses on combating iron deficiency",
      meals: [
        "Breakfast: Fortified cereal with iron-rich fruits",
        "Lunch: Spinach salad with lean red meat",
        "Dinner: Lentils with tomatoes and bell peppers",
        "Snacks: Dark chocolate, dried apricots, pumpkin seeds"
      ],
      facts: [
        "Includes both heme and non-heme iron sources",
        "Vitamin C enhances iron absorption",
        "Avoids tea/coffee with iron-rich meals"
      ]
    },
    {
      name: "Calcium & Vitamin D Plan",
      description: "Strengthens bones and supports immune function",
      meals: [
        "Breakfast: Fortified milk with fortified cereal",
        "Lunch: Sardines with leafy greens",
        "Dinner: Tofu stir-fry with fortified foods",
        "Snacks: Cheese, yogurt, fortified orange juice"
      ],
      facts: [
        "Provides 1000-1300mg calcium daily",
        "Includes 600-800 IU vitamin D",
        "Supports bone health and immune system"
      ]
    },
    {
      name: "Vitamin C Boost Plan",
      description: "Enhances immune function and iron absorption",
      meals: [
        "Breakfast: Fresh orange juice with whole grains",
        "Lunch: Bell pepper salad with citrus dressing",
        "Dinner: Broccoli and cauliflower with lean protein",
        "Snacks: Kiwi, strawberries, tomatoes"
      ],
      facts: [
        "Provides 90-200mg vitamin C daily",
        "Helps with collagen production",
        "Acts as powerful antioxidant"
      ]
    }
  ];

  const nutrientNames = {
    protein_g: "Protein",
    iron_mg: "Iron",
    vitaminC_mg: "Vitamin C",
    calcium_mg: "Calcium",
    vitaminD_IU: "Vitamin D"
  };

  const getNutrientUnit = (key) => {
    if (key === "vitaminD_IU") return "IU";
    if (key === "protein_g") return "g";
    return "mg";
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: "42px", color: "#1f2937", marginBottom: "16px" }}>
          🎯 Nutrient Deficiency Analysis
        </h1>
        <p style={{ fontSize: "18px", color: "#6b7280", maxWidth: "700px", margin: "0 auto" }}>
          Identify your nutrient gaps and get personalized recommendations to improve your health
        </p>
      </div>

      {!user && (
        <div className="card" style={{ marginBottom: "32px", padding: "20px", background: "#fef3c7", border: "1px solid #fbbf24" }}>
          <p style={{ margin: 0, color: "#92400e" }}>
            <strong>Note:</strong> You're viewing a demo.{" "}
            <a href="/" style={{ color: "#22c55e", fontWeight: "600" }}>Sign in</a> to track your personal nutrient data.
          </p>
        </div>
      )}

      {/* Age Input */}
      <div className="card" style={{ marginBottom: "32px", padding: "24px" }}>
        <label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
          Your Age: <input
            type="number"
            min="1"
            max="120"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "2px solid #e5e7eb", marginLeft: "8px" }}
          />
        </label>
        <p style={{ color: "#6b7280", margin: "8px 0 0 0" }}>
          Age Group: <strong>{findRdaForAge(Number(age) || 25).label}</strong>
        </p>
      </div>

      {/* Your Deficiencies */}
      <div className="card" style={{ marginBottom: "32px", padding: "32px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#1f2937", fontSize: "28px" }}>
          Your Nutrient Deficiencies
        </h2>
        {criticalDeficits.length === 0 ? (
          <p style={{ color: "#22c55e", fontSize: "18px", fontWeight: "600" }}>
            ✅ Great! You have no critical nutrient deficiencies.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {criticalDeficits.map(([key, deficit]) => (
              <div
                key={key}
                style={{
                  padding: "20px",
                  background: "#fef2f2",
                  borderRadius: "8px",
                  border: "2px solid #fecaca"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0, color: "#991b1b", fontSize: "20px" }}>
                    {nutrientNames[key]}
                  </h3>
                  <span style={{ color: "#dc2626", fontWeight: "600" }}>
                    {deficit.gap.toFixed(1)} {getNutrientUnit(key)} deficient
                  </span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#6b7280" }}>
                  <span>Target: {deficit.target.toFixed(1)} {getNutrientUnit(key)}</span>
                  <span>Current: {deficit.have.toFixed(1)} {getNutrientUnit(key)}</span>
                  <span>Progress: {Math.round(deficit.pct * 100)}%</span>
                </div>
                <div style={{ marginTop: "12px", height: "8px", background: "#fee2e2", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, deficit.pct * 100)}%`,
                      background: deficit.pct >= 1 ? "#22c55e" : "#ef4444",
                      transition: "width 0.3s ease"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Recommendations */}
      {suggestions.length > 0 && (
        <div className="card" style={{ marginBottom: "32px", padding: "32px" }}>
          <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#1f2937", fontSize: "28px" }}>
            💡 Smart Recommendations
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "20px" }}>
            Based on your deficiencies, here are foods that can help:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {suggestions.map((food, idx) => (
              <div
                key={idx}
                style={{
                  padding: "20px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  border: "2px solid #86efac"
                }}
              >
                <h4 style={{ margin: "0 0 12px 0", color: "#166534" }}>{food.name}</h4>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  <div>Calories: {food.calories} kcal/100g</div>
                  <div>Protein: {food.protein_g}g</div>
                  {food.iron_mg > 0 && <div>Iron: {food.iron_mg}mg</div>}
                  {food.vitaminC_mg > 0 && <div>Vitamin C: {food.vitaminC_mg}mg</div>}
                  {food.calcium_mg > 0 && <div>Calcium: {food.calcium_mg}mg</div>}
                  {food.vitaminD_IU > 0 && <div>Vitamin D: {food.vitaminD_IU}IU</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diet Plans */}
      <div className="card" style={{ marginBottom: "32px", padding: "32px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#1f2937", fontSize: "28px" }}>
          🍽️ Diet Plans
        </h2>
        <p style={{ color: "#6b7280", marginBottom: "32px" }}>
          Choose from various diet plans designed to address specific nutritional needs:
        </p>
        <div style={{ display: "grid", gap: "24px" }}>
          {dietPlans.map((plan, idx) => (
            <div
              key={idx}
              style={{
                padding: "24px",
                background: "#f9fafb",
                borderRadius: "12px",
                border: "2px solid #e5e7eb"
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "8px", color: "#1f2937", fontSize: "22px" }}>
                {plan.name}
              </h3>
              <p style={{ color: "#6b7280", marginBottom: "16px" }}>{plan.description}</p>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#374151" }}>Sample Meals:</strong>
                <ul style={{ margin: "8px 0", paddingLeft: "24px", color: "#6b7280" }}>
                  {plan.meals.map((meal, mIdx) => (
                    <li key={mIdx} style={{ marginBottom: "4px" }}>{meal}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong style={{ color: "#374151" }}>Key Facts:</strong>
                <ul style={{ margin: "8px 0", paddingLeft: "24px", color: "#6b7280" }}>
                  {plan.facts.map((fact, fIdx) => (
                    <li key={fIdx} style={{ marginBottom: "4px" }}>{fact}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        {user ? (
          <button
            onClick={() => navigate("/user")}
            style={{
              padding: "16px 32px",
              fontSize: "18px",
              fontWeight: "600",
              background: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Go to Dashboard
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "16px 32px",
                fontSize: "18px",
                fontWeight: "600",
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Sign In to Track
            </button>
            <button
              onClick={() => navigate("/signup")}
              style={{
                padding: "16px 32px",
                fontSize: "18px",
                fontWeight: "600",
                background: "white",
                color: "#22c55e",
                border: "2px solid #22c55e",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Create Account
            </button>
          </>
        )}
        <button
          onClick={() => navigate("/home")}
          style={{
            padding: "16px 32px",
            fontSize: "18px",
            fontWeight: "600",
            background: "transparent",
            color: "#6b7280",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default NutrientDeficient;


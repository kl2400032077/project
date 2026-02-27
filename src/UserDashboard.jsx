import React, { useEffect, useMemo, useState } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { DEFAULT_FOODS, findRdaForAge } from "./nutritionData";
import { apiFetch } from "./apiClient";
import { estimateMealNutrients, computeDeficits, suggestFoodsForDeficits, generateDailyPlan } from "./recommendationEngine";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const UserDashboard = () => {
  const [age, setAge] = useState(12);
  const [entries, setEntries] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState(DEFAULT_FOODS[0]?.id || "");
  const [grams, setGrams] = useState(100);
  const [syncServer, setSyncServer] = useState(true);
  const [dailyPlan, setDailyPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("tracker");
  const [history, setHistory] = useState([]);
  const [foods, setFoods] = useState(DEFAULT_FOODS);
  const [useCustomFood, setUseCustomFood] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: "",
    calories: 0,
    protein_g: 0,
    iron_mg: 0,
    vitaminC_mg: 0,
    calcium_mg: 0,
    vitaminD_IU: 0
  });
  // Get userId from localStorage or use demo-user as fallback
  const getUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || user.email || "demo-user";
      }
    } catch (e) {
      console.error('Error reading user from localStorage:', e);
    }
    return "demo-user";
  };
  const userId = getUserId();

  const totals = useMemo(() => estimateMealNutrients(entries, foods), [entries, foods]);
  const { rda, deficits } = useMemo(() => computeDeficits(Number(age) || 12, totals), [age, totals]);
  const healthCondition = useMemo(() => {
    try {
      return localStorage.getItem("userHealthCondition") || null;
    } catch {
      return null;
    }
  }, []);
  const suggestions = useMemo(() => suggestFoodsForDeficits(deficits, foods, 5, healthCondition), [deficits, foods, healthCondition]);

  const addEntry = async () => {
    if (!grams) return;
    
    let newEntry;
    if (useCustomFood) {
      // Create custom food entry with nutrient values
      if (!customFood.name.trim()) {
        alert("Please enter a food name");
        return;
      }
      // Store custom food data in the entry
      newEntry = {
        foodIdOrName: customFood.name.trim(),
        grams: Number(grams),
        customFood: true,
        nutrients: {
          calories: customFood.calories,
          protein_g: customFood.protein_g,
          iron_mg: customFood.iron_mg,
          vitaminC_mg: customFood.vitaminC_mg,
          calcium_mg: customFood.calcium_mg,
          vitaminD_IU: customFood.vitaminD_IU
        }
      };
    } else {
      if (!selectedFoodId) return;
      newEntry = { foodIdOrName: selectedFoodId, grams: Number(grams) };
    }
    
    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    
    if (syncServer) {
      try {
        await apiFetch(`/api/meals/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEntry)
        });
        await saveHealthData(updatedEntries);
      } catch {}
    }
    
    // Reset custom food form
    if (useCustomFood) {
      setCustomFood({
        name: "",
        calories: 0,
        protein_g: 0,
        iron_mg: 0,
        vitaminC_mg: 0,
        calcium_mg: 0,
        vitaminD_IU: 0
      });
    }
  };

  const removeEntry = (idx) => {
    const updatedEntries = entries.filter((_, i) => i !== idx);
    setEntries(updatedEntries);
    if (syncServer) {
      saveHealthData(updatedEntries);
    }
  };

  const saveHealthData = async (currentEntries) => {
    try {
      const currentTotals = estimateMealNutrients(currentEntries);
      const currentDeficits = computeDeficits(Number(age) || 12, currentTotals);
      await apiFetch("/api/user/health-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          age: Number(age) || 12,
          totals: currentTotals,
          deficits: currentDeficits.deficits,
          timestamp: Date.now()
        })
      });
    } catch {}
  };

  const generatePlan = async () => {
    try {
      // Get health condition from localStorage
      const healthCondition = localStorage.getItem("userHealthCondition") || null;
      const plan = generateDailyPlan(Number(age) || 12, rda.calories, foods, healthCondition);
      setDailyPlan(plan);
    } catch (e) {
      alert("Failed to generate plan");
    }
  };

  // Fetch foods from backend API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch('/api/foods');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            // Combine default foods with backend foods
            const allFoods = [...DEFAULT_FOODS, ...data.filter(f => !DEFAULT_FOODS.some(df => df.id === f.id))];
            setFoods(allFoods);
            if (!selectedFoodId && allFoods.length > 0) {
              setSelectedFoodId(allFoods[0].id);
            }
          }
        }
      } catch {}
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    if (!syncServer) return;
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/meals/${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setEntries(data);
        
        // Load history
        const historyRes = await apiFetch(`/api/user/health-history/${userId}`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (mounted) setHistory(historyData);
        }
      } catch {}
    })();
    return () => { mounted = false };
  }, [syncServer]);

  useEffect(() => {
    if (syncServer && entries.length > 0) {
      saveHealthData(entries);
    }
  }, [entries, age]);

  const chartData = useMemo(() => {
    return {
      labels: ["Calories", "Protein (g)", "Iron (mg)", "Vit C (mg)", "Calcium (mg)", "Vit D (IU)"],
      datasets: [
        {
          label: "Your Intake",
          data: [
            totals.calories || 0,
            totals.protein_g || 0,
            totals.iron_mg || 0,
            totals.vitaminC_mg || 0,
            totals.calcium_mg || 0,
            totals.vitaminD_IU || 0
          ],
          backgroundColor: "rgba(34, 197, 94, 0.6)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 2
        },
        {
          label: "Recommended",
          data: [
            rda.calories,
            rda.protein_g,
            rda.iron_mg,
            rda.vitaminC_mg,
            rda.calcium_mg,
            rda.vitaminD_IU
          ],
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 2
        }
      ]
    };
  }, [totals, rda]);

  const progressData = useMemo(() => {
    const nutrientKeys = ["protein_g", "iron_mg", "vitaminC_mg", "calcium_mg", "vitaminD_IU"];
    const percentages = nutrientKeys.map(key => {
      const d = deficits[key];
      return d && d.target > 0 ? Math.min(100, (d.have / d.target) * 100) : 0;
    });
    
    return {
      labels: ["Protein", "Iron", "Vit C", "Calcium", "Vit D"],
      datasets: [{
        label: "Progress %",
        data: percentages,
        backgroundColor: percentages.map(p => p >= 100 ? "rgba(34, 197, 94, 0.6)" : p >= 70 ? "rgba(245, 158, 11, 0.6)" : "rgba(239, 68, 68, 0.6)"),
        borderColor: percentages.map(p => p >= 100 ? "rgba(34, 197, 94, 1)" : p >= 70 ? "rgba(245, 158, 11, 1)" : "rgba(239, 68, 68, 1)"),
        borderWidth: 2
      }]
    };
  }, [deficits]);

  const overallHealthScore = useMemo(() => {
    const nutrientKeys = ["protein_g", "iron_mg", "vitaminC_mg", "calcium_mg", "vitaminD_IU"];
    const scores = nutrientKeys.map(key => {
      const d = deficits[key];
      return d && d.target > 0 ? Math.min(100, (d.have / d.target) * 100) : 0;
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [deficits]);

  const criticalDeficits = useMemo(() => {
    return Object.entries(deficits)
      .filter(([k]) => k !== "calories")
      .filter(([_, d]) => d.gap > 0)
      .sort((a, b) => b[1].gap - a[1].gap);
  }, [deficits]);

  return (
    <div style={{
      padding: "20px",
      background: "linear-gradient(135deg, rgba(34, 197, 94, 0.02) 0%, rgba(16, 163, 74, 0.02) 100%)",
      borderRadius: "8px",
      position: "relative"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{
          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0
        }}>My Nutrition Dashboard</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("tracker")}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeTab === "tracker" ? "var(--primary)" : "white",
              color: activeTab === "tracker" ? "white" : "var(--text)",
              cursor: "pointer"
            }}
          >
            Tracker
          </button>
          <button
            onClick={() => setActiveTab("plan")}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeTab === "plan" ? "var(--primary)" : "white",
              color: activeTab === "plan" ? "white" : "var(--text)",
              cursor: "pointer"
            }}
          >
            Diet Plan
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeTab === "progress" ? "var(--primary)" : "white",
              color: activeTab === "progress" ? "white" : "var(--text)",
              cursor: "pointer"
            }}
          >
            Progress
          </button>
        </div>
      </div>

      {/* Health Score Card */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div className="card" style={{
          background: overallHealthScore >= 80 ? "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 163, 74, 0.1) 100%)" :
            overallHealthScore >= 60 ? "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)" :
            "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)",
          textAlign: "center",
          padding: "24px"
        }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: overallHealthScore >= 80 ? "#22c55e" : overallHealthScore >= 60 ? "#f59e0b" : "#ef4444" }}>
            {overallHealthScore}%
          </div>
          <div style={{ color: "#6b7280", marginTop: "8px", fontWeight: "500" }}>Overall Health Score</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6" }}>{criticalDeficits.length}</div>
          <div style={{ color: "#6b7280", marginTop: "8px" }}>Nutrient Deficits</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#22c55e" }}>{entries.length}</div>
          <div style={{ color: "#6b7280", marginTop: "8px" }}>Meals Logged</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#8b5cf6" }}>{findRdaForAge(Number(age) || 12).label}</div>
          <div style={{ color: "#6b7280", marginTop: "8px" }}>Age Group</div>
        </div>
      </div>

      {activeTab === "tracker" && (
      <div>
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0 }}>Profile Settings</h3>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Age:</span>
                <input
                  type="number"
                  min="1"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  style={{ width: "80px", padding: "8px" }}
                />
              </label>
              <span style={{ color: "#6b7280" }}>{findRdaForAge(Number(age) || 12).label}</span>
              {healthCondition && (
                <div style={{
                  padding: "8px 16px",
                  background: "#fce7f3",
                  borderRadius: "6px",
                  border: "1px solid #f9a8d4",
                  color: "#831843",
                  fontWeight: "600"
                }}>
                  Health Condition: {healthCondition}
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={syncServer}
                  onChange={(e) => setSyncServer(e.target.checked)}
                />
                <span>Sync with server</span>
              </label>
            </div>
            {healthCondition && (
              <div style={{
                marginTop: "16px",
                padding: "12px",
                background: "#f0fdf4",
                borderRadius: "6px",
                border: "1px solid #86efac",
                fontSize: "14px",
                color: "#166534"
              }}>
                <strong>Note:</strong> Your diet plans and recommendations are tailored for {healthCondition}. 
                Visit the homepage to change your health condition.
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0 }}>Log Your Meal</h3>
            
            {/* Toggle between preset foods and custom food */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useCustomFood}
                  onChange={(e) => setUseCustomFood(e.target.checked)}
                />
                <span>Add custom meal with my own nutrient values</span>
              </label>
            </div>

            {!useCustomFood ? (
              // Preset foods selection
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={selectedFoodId}
                  onChange={(e) => setSelectedFoodId(e.target.value)}
                  style={{ padding: "10px", minWidth: "200px" }}
                >
                  {foods.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  placeholder="Grams"
                  style={{ padding: "10px", width: "120px" }}
                />
                <button onClick={addEntry} style={{ padding: "10px 20px" }}>Add Meal</button>
              </div>
            ) : (
              // Custom food input form
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                      Food/Meal Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={customFood.name}
                      onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                      placeholder="e.g., Grilled Chicken Salad"
                      style={{ padding: "10px", width: "100%" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                      Amount (Grams) <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={grams}
                      onChange={(e) => setGrams(e.target.value)}
                      placeholder="e.g., 200"
                      style={{ padding: "10px", width: "100%" }}
                      required
                    />
                  </div>
                </div>
                
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                  <h4 style={{ marginTop: 0, marginBottom: "12px", color: "#374151" }}>Nutrient Values (per 100g)</h4>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
                    Enter nutrient values per 100g of food. Leave as 0 if you don't know the value.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                        Calories (kcal)
                      </label>
                      <input
                        type="number"
                        value={customFood.calories}
                        onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value || 0 })}
                        placeholder="e.g., 165"
                        style={{ padding: "10px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                        Protein (grams)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFood.protein_g}
                        onChange={(e) => setCustomFood({ ...customFood, protein_g: e.target.value || 0 })}
                        placeholder="e.g., 31.0"
                        style={{ padding: "10px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                        Iron (milligrams)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFood.iron_mg}
                        onChange={(e) => setCustomFood({ ...customFood, iron_mg: e.target.value || 0 })}
                        placeholder="e.g., 0.9"
                        style={{ padding: "10px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                        Vitamin C (milligrams)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFood.vitaminC_mg}
                        onChange={(e) => setCustomFood({ ...customFood, vitaminC_mg: e.target.value || 0 })}
                        placeholder="e.g., 53.2"
                        style={{ padding: "10px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                        Calcium (milligrams)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFood.calcium_mg}
                        onChange={(e) => setCustomFood({ ...customFood, calcium_mg: e.target.value || 0 })}
                        placeholder="e.g., 113.0"
                        style={{ padding: "10px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
                        Vitamin D (IU)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFood.vitaminD_IU}
                        onChange={(e) => setCustomFood({ ...customFood, vitaminD_IU: e.target.value || 0 })}
                        placeholder="e.g., 52.0"
                        style={{ padding: "10px", width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
                
                <button onClick={addEntry} style={{ padding: "12px 24px", alignSelf: "flex-start", background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                  Add Custom Meal
                </button>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  <span style={{ color: "#ef4444" }}>*</span> Required fields. All nutrient values should be per 100g of food. 
                  The system will automatically calculate nutrients based on the amount (grams) you consumed.
                </p>
              </div>
            )}
            
            {entries.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <h4>Today's Meals</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((entry, idx) => {
            let foodName = entry.foodIdOrName;
            if (entry.customFood) {
              foodName = entry.foodIdOrName + " (Custom)";
            } else {
              const food = foods.find(f => f.id === entry.foodIdOrName);
              if (food) foodName = food.name;
            }
            return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          background: entry.customFood ? "#fef3c7" : "#f9fafb",
                          borderRadius: "6px",
                          border: entry.customFood ? "1px solid #fbbf24" : "none"
                        }}
                      >
                        <span style={{ fontWeight: "500" }}>{foodName} - {entry.grams}g</span>
                        <button
                          onClick={() => removeEntry(idx)}
                          style={{ background: "#ef4444", padding: "6px 12px", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        >
                          Remove
                        </button>
                      </div>
            );
          })}
                </div>
              </div>
            )}
      </div>

          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0 }}>Nutrient Intake vs Recommended</h3>
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "top" },
                  title: { display: false }
                }
              }}
            />
      </div>

          {criticalDeficits.length > 0 && (
            <div className="card" style={{ marginBottom: "24px" }}>
              <h3 style={{ marginTop: 0, color: "#ef4444" }}>⚠️ Critical Deficits</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {criticalDeficits.map(([key, d]) => (
                  <div
                    key={key}
                    style={{
                      padding: "12px",
                      background: "#fee2e2",
                      borderRadius: "6px",
                      borderLeft: "4px solid #ef4444"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "600", textTransform: "capitalize" }}>
                        {key.replace(/_/g, " ")}: {d.have.toFixed(1)} / {d.target}
                      </span>
                      <span style={{ color: "#dc2626", fontWeight: "600" }}>
                        Deficit: {d.gap.toFixed(1)}
                      </span>
                    </div>
                    <div style={{ marginTop: "8px", background: "#fff", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, (d.have / d.target) * 100)}%`,
                          height: "100%",
                          background: "#ef4444",
                          transition: "width 0.3s"
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
      </div>
          )}

          {suggestions.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>💡 Personalized Recommendations</h3>
              <p style={{ color: "#6b7280", marginBottom: "16px" }}>
                Based on your current nutrient intake, here are foods that can help close your gaps:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {suggestions.map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: "16px",
                      background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 163, 74, 0.05) 100%)",
                      borderRadius: "8px",
                      border: "1px solid rgba(34, 197, 94, 0.2)"
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "8px" }}>{f.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {f.calories} kcal/100g • {f.protein_g}g protein
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "plan" && (
        <div>
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0 }}>Generate Personalized Diet Plan</h3>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              Get a complete daily meal plan tailored to your age and nutritional needs.
              {healthCondition && (
                <span style={{ color: "#ec4899", fontWeight: "600", display: "block", marginTop: "8px" }}>
                  Your plan will be optimized for {healthCondition}.
                </span>
              )}
            </p>
            <button onClick={generatePlan} style={{ padding: "12px 24px", fontSize: "16px" }}>
              Generate Daily Plan
            </button>
          </div>

          {dailyPlan && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Your Daily Meal Plan</h3>
              {dailyPlan.healthCondition && (
                <div style={{
                  padding: "12px",
                  background: "#fce7f3",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  border: "1px solid #f9a8d4",
                  color: "#831843",
                  fontWeight: "600"
                }}>
                  ✓ Optimized for: {dailyPlan.healthCondition}
                </div>
              )}
              <div style={{ marginBottom: "16px" }}>
                <h4>Meals</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {dailyPlan.meals.map((meal, idx) => {
                    const food = DEFAULT_FOODS.find(f => f.id === meal.foodIdOrName);
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "12px",
                          background: "#f9fafb",
                          borderRadius: "6px",
                          display: "flex",
                          justifyContent: "space-between"
                        }}
                      >
                        <span style={{ fontWeight: "500" }}>
                          {idx + 1}. {food?.name || meal.foodIdOrName} - {meal.grams}g
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <h4>Expected Totals</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginTop: "12px" }}>
                  <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "6px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Calories</div>
                    <div style={{ fontSize: "20px", fontWeight: "600" }}>{dailyPlan.totals.calories.toFixed(0)}</div>
                  </div>
                  <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "6px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Protein</div>
                    <div style={{ fontSize: "20px", fontWeight: "600" }}>{dailyPlan.totals.protein_g.toFixed(1)}g</div>
                  </div>
                  <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "6px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Iron</div>
                    <div style={{ fontSize: "20px", fontWeight: "600" }}>{dailyPlan.totals.iron_mg.toFixed(1)}mg</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "progress" && (
        <div>
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0 }}>Nutrient Progress</h3>
            <Bar
              data={progressData}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100
                  }
                },
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                }
              }}
            />
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Health Insights</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {Object.entries(deficits)
                .filter(([k]) => k !== "calories")
                .map(([key, d]) => {
                  const percentage = d.target > 0 ? (d.have / d.target) * 100 : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "500", textTransform: "capitalize" }}>
                          {key.replace(/_/g, " ")}
                        </span>
                        <span style={{ color: percentage >= 100 ? "#22c55e" : percentage >= 70 ? "#f59e0b" : "#ef4444", fontWeight: "600" }}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ background: "#e5e7eb", borderRadius: "4px", height: "12px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, percentage)}%`,
                            height: "100%",
                            background: percentage >= 100 ? "#22c55e" : percentage >= 70 ? "#f59e0b" : "#ef4444",
                            transition: "width 0.3s"
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                        {d.have.toFixed(1)} / {d.target} {d.gap > 0 && `(Need ${d.gap.toFixed(1)} more)`}
                      </div>
                    </div>
                  );
                })}
            </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default UserDashboard;

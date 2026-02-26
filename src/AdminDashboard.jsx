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

const AdminDashboard = () => {
  const [foods, setFoods] = useState([]);
  const [rdas, setRdas] = useState([]);
  const [users, setUsers] = useState([]);
  const [userHealthData, setUserHealthData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("foods");
  const [stats, setStats] = useState({
    totalFoods: 0,
    totalUsers: 0,
    avgDeficits: {},
    topDeficits: []
  });

  const [newFood, setNewFood] = useState({
    id: "",
    name: "",
    calories: 0,
    protein_g: 0,
    iron_mg: 0,
    vitaminC_mg: 0,
    calcium_mg: 0,
    vitaminD_IU: 0
  });

useEffect(() => {
  let mounted = true;

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [fRes, rRes, uRes, healthRes] = await Promise.all([
        fetch("/api/foods"),
        fetch("/api/rdas"),
        fetch("/api/users"),
        fetch("/api/admin/health-data")
      ]);

      if (!fRes.ok || !rRes.ok || !uRes.ok || !healthRes.ok) {
        throw new Error("Failed to load data");
      }

      const [fJson, rJson, uJson, healthJson] = await Promise.all([
        fRes.json(),
        rRes.json(),
        uRes.json(),
        healthRes.json()
      ]);

      if (!mounted) return;

      setFoods(fJson);
      setRdas(rJson);
      setUsers(uJson);
      setUserHealthData(healthJson.data); // IMPORTANT: .data

      calculateStats(fJson, uJson, healthJson.data);

    } catch (e) {
      setError("Failed to load data");
    } finally {
      if (mounted) setLoading(false);
    }
  }

  load();
  return () => { mounted = false; };
}, []);

  const calculateStats = (foodsList, usersList, healthData) => {
    const deficits = {};
    const deficitCounts = {};
    
    healthData.forEach(record => {
      Object.keys(record.deficits || {}).forEach(key => {
        if (key !== 'calories') {
          if (!deficits[key]) deficits[key] = 0;
          if (!deficitCounts[key]) deficitCounts[key] = 0;
          if (record.deficits[key].gap > 0) {
            deficits[key] += record.deficits[key].gap;
            deficitCounts[key]++;
          }
        }
      });
    });

    const avgDeficits = {};
    Object.keys(deficits).forEach(key => {
      avgDeficits[key] = deficitCounts[key] > 0 ? (deficits[key] / deficitCounts[key]).toFixed(2) : 0;
    });

    const topDeficits = Object.entries(avgDeficits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, value]) => ({ nutrient: key, avgGap: value }));

    setStats({
      totalFoods: foodsList.length,
      totalUsers: usersList.length,
      avgDeficits,
      topDeficits
    });
  };

  const canAddFood = useMemo(() => newFood.id && newFood.name, [newFood]);

  async function addFood() {
    if (!canAddFood) return;
    try {
      setError("");
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newFood,
          calories: Number(newFood.calories) || 0,
          protein_g: Number(newFood.protein_g) || 0,
          iron_mg: Number(newFood.iron_mg) || 0,
          vitaminC_mg: Number(newFood.vitaminC_mg) || 0,
          calcium_mg: Number(newFood.calcium_mg) || 0,
          vitaminD_IU: Number(newFood.vitaminD_IU) || 0
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to add food");
      }
      const created = await res.json();
      setFoods([...foods, created]);
      setNewFood({ id: "", name: "", calories: 0, protein_g: 0, iron_mg: 0, vitaminC_mg: 0, calcium_mg: 0, vitaminD_IU: 0 });
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteFood(id) {
    if (!confirm("Are you sure you want to delete this food?")) return;
    try {
      setError("");
      const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete food");
      setFoods(foods.filter(f => f.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateRda(id, field, value) {
    try {
      setError("");
      const res = await fetch(`/api/rdas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: Number(value) || 0 })
      });
      if (!res.ok) throw new Error("Failed to update RDA");
      const updated = await res.json();
      setRdas(rdas.map(r => r.id === id ? updated : r));
    } catch (e) {
      setError(e.message);
    }
  }

  const nutrientChartData = useMemo(() => {
    const nutrients = ["protein_g", "iron_mg", "vitaminC_mg", "calcium_mg", "vitaminD_IU"];
    const avgGaps = nutrients.map(n => parseFloat(stats.avgDeficits[n] || 0));
    
    return {
      labels: ["Protein (g)", "Iron (mg)", "Vit C (mg)", "Calcium (mg)", "Vit D (IU)"],
      datasets: [{
        label: "Average Deficiency Gap",
        data: avgGaps,
        backgroundColor: [
          "rgba(34, 197, 94, 0.6)",
          "rgba(239, 68, 68, 0.6)",
          "rgba(59, 130, 246, 0.6)",
          "rgba(168, 85, 247, 0.6)",
          "rgba(245, 158, 11, 0.6)"
        ],
        borderColor: [
          "rgba(34, 197, 94, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(168, 85, 247, 1)",
          "rgba(245, 158, 11, 1)"
        ],
        borderWidth: 2
      }]
    };
  }, [stats.avgDeficits]);

  const userDistributionData = useMemo(() => {
    const userCount = users.filter(u => u.role === 'user').length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    
    return {
      labels: ["Users", "Admins"],
      datasets: [{
        data: [userCount, adminCount],
        backgroundColor: ["rgba(34, 197, 94, 0.6)", "rgba(59, 130, 246, 0.6)"],
        borderColor: ["rgba(34, 197, 94, 1)", "rgba(59, 130, 246, 1)"],
        borderWidth: 2
      }]
    };
  }, [users]);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "24px"
      }}>
        <h2 style={{
          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0
        }}>Admin Dashboard</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeTab === "overview" ? "var(--primary)" : "white",
              color: activeTab === "overview" ? "white" : "var(--text)",
              cursor: "pointer"
            }}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab("foods")}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeTab === "foods" ? "var(--primary)" : "white",
              color: activeTab === "foods" ? "white" : "var(--text)",
              cursor: "pointer"
            }}
          >
            Foods
          </button>
          <button 
            onClick={() => setActiveTab("rdas")}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeTab === "rdas" ? "var(--primary)" : "white",
              color: activeTab === "rdas" ? "white" : "var(--text)",
              cursor: "pointer"
            }}
          >
            RDAs
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeTab === "users" ? "var(--primary)" : "white",
              color: activeTab === "users" ? "white" : "var(--text)",
              cursor: "pointer"
            }}
          >
            Users
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>}
      {error && <div style={{ color: "#dc2626", padding: "12px", background: "#fee2e2", borderRadius: "6px", marginBottom: "16px" }}>{error}</div>}

      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="stat-card" style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 163, 74, 0.1) 100%)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid var(--border)"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#22c55e" }}>{stats.totalFoods}</div>
              <div style={{ color: "#6b7280", marginTop: "4px" }}>Total Foods</div>
            </div>
            <div className="stat-card" style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid var(--border)"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6" }}>{stats.totalUsers}</div>
              <div style={{ color: "#6b7280", marginTop: "4px" }}>Total Users</div>
            </div>
            <div className="stat-card" style={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid var(--border)"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ef4444" }}>{userHealthData.length}</div>
              <div style={{ color: "#6b7280", marginTop: "4px" }}>Health Records</div>
            </div>
            <div className="stat-card" style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid var(--border)"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>{stats.topDeficits.length}</div>
              <div style={{ color: "#6b7280", marginTop: "4px" }}>Critical Deficits</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "24px" }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Average Nutrient Deficiencies</h3>
              {stats.topDeficits.length > 0 ? (
                <Bar data={nutrientChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    title: { display: false }
                  }
                }} />
              ) : (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>No deficiency data available</p>
              )}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>User Distribution</h3>
              <Doughnut data={userDistributionData} options={{
                responsive: true,
                plugins: {
                  legend: { position: "bottom" }
                }
              }} />
            </div>
          </div>

          {stats.topDeficits.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Top Critical Deficiencies</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {stats.topDeficits.map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    background: "#f9fafb",
                    borderRadius: "6px"
                  }}>
                    <span style={{ fontWeight: "500" }}>{item.nutrient.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span style={{ color: "#ef4444", fontWeight: "600" }}>Avg Gap: {item.avgGap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {userHealthData.length > 0 && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3 style={{ marginTop: 0 }}>Recent Health Data</h3>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Age</th>
                      <th>Date</th>
                      <th>Deficits</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userHealthData.slice(0, 10).map((record, idx) => {
                      const deficitCount = Object.values(record.deficits || {}).filter(d => d.gap > 0).length;
                      return (
                        <tr key={idx}>
                          <td>{record.userId || "N/A"}</td>
                          <td>{record.age || "N/A"}</td>
                          <td>{new Date(record.timestamp || Date.now()).toLocaleDateString()}</td>
                          <td>{deficitCount} nutrients</td>
                          <td>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              background: deficitCount > 2 ? "#fee2e2" : "#dcfce7",
                              color: deficitCount > 2 ? "#dc2626" : "#16a34a",
                              fontSize: "12px"
                            }}>
                              {deficitCount > 2 ? "Critical" : "Good"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "foods" && (
        <div>
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginTop: 0 }}>Add New Food</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <input
                type="text"
                value={newFood.id}
                onChange={(e) => setNewFood({ ...newFood, id: e.target.value })}
                placeholder="Food ID"
              />
              <input
                type="text"
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                placeholder="Food Name"
              />
              <input
                type="number"
                value={newFood.calories}
                onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                placeholder="Calories (kcal/100g)"
              />
              <input
                type="number"
                value={newFood.protein_g}
                onChange={(e) => setNewFood({ ...newFood, protein_g: e.target.value })}
                placeholder="Protein (g)"
              />
              <input
                type="number"
                value={newFood.iron_mg}
                onChange={(e) => setNewFood({ ...newFood, iron_mg: e.target.value })}
                placeholder="Iron (mg)"
              />
              <input
                type="number"
                value={newFood.vitaminC_mg}
                onChange={(e) => setNewFood({ ...newFood, vitaminC_mg: e.target.value })}
                placeholder="Vitamin C (mg)"
              />
              <input
                type="number"
                value={newFood.calcium_mg}
                onChange={(e) => setNewFood({ ...newFood, calcium_mg: e.target.value })}
                placeholder="Calcium (mg)"
              />
              <input
                type="number"
                value={newFood.vitaminD_IU}
                onChange={(e) => setNewFood({ ...newFood, vitaminD_IU: e.target.value })}
                placeholder="Vitamin D (IU)"
              />
            </div>
            <button onClick={addFood} disabled={!canAddFood} style={{ width: "100%" }}>
              Add Food
            </button>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Food Database ({foods.length} items)</h3>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Calories</th>
                    <th>Protein (g)</th>
                    <th>Iron (mg)</th>
                    <th>Vit C (mg)</th>
                    <th>Calcium (mg)</th>
                    <th>Vit D (IU)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map((f) => (
                    <tr key={f.id}>
                      <td>{f.id}</td>
                      <td style={{ fontWeight: "500" }}>{f.name}</td>
                      <td>{f.calories}</td>
                      <td>{f.protein_g}</td>
                      <td>{f.iron_mg}</td>
                      <td>{f.vitaminC_mg}</td>
                      <td>{f.calcium_mg}</td>
                      <td>{f.vitaminD_IU}</td>
                      <td>
                        <button onClick={() => deleteFood(f.id)} style={{ background: "#ef4444" }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rdas" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recommended Daily Allowances (RDA)</h3>
          <p style={{ color: "#6b7280", marginBottom: "16px" }}>Edit values inline to update recommendations</p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Age Band</th>
                  <th>Calories</th>
                  <th>Protein (g)</th>
                  <th>Iron (mg)</th>
                  <th>Vit C (mg)</th>
                  <th>Calcium (mg)</th>
                  <th>Vit D (IU)</th>
                </tr>
              </thead>
              <tbody>
                {rdas.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: "600" }}>{r.label}</td>
                    <td>
                      <input
                        type="number"
                        defaultValue={r.calories}
                        onBlur={(e) => updateRda(r.id, "calories", e.target.value)}
                        style={{ width: "100px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={r.protein_g}
                        onBlur={(e) => updateRda(r.id, "protein_g", e.target.value)}
                        style={{ width: "100px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={r.iron_mg}
                        onBlur={(e) => updateRda(r.id, "iron_mg", e.target.value)}
                        style={{ width: "100px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={r.vitaminC_mg}
                        onBlur={(e) => updateRda(r.id, "vitaminC_mg", e.target.value)}
                        style={{ width: "100px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={r.calcium_mg}
                        onBlur={(e) => updateRda(r.id, "calcium_mg", e.target.value)}
                        style={{ width: "100px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={r.vitaminD_IU}
                        onBlur={(e) => updateRda(r.id, "vitaminD_IU", e.target.value)}
                        style={{ width: "100px" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>User Management ({users.length} users)</h3>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        background: u.role === "admin" ? "#dbeafe" : "#dcfce7",
                        color: u.role === "admin" ? "#1e40af" : "#166534",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        background: "#dcfce7",
                        color: "#166534",
                        fontSize: "12px"
                      }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

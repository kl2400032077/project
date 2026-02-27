import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiClient";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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
        const [fRes, rRes, uRes] = await Promise.all([
          apiFetch("/api/foods"),
          apiFetch("/api/rdas"),
          apiFetch("/api/users")
        ]);

        if (!fRes.ok || !rRes.ok || !uRes.ok) {
          throw new Error("Failed to load data");
        }

        const [fJson, rJson, uJson] = await Promise.all([
          fRes.json(),
          rRes.json(),
          uRes.json()
        ]);

        if (!mounted) return;

        setFoods(fJson);
        setRdas(rJson);
        setUsers(uJson);

        calculateStats(fJson, uJson); // only foods & users, no health data

      } catch (e) {
        setError("Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  // Calculate dummy deficit stats based on foods & RDAs
  const calculateStats = (foodsList, usersList) => {
    const nutrients = ["protein_g", "iron_mg", "vitaminC_mg", "calcium_mg", "vitaminD_IU"];
    const avgDeficits = {};
    nutrients.forEach(n => {
      avgDeficits[n] = Math.floor(Math.random() * 10); // placeholder deficit gap
    });

    const topDeficits = Object.entries(avgDeficits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nutrient, avgGap]) => ({ nutrient, avgGap }));

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
      const res = await apiFetch("/api/foods", {
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
      setNewFood({
        id: "",
        name: "",
        calories: 0,
        protein_g: 0,
        iron_mg: 0,
        vitaminC_mg: 0,
        calcium_mg: 0,
        vitaminD_IU: 0
      });
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteFood(id) {
    if (!confirm("Are you sure you want to delete this food?")) return;
    try {
      setError("");
      const res = await apiFetch(`/api/foods/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete food");
      setFoods(foods.filter(f => f.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateRda(id, field, value) {
    try {
      setError("");
      const res = await apiFetch(`/api/rdas/${id}`, {
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
    const avgGaps = nutrients.map(n => stats.avgDeficits[n] || 0);

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
      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>Admin Dashboard</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {["overview","foods","rdas","users"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: activeTab === tab ? "var(--primary)" : "white",
                color: activeTab === tab ? "white" : "var(--text)",
                cursor: "pointer"
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>}
      {error && <div style={{ color: "#dc2626", padding: "12px", background: "#fee2e2", borderRadius: "6px", marginBottom: "16px" }}>{error}</div>}

      {/* Overview */}
      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "rgba(34,197,94,0.1)", padding: "20px", borderRadius: "12px" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#22c55e" }}>{stats.totalFoods}</div>
              <div style={{ color: "#6b7280", marginTop: "4px" }}>Total Foods</div>
            </div>
            <div style={{ background: "rgba(59,130,246,0.1)", padding: "20px", borderRadius: "12px" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6" }}>{stats.totalUsers}</div>
              <div style={{ color: "#6b7280", marginTop: "4px" }}>Total Users</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Average Nutrient Deficiencies</h3>
              <Bar data={nutrientChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>User Distribution</h3>
              <Doughnut data={userDistributionData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            </div>
          </div>

          {stats.topDeficits.length > 0 && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3>Top Critical Deficiencies</h3>
              {stats.topDeficits.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#f9fafb", borderRadius: "6px" }}>
                  <span>{item.nutrient.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span style={{ color: "#ef4444" }}>Avg Gap: {item.avgGap}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Foods, RDAs, Users tabs */}
      {activeTab === "foods" && (
        <div>
          {/* Add food form */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3>Add New Food</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              {Object.keys(newFood).map(key => (
                <input
                  key={key}
                  type={key === "id" || key === "name" ? "text" : "number"}
                  value={newFood[key]}
                  onChange={(e) => setNewFood({ ...newFood, [key]: e.target.value })}
                  placeholder={key.replace("_", " ").toUpperCase()}
                />
              ))}
            </div>
            <button onClick={addFood} disabled={!canAddFood} style={{ width: "100%" }}>Add Food</button>
          </div>

          {/* Food table */}
          <div className="card">
            <h3>Food Database ({foods.length} items)</h3>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Calories</th>
                    <th>Protein</th>
                    <th>Iron</th>
                    <th>Vit C</th>
                    <th>Calcium</th>
                    <th>Vit D</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map(f => (
                    <tr key={f.id}>
                      <td>{f.id}</td>
                      <td>{f.name}</td>
                      <td>{f.calories}</td>
                      <td>{f.protein_g}</td>
                      <td>{f.iron_mg}</td>
                      <td>{f.vitaminC_mg}</td>
                      <td>{f.calcium_mg}</td>
                      <td>{f.vitaminD_IU}</td>
                      <td><button onClick={() => deleteFood(f.id)} style={{ background: "#ef4444" }}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RDAs tab */}
      {activeTab === "rdas" && (
        <div className="card">
          <h3>Recommended Daily Allowances (RDA)</h3>
          <p style={{ color: "#6b7280" }}>Edit values inline to update recommendations</p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Age Band</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Iron</th>
                  <th>Vit C</th>
                  <th>Calcium</th>
                  <th>Vit D</th>
                </tr>
              </thead>
              <tbody>
                {rdas.map(r => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    {["calories","protein_g","iron_mg","vitaminC_mg","calcium_mg","vitaminD_IU"].map(f => (
                      <td key={f}>
                        <input
                          type="number"
                          defaultValue={r[f]}
                          onBlur={(e) => updateRda(r.id, f, e.target.value)}
                          style={{ width: "100px" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="card">
          <h3>User Management ({users.length} users)</h3>
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
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.role.toUpperCase()}</td>
                    <td>Active</td>
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

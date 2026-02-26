export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Example dummy data — replace with DB later
    const healthData = [
      {
        id: 1,
        user: "john@example.com",
        calories: 2200,
        protein: 90,
        carbs: 250,
        fat: 70,
      },
      {
        id: 2,
        user: "sarah@example.com",
        calories: 1800,
        protein: 75,
        carbs: 200,
        fat: 60,
      },
    ];

    res.status(200).json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to load health data",
    });
  }
}
export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      data: [
        {
          id: 1,
          name: "Apple",
          calories: 95,
          protein: 0.5,
          iron: 0.1,
          vitaminC: 8.4,
          calcium: 11,
          vitaminD: 0,
        },
        {
          id: 2,
          name: "Banana",
          calories: 105,
          protein: 1.3,
          iron: 0.3,
          vitaminC: 10.3,
          calcium: 5,
          vitaminD: 0,
        },
      ],
    });
  }

  if (req.method === "POST") {
    return res.status(200).json({
      success: true,
      message: "Food added (temporary mock)",
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "users.json");

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  return res.status(200).json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
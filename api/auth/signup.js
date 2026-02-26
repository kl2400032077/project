import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "users.json");

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = {
    id: Date.now(),
    email,
    password,
    role: role || "user",
  };

  users.push(newUser);

  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

  return res.status(200).json({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });
}
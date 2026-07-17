import { Router } from "express";

const router = Router();

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const configuredUsername = process.env.LEGACY_ADMIN_USERNAME;
  const configuredPassword = process.env.LEGACY_ADMIN_PASSWORD;

  if (!configuredUsername || !configuredPassword) {
    return res.status(503).json({
      success: false,
      message: "Legacy admin login is not configured",
    });
  }

  if (username === configuredUsername && password === configuredPassword) {
    return res.json({
      success: true,
      message: "Admin login success",
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });
});

export default router;

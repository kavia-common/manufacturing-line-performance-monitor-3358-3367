const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const { getConfig } = require("../config");
const { HttpError } = require("../middleware/errors");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["operator", "supervisor", "manager", "admin"]).optional(),
});

// PUBLIC_INTERFACE
router.post("/login", (req, res, next) => {
  /** Authenticates a user and returns {token, user, role}. */
  const config = getConfig();
  try {
    const parsed = LoginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new HttpError(400, "Invalid login payload", parsed.error.flatten());
    }

    const { email, role } = parsed.data;

    // Demo mode: if no JWT secret, return empty token (frontend tolerates this) but include role.
    if (!config.jwt.secret) {
      return res.json({
        token: "",
        role: role || "operator",
        user: { id: email, name: email.split("@")[0], email },
        demo: true,
      });
    }

    // Minimal auth: accept any password (for demo). Replace with real user DB if needed.
    const userRole = role || "operator";
    const user = { id: email, name: email.split("@")[0], email, role: userRole };

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }
    );

    return res.json({ token, role: user.role, user });
  } catch (e) {
    return next(e);
  }
});

// PUBLIC_INTERFACE
router.get("/me", requireAuth(), (req, res) => {
  /** Returns current authenticated user (based on Bearer token or demo mode). */
  res.json({ user: req.user });
});

module.exports = router;

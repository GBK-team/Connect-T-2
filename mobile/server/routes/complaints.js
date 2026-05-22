const express = require("express");
const db = require("../db");

const router = express.Router();

function normalizeMobile(mobile) {
  return String(mobile || "").replace(/\D/g, "");
}

function normalizeStatus(status) {
  const allowed = [
    "submitted",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
  ];
  return allowed.includes(status) ? status : "submitted";
}

router.get("/", async (req, res) => {
  try {
    const role = req.query.role || "citizen";
    const mobile = normalizeMobile(req.query.mobile);
    const ward = req.query.ward || "";

    let sql = "SELECT * FROM complaints";
    const params = [];

    if (role === "citizen") {
      sql += " WHERE user_mobile = ?";
      params.push(mobile);
    } else if (role === "nagarsevak") {
      sql += " WHERE ward = ?";
      params.push(ward);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);

    res.json({
      success: true,
      complaints: rows,
    });
  } catch (error) {
    console.error("Load complaints failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load complaints",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM complaints WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const [timeline] = await db.query(
      "SELECT * FROM complaint_timeline WHERE complaint_id = ? ORDER BY created_at ASC",
      [req.params.id],
    );

    res.json({
      success: true,
      complaint: {
        ...rows[0],
        timeline,
      },
    });
  } catch (error) {
    console.error("Load complaint detail failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load complaint",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = "CMP" + Date.now();

    const {
      title,
      description,
      category,
      photoUri,
      location,
      ward,
      userName,
      userMobile,
      userAddress,
      userAge,
      userEmail,
    } = req.body;

    await db.query(
      `
      INSERT INTO complaints (
        id,
        title,
        description,
        category,
        photo_url,
        location,
        ward,
        status,
        user_name,
        user_mobile,
        user_address,
        user_age,
        user_email,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        id,
        title || "",
        description || "",
        category || "other",
        photoUri || null,
        location || "",
        ward || "",
        userName || null,
        normalizeMobile(userMobile),
        userAddress || null,
        userAge || null,
        userEmail || null,
      ],
    );

    await db.query(
      `
      INSERT INTO complaint_timeline (
        complaint_id,
        status,
        note,
        updated_by,
        created_at
      )
      VALUES (?, 'submitted', 'Complaint registered successfully', 'System', NOW())
      `,
      [id],
    );

    res.json({
      success: true,
      complaintId: id,
    });
  } catch (error) {
    console.error("Create complaint failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create complaint",
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);
    const note = req.body.note || "Status updated";
    const updatedBy = req.body.updated_by || req.body.updatedBy || "Officer";
    const assignedTo = req.body.assigned_to;
    const resolvedNote = req.body.resolved_note;

    await db.query(
      `
      UPDATE complaints
      SET
        status = ?,
        assigned_to = COALESCE(?, assigned_to),
        resolved_note = COALESCE(?, resolved_note),
        updated_at = NOW()
      WHERE id = ?
      `,
      [status, assignedTo || null, resolvedNote || null, req.params.id],
    );

    await db.query(
      `
      INSERT INTO complaint_timeline (
        complaint_id,
        status,
        note,
        updated_by,
        created_at
      )
      VALUES (?, ?, ?, ?, NOW())
      `,
      [req.params.id, status, note, updatedBy],
    );

    res.json({
      success: true,
      message: "Complaint status updated",
    });
  } catch (error) {
    console.error("Update complaint status failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update complaint status",
    });
  }
});

router.put("/:id/status", async (req, res) => {
  req.body.updated_by = req.body.updatedBy || req.body.updated_by;
  return router.handle(req, res);
});

module.exports = router;

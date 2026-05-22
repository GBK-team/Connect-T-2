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

async function detectWardAndOfficer(location, ward) {
  try {
    if (ward) {
      const [officerRows] = await db.query(
        `
        SELECT id, name, ward_code
        FROM officers
        WHERE ward = ?
          AND role = 'nagarsevak'
          AND approval_status = 'approved'
        LIMIT 1
        `,
        [ward],
      );

      return {
        ward,
        wardCode: officerRows[0]?.ward_code || null,
        assignedOfficerId: officerRows[0]?.id || null,
        assignedTo: officerRows[0]?.name || null,
      };
    }

    const [rows] = await db.query(
      `
      SELECT ward_code, ward_name, assigned_officer_id
      FROM ward_locations
      WHERE LOWER(area_name) = LOWER(?)
      LIMIT 1
      `,
      [location || ""],
    );

    if (!rows.length) {
      return {
        ward: "Unassigned",
        wardCode: null,
        assignedOfficerId: null,
        assignedTo: null,
      };
    }

    const wardData = rows[0];

    const [officerRows] = await db.query(
      `
      SELECT id, name
      FROM officers
      WHERE id = ?
      LIMIT 1
      `,
      [wardData.assigned_officer_id],
    );

    return {
      ward: wardData.ward_name || wardData.ward_code,
      wardCode: wardData.ward_code || null,
      assignedOfficerId: wardData.assigned_officer_id || null,
      assignedTo: officerRows[0]?.name || null,
    };
  } catch (error) {
    console.log("Ward detection failed:", error);

    return {
      ward: ward || "Unassigned",
      wardCode: null,
      assignedOfficerId: null,
      assignedTo: null,
    };
  }
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
      `
      SELECT *
      FROM complaint_timeline
      WHERE complaint_id = ?
      ORDER BY created_at ASC
      `,
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

    const assignment = await detectWardAndOfficer(location, ward);

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
        ward_code,
        assigned_officer_id,
        assigned_to,
        status,
        user_name,
        user_mobile,
        user_address,
        user_age,
        user_email,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        id,
        title || "",
        description || "",
        category || "other",
        photoUri || null,
        location || "",
        assignment.ward || ward || "",
        assignment.wardCode || null,
        assignment.assignedOfficerId || null,
        assignment.assignedTo || null,
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

    if (assignment.assignedOfficerId) {
      await db.query(
        `
        INSERT INTO complaint_timeline (
          complaint_id,
          status,
          note,
          updated_by,
          created_at
        )
        VALUES (?, 'assigned', ?, 'System', NOW())
        `,
        [id, `Auto assigned to ${assignment.assignedTo || "ward officer"}`],
      );

      await db.query(
        `
        UPDATE complaints
        SET status = 'assigned',
            updated_at = NOW()
        WHERE id = ?
        `,
        [id],
      );
    }

    res.json({
      success: true,
      complaintId: id,
      assignment,
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
    const assignedTo = req.body.assigned_to || null;
    const resolvedNote = req.body.resolved_note || null;

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
      [status, assignedTo, resolvedNote, req.params.id],
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
  req.method = "PATCH";
  router.handle(req, res);
});

module.exports = router;

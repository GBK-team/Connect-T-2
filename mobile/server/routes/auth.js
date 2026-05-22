const express = require("express");
const router = express.Router();
const db = require("../db");

function normalizeMobile(mobile) {
  return String(mobile || "").replace(/\D/g, "");
}

function makeOfficerId() {
  return "NGS" + Date.now();
}

router.post("/login-phone", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Valid mobile number is required",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        mobile,
        ward,
        ward_code AS wardCode,
        role,
        is_super_admin AS isSuperAdmin,
        approval_status AS approvalStatus,
        office_address AS officeAddress,
        residence_address AS residenceAddress,
        office_timings AS officeTimings,
        contact_name AS contactName,
        contact_number AS contactNumber,
        profile_photo AS profilePhoto
      FROM officers
      WHERE mobile = ?
      LIMIT 1
      `,
      [mobile],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Officer account not found",
      });
    }

    const officer = rows[0];

    if (officer.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message:
          officer.approvalStatus === "pending"
            ? "Your account is pending approval"
            : "Your account has been rejected",
        approvalStatus: officer.approvalStatus,
      });
    }

    return res.json({
      success: true,
      user: {
        id: officer.id,
        name: officer.name,
        mobile: officer.mobile,
        role: officer.role,
        ward: officer.ward,
        wardCode: officer.wardCode,
        nagarsevakId: officer.id,
        isSuperAdmin: !!officer.isSuperAdmin,
        officeAddress: officer.officeAddress,
        residenceAddress: officer.residenceAddress,
        officeTimings: officer.officeTimings,
        contactName: officer.contactName,
        contactNumber: officer.contactNumber,
        profilePhoto: officer.profilePhoto,
      },
    });
  } catch (err) {
    console.error("Officer login error:", err);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

router.post("/register-officer", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);

    if (!req.body.name || !mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Name and valid mobile number are required",
      });
    }

    const [existing] = await db.query(
      "SELECT id, approval_status FROM officers WHERE mobile = ? LIMIT 1",
      [mobile],
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message:
          existing[0].approval_status === "pending"
            ? "Registration already submitted and pending approval"
            : "Officer already registered",
        approvalStatus: existing[0].approval_status,
      });
    }

    const id = makeOfficerId();

    await db.query(
      `
      INSERT INTO officers (
        id,
        name,
        mobile,
        ward,
        ward_code,
        role,
        is_super_admin,
        approval_status,
        office_address,
        residence_address,
        office_timings,
        contact_name,
        contact_number,
        profile_photo
      )
      VALUES (?, ?, ?, ?, ?, 'nagarsevak', 0, 'pending', ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        req.body.name.trim(),
        mobile,
        req.body.ward || "Pending Ward Assignment",
        req.body.wardCode || null,
        req.body.officeAddress || null,
        req.body.residenceAddress || null,
        req.body.officeTimings || null,
        req.body.contactName || null,
        req.body.contactNumber || null,
        req.body.profilePhoto || null,
      ],
    );

    return res.json({
      success: true,
      message: "Nagarsevak registration submitted for approval",
      officerId: id,
      approvalStatus: "pending",
    });
  } catch (err) {
    console.error("Officer registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Officer registration failed",
    });
  }
});

router.get("/pending-officers", async (req, res) => {
  try {
    const adminMobile = normalizeMobile(req.query.adminMobile);

    const [adminRows] = await db.query(
      `
      SELECT id FROM officers
      WHERE mobile = ?
        AND role = 'super_admin'
        AND is_super_admin = 1
        AND approval_status = 'approved'
      LIMIT 1
      `,
      [adminMobile],
    );

    if (!adminRows.length) {
      return res.status(403).json({
        success: false,
        message: "Super admin access required",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        mobile,
        ward,
        ward_code AS wardCode,
        role,
        approval_status AS approvalStatus,
        office_address AS officeAddress,
        residence_address AS residenceAddress,
        office_timings AS officeTimings,
        contact_name AS contactName,
        contact_number AS contactNumber,
        profile_photo AS profilePhoto,
        created_at AS createdAt
      FROM officers
      WHERE approval_status = 'pending'
      ORDER BY created_at DESC
      `,
    );

    return res.json({
      success: true,
      officers: rows,
    });
  } catch (err) {
    console.error("Pending officers error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load pending officers",
    });
  }
});

router.patch("/officers/:id/approval", async (req, res) => {
  try {
    const adminMobile = normalizeMobile(req.body.adminMobile);
    const status = req.body.status;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval status",
      });
    }

    const [adminRows] = await db.query(
      `
      SELECT id FROM officers
      WHERE mobile = ?
        AND role = 'super_admin'
        AND is_super_admin = 1
        AND approval_status = 'approved'
      LIMIT 1
      `,
      [adminMobile],
    );

    if (!adminRows.length) {
      return res.status(403).json({
        success: false,
        message: "Super admin access required",
      });
    }

    await db.query(
      `
      UPDATE officers
      SET approval_status = ?
      WHERE id = ?
        AND role = 'nagarsevak'
      `,
      [status, req.params.id],
    );

    return res.json({
      success: true,
      message:
        status === "approved"
          ? "Nagarsevak approved successfully"
          : "Nagarsevak rejected successfully",
    });
  } catch (err) {
    console.error("Approval update error:", err);
    return res.status(500).json({
      success: false,
      message: "Approval update failed",
    });
  }
});
router.post("/register-citizen", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);

    if (!req.body.name || !mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Name and valid mobile number required",
      });
    }

    const [existing] = await db.query(
      `
      SELECT id
      FROM citizens
      WHERE mobile = ?
      LIMIT 1
      `,
      [mobile],
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "Citizen already registered",
      });
    }

    const id = "CTZ" + Date.now();

    await db.query(
      `
      INSERT INTO citizens (
        id,
        full_name,
        mobile,
        email,
        gender,
        dob,
        address,
        ward,
        pincode,
        whatsapp_notifications,
        email_notifications,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        id,
        req.body.name || "",
        mobile,
        req.body.email || null,
        req.body.gender || null,
        req.body.dob || null,
        req.body.address || null,
        req.body.ward || null,
        req.body.pincode || null,
        req.body.whatsappNotifications ? 1 : 0,
        req.body.emailNotifications ? 1 : 0,
      ],
    );

    return res.json({
      success: true,
      citizenId: id,
      message: "Citizen registered successfully",
    });
  } catch (err) {
    console.error("Citizen registration error:", err);

    return res.status(500).json({
      success: false,
      message: "Citizen registration failed",
    });
  }
});

router.post("/citizen-login", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);

    const [rows] = await db.query(
      `
      SELECT
        id,
        full_name AS name,
        mobile,
        email,
        gender,
        dob,
        address,
        ward,
        pincode
      FROM citizens
      WHERE mobile = ?
      LIMIT 1
      `,
      [mobile],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Citizen account not found",
      });
    }

    const citizen = rows[0];

    return res.json({
      success: true,
      user: {
        id: citizen.id,
        role: "citizen",
        name: citizen.name,
        mobile: citizen.mobile,
        email: citizen.email,
        gender: citizen.gender,
        dob: citizen.dob,
        address: citizen.address,
        ward: citizen.ward,
        pincode: citizen.pincode,
      },
    });
  } catch (err) {
    console.error("Citizen login error:", err);

    return res.status(500).json({
      success: false,
      message: "Citizen login failed",
    });
  }
});
module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

function normalizeMobile(mobile) {
  return String(mobile || "").replace(/\D/g, "");
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

module.exports = router;

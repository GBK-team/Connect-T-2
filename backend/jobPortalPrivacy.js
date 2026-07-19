"use strict";

function canViewEmployerContact(viewer, employerId) {
  return viewer?.role === "super_admin" ||
    (viewer?.role === "employer" && String(viewer.sub || "") === String(employerId || ""));
}

function redactJobContact(row, viewer) {
  if (canViewEmployerContact(viewer, row?.employer_id)) return row;
  return { ...row, employer_phone: null, employer_whatsapp: null };
}

function redactApplicationContact(row, viewer) {
  if (viewer?.role !== "seeker") return row;
  return { ...row, employer_phone: null, employer_whatsapp: null };
}

module.exports = {
  canViewEmployerContact,
  redactApplicationContact,
  redactJobContact,
};

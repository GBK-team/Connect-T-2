"use strict";

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function validateCoordinates(latitudeValue, longitudeValue, accuracyValue) {
  const latitude = optionalNumber(latitudeValue);
  const longitude = optionalNumber(longitudeValue);
  const accuracy = optionalNumber(accuracyValue);
  const supplied = latitude !== null || longitude !== null || accuracy !== null;

  if (!supplied) return { valid: true, latitude: null, longitude: null, accuracy: null };
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { valid: false, message: "Valid latitude and longitude are required together." };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { valid: false, message: "Complaint coordinates are outside the valid GPS range." };
  }
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000)) {
    return { valid: false, message: "Location accuracy is invalid." };
  }

  return { valid: true, latitude, longitude, accuracy };
}

function isIsoDate(value) {
  const input = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const date = new Date(`${input}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === input;
}

module.exports = {
  isIsoDate,
  optionalNumber,
  validateCoordinates,
};

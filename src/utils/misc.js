import { normalizeAngle } from "./geometry";

/**
 * Replaces dots with commas in numeric string values of an object
 * @param {Object} datapoint - An object containing numeric string values
 * @returns {Object} A new object with dots replaced by commas in numeric string values
 */
const replaceDotWithComma = (datapoint) => {
  const newDatapoint = {};
  for (const [key, value] of Object.entries(datapoint)) {
    if (typeof value === "string" && !isNaN(Number(value.replace(",", ".")))) {
      newDatapoint[key] = value.replace(".", ",");
    } else {
      newDatapoint[key] = value;
    }
  }
  return newDatapoint;
};

const getFacadeName = (segment, index, angleAdjustment) => {
  const adjustedAngle = normalizeAngle(segment.angle, angleAdjustment);

  if (
    (adjustedAngle >= 350 && adjustedAngle <= 360) ||
    (adjustedAngle >= 0 && adjustedAngle < 10)
  ) {
    return `${index + 1} Nord`;
  } else if (adjustedAngle >= 10 && adjustedAngle < 80) {
    return `${index + 1} Nord-Øst`;
  } else if (adjustedAngle >= 80 && adjustedAngle < 100) {
    return `${index + 1} Øst`;
  } else if (adjustedAngle >= 100 && adjustedAngle < 170) {
    return `${index + 1} Sør-Øst`;
  } else if (adjustedAngle >= 170 && adjustedAngle < 190) {
    return `${index + 1} Sør`;
  } else if (adjustedAngle >= 190 && adjustedAngle < 260) {
    return `${index + 1} Sør-Vest`;
  } else if (adjustedAngle >= 260 && adjustedAngle < 280) {
    return `${index + 1} Vest`;
  } else if (adjustedAngle >= 280 && adjustedAngle < 350) {
    return `${index + 1} Nord-Vest`;
  }

  // This should never happen, but just in case
  return `Fasade ${index + 1}`;
};

/**
 * Generates a random number between 1 and 10000000
 */
const generateRandomNumber = () => {
  return Math.floor(Math.random() * 10000000) + 1;
};

export { replaceDotWithComma, generateRandomNumber, getFacadeName };

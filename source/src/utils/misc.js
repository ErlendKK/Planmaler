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

const getFacadeName = (segment, adjustedAngle) => {
  if (
    (adjustedAngle >= 350 && adjustedAngle <= 360) ||
    (adjustedAngle >= 0 && adjustedAngle < 10)
  ) {
    return `${segment.number} Nord`;
  } else if (adjustedAngle >= 10 && adjustedAngle < 80) {
    return `${segment.number} Nord-Øst`;
  } else if (adjustedAngle >= 80 && adjustedAngle < 100) {
    return `${segment.number} Øst`;
  } else if (adjustedAngle >= 100 && adjustedAngle < 170) {
    return `${segment.number} Sør-Øst`;
  } else if (adjustedAngle >= 170 && adjustedAngle < 190) {
    return `${segment.number} Sør`;
  } else if (adjustedAngle >= 190 && adjustedAngle < 260) {
    return `${segment.number} Sør-Vest`;
  } else if (adjustedAngle >= 260 && adjustedAngle < 280) {
    return `${segment.number} Vest`;
  } else if (adjustedAngle >= 280 && adjustedAngle < 350) {
    return `${segment.number} Nord-Vest`;
  } else {
    // This should never happen, but just incase
    console.warn("Invalid angle:", adjustedAngle);
    return `Fasade ${segment.number + 1}`;
  }
};

/**
 * Generates a random number between 1 and 10000000
 */
const generateRandomNumber = () => {
  return Math.floor(Math.random() * 10000000) + 1;
};

export { replaceDotWithComma, generateRandomNumber, getFacadeName };

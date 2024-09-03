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

/**
 * Generates a random number between 1 and 100000
 */
const generateRandomNumber = () => {
  return Math.floor(Math.random() * 100000) + 1;
};

export { replaceDotWithComma, generateRandomNumber };

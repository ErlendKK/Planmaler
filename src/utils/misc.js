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

export { replaceDotWithComma };

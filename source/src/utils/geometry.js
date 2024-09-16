import { TEST_POINT_OFFSET, ORIENTATION_TOLERANCE } from "../constants/line-drawer-constants";

/**
 * Determines the direction of diagonal lines
 * @param {Object} start - Start point of the line
 * @param {Object} end - End point of the line
 * @returns {string} Direction of the diagonal line
 */
function getDiagonalDirection(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Check if the line is actually diagonal
  if (Math.abs(dx) === Math.abs(dy)) {
    if ((dx > 0 && dy < 0) || (dx < 0 && dy > 0)) {
      return "top-right to bottom-left";
    } else {
      return "top-left to bottom-right";
    }
  } else {
    return "not diagonal";
  }
}

/**
 * Determines the type of line (horizontal, vertical, or diagonal)
 * @param {number} dx - Difference in x coordinates
 * @param {number} dy - Difference in y coordinates
 * @returns {string} Line type
 */
const getLineType = (dx, dy) => {
  if (Math.abs(dx) > Math.abs(dy) * ORIENTATION_TOLERANCE) {
    return "horizontal";
  } else if (Math.abs(dy) > Math.abs(dx) * ORIENTATION_TOLERANCE) {
    return "vertical";
  } else {
    return "diagonal";
  }
};

/**
 * Normalizes an angle to be between 0 and 360 degrees
 * @param {number} angle - The angle to normalize
 * @returns {number} The normalized angle
 */
const normalizeAngle = (angle) => {
  if (typeof angle !== "number" || isNaN(angle)) {
    console.warn("Invalid angle:", angle);
    return NaN;
  }
  while (angle < 0) {
    angle += 360;
  }
  while (angle >= 360) {
    angle -= 360;
  }
  return angle;
};

/**
 * Calculates the length between two points
 * @param {Object} point1 - First point
 * @param {Object} point2 - Second point
 * @returns {number} Length between points
 */
const calculateLength = (point1, point2, lengthMultiplier) => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy) * lengthMultiplier;
};

/**
 * Checks if a point is inside a polygon
 * @param {Object} point - Point to check
 * @param {Array} polygon - Array of points forming the polygon
 * @returns {boolean} True if point is inside polygon
 */
const isPointInPolygon = (point, polygon) => {
  let windingNumber = 0;
  for (let i = 0; i < polygon.length; i++) {
    let p1 = polygon[i];
    let p2 = polygon[(i + 1) % polygon.length];
    if (p1.y <= point.y) {
      if (p2.y > point.y && isLeft(p1, p2, point) > 0) {
        windingNumber++;
      }
    } else {
      if (p2.y <= point.y && isLeft(p1, p2, point) < 0) {
        windingNumber--;
      }
    }
  }
  return windingNumber !== 0;
};

/**
 * Helper function for isPointInPolygon
 */
const isLeft = (p1, p2, point) => {
  return (p2.x - p1.x) * (point.y - p1.y) - (point.x - p1.x) * (p2.y - p1.y);
};

/**
 * Determines if the drawing is clockwise or counterclockwise
 * @param {Array} points - Array of points in the drawing
 * @returns {string} Drawing direction
 */
function getDrawingDirection(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += (next.x - current.x) * (next.y + current.y);
  }
  //  negative sum means clockwise
  return sum < 0 ? "clockwise" : "counterclockwise";
}

/**
 * Handles orientation for vertical and horizontal lines
 * @param {Object} midPoint - Midpoint of the line
 * @param {string} lineType - Type of line
 * @param {Array} polygon - Array of points forming the polygon
 * @returns {number} Angle of the line
 */
const handleVerticalAndHorizontalLines = (midPoint, lineType, polygon) => {
  // Horizontal: if the point is inside the polygon, the line faces North, otherwise South
  if (lineType === "horizontal") {
    const testPoint = { x: midPoint.x, y: midPoint.y + TEST_POINT_OFFSET };
    return isPointInPolygon(testPoint, polygon) ? 0 : 180;
  }
  // Vertical: if the point is inside the polygon, the line faces West, otherwise East
  const testPoint = { x: midPoint.x + TEST_POINT_OFFSET, y: midPoint.y };
  return isPointInPolygon(testPoint, polygon) ? 270 : 90;
};

/**
 * Determines the orientation of a line segment
 * @param {Object} startPoint - Start point of the line
 * @param {Object} endPoint - End point of the line
 * @param {Array} polygon - Array of points forming the polygon
 * @returns {number} Angle of the line segment
 */
const determineOrientation = (startPoint, endPoint, polygon, roundAngleTo) => {
  let angle;
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  const midPoint = {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2,
  };

  const lineType = getLineType(dx, dy);

  //Handle horizontal and vertical lines separately
  if (lineType === "horizontal" || lineType === "vertical") {
    angle = handleVerticalAndHorizontalLines(midPoint, lineType, polygon);
  } else {
    // Handle diagonal lines
    const perpendicularDx = -dy / length;
    const perpendicularDy = dx / length;
    const drawingDirection = getDrawingDirection(polygon);
    const angleOffset = drawingDirection === "clockwise" ? 90 : -90;
    console.log("Drawing direction:", drawingDirection);

    // Calculate the angle of the perpendicular line and normalize to 0-360 degrees
    angle = Math.atan2(perpendicularDy, perpendicularDx) * (180 / Math.PI);
    angle = (angle + 360 - angleOffset) % 360;
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
  }

  // Round the angle
  const roundedAngle = roundAngle(angle, roundAngleTo);
  return roundedAngle;
};

/**
 * Calculates the area of a polygon from line segments
 * @param {Array} lines - Array of line segment coordinates
 * @returns {number} The calculated area
 */
const calculatePolygonAreaFromLines = (lines) => {
  // Extract unique vertices from lines
  const extractVertices = (lines) => {
    const vertices = new Set();
    lines.forEach((line) => {
      vertices.add(`${line.startX},${line.startY}`);
      vertices.add(`${line.endX},${line.endY}`);
    });
    return Array.from(vertices).map((v) => {
      const [x, y] = v.split(",").map(Number);
      return { x, y };
    });
  };

  // Order vertices clockwise around centroid
  const orderVertices = (vertices) => {
    const centroid = vertices.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), {
      x: 0,
      y: 0,
    });
    centroid.x /= vertices.length;
    centroid.y /= vertices.length;
    return vertices.sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
      return angleA - angleB;
    });
  };

  // Calculate polygon area using shoelace formula
  const calculatePolygonArea = (vertices) => {
    let area = 0;
    const numVertices = vertices.length;
    for (let i = 0; i < numVertices; i++) {
      const j = (i + 1) % numVertices;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2);
  };

  const vertices = extractVertices(lines);
  const orderedVertices = orderVertices(vertices);
  return calculatePolygonArea(orderedVertices);
};

/**
 * Rounds an angle to the nearest multiple of roundAngleTo
 * @param {number} angle - The angle to round
 * @returns {number} The rounded angle
 */
const roundAngle = (angle, roundAngleTo) => {
  if (!roundAngleTo) return angle;
  return Math.round(angle / roundAngleTo) * roundAngleTo;
};

export {
  getDiagonalDirection,
  getLineType,
  normalizeAngle,
  calculateLength,
  isPointInPolygon,
  getDrawingDirection,
  calculatePolygonAreaFromLines,
  roundAngle,
  determineOrientation,
};

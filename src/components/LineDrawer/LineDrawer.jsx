import React, { useState, useCallback, useEffect } from "react";
import { Stage, Container, Text, Graphics, Sprite } from "@pixi/react";
import { TextStyle, Texture, Graphics as PIXIGraphics } from "pixi.js";
import {
  getLineType,
  calculateLength,
  isPointInPolygon,
  getDrawingDirection,
  roundAngle,
} from "../../utils/geometry";
import { lighten } from "@mantine/core";

// Constants
const SNAP_DISTANCE = 5; // Distance in pixels for snapping
const TEST_POINT_OFFSET = 1; // Offset for test point in point-in-polygon calculation
const ORIENTATION_TOLERANCE = 35; // Tolerance for nearly vertical/horizontal lines
const NUMBER_OF_DECIMALS = 1; // Number of decimals for length
const MAX_CANVAS_WIDTH = 800; // Maximum width of the canvas
const MAX_CANVAS_HEIGHT = 600; // Maximum height of the canvas
const MIN_CALIBRATION_LENGTH = 5; // Minimum length in pixels
const CLICK_SENSITIVITY = 5;

/**
 * LineDrawer Component
 * @param {Object} props - Component props
 * @param {File} props.image - Background image file
 * @param {Function} props.onDrawingComplete - Callback function when drawing is complete
 */
const LineDrawer = ({
  image,
  onDrawingComplete,
  metersPerPixel,
  roundAngleTo,
  drawingColor,
  isCalibrationMode,
  onCalibrationComplete,
  calibrationLineVisible,
  knownMeasurement,
}) => {
  // State declarations
  const [points, setPoints] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [snappedPosition, setSnappedPosition] = useState(null);
  const [message, setMessage] = useState("Klikk for å markere første punkt");
  const [distance, setDistance] = useState(0);
  const [angle, setAngle] = useState(null); // NB! Ikke i bruk lenger. Vurder å droppe.
  const [isDrawing, setIsDrawing] = useState(true);
  const [backgroundTexture, setBackgroundTexture] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [isFinished, setIsFinished] = useState(false);

  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [calibrationLineLength, setCalibrationLineLength] = useState(0);

  // Effect for setting background image and resizing canvas to its aspect ratio
  useEffect(() => {
    if (image) {
      const img = new Image();
      img.onload = () => {
        const texture = Texture.from(img);
        setBackgroundTexture(texture);

        const { newWidth, newHeight } = getNewCanvasDimentions(img);
        setCanvasSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
      };
      img.src = URL.createObjectURL(image);
    }
  }, [image]);

  /**
   * Calculates new canvas dimensions to maintain the aspect ratio of the image
   * while respecting maximum allowed dimensions.
   *
   * @param {HTMLImageElement} img - The image element to base dimensions on
   * @returns {{newWidth: number, newHeight: number}} An object containing the new width and height
   */
  const getNewCanvasDimentions = (img) => {
    const aspectRatio = img.width / img.height;
    let newWidth = img.width;
    let newHeight = img.height;

    if (newWidth > MAX_CANVAS_WIDTH) {
      newWidth = MAX_CANVAS_WIDTH;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > MAX_CANVAS_HEIGHT) {
      newHeight = MAX_CANVAS_HEIGHT;
      newWidth = newHeight * aspectRatio;
    }

    // Ensure width doesn't exceed MAX_CANVAS_WIDTH after height adjustment
    if (newWidth > MAX_CANVAS_WIDTH) {
      newWidth = MAX_CANVAS_WIDTH;
      newHeight = newWidth / aspectRatio;
    }

    return { newWidth, newHeight };
  };

  /********************************************
   *********  DELETE EXISTING LINES   *********
   ********************************************/

  /**
   * Resets the drawing state
   */
  const resetDrawing = () => {
    setPoints([]);
    setIsDrawing(true);
    setMessage("Klikk for å sette første punkt");
    setDistance(0);
    setAngle(null);
  };

  /**
   * Deletes the last point in the drawing
   */
  const deleteLastPoint = () => {
    if (points.length > 0) {
      const newPoints = [...points];
      newPoints.pop();
      setPoints(newPoints);

      if (newPoints.length === 0) {
        setMessage("Klikk for å sette første punkt");
        setDistance(0);
        setAngle(null);
      } else {
        setMessage("Press Enter for å fullføre");
        // Recalculate distance and angle if there are still points
        if (newPoints.length > 1) {
          const lastPoint = newPoints[newPoints.length - 1];
          const prevPoint = newPoints[newPoints.length - 2];
          const dx = lastPoint.x - prevPoint.x;
          const dy = lastPoint.y - prevPoint.y;
          setDistance((Math.sqrt(dx * dx + dy * dy) * metersPerPixel).toFixed(NUMBER_OF_DECIMALS));
        } else {
          setDistance(0);
          setAngle(null);
        }
      }
    }
  };

  // Effect for keyboard event listeners
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Enter" && isDrawing) {
        endDrawing();
      } else if (event.key === "Escape") {
        resetDrawing();
      } else if (event.key === "Delete" && isDrawing) {
        deleteLastPoint();
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isDrawing, points]);

  /***************************************
   *********  DRAW THE POLYGON   *********
   ***************************************/

  /**
   * Handles click event for adding points
   * @param {Object} event - Click event object
   */
  const handleClick = (event) => {
    if (isCalibrationMode) {
      handleCalibrationClick(event);
    } else if (!isDrawing) {
      return;
    } else {
      const newPoint = snappedPosition || {
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY,
      };

      setPoints([...points, newPoint]);
      setMessage("Press Enter for å fullføre");
    }
  };

  /**
   * Ends the drawing process and calculates final segments
   */
  const endDrawing = () => {
    setIsDrawing(false);
    setIsFinished(true);
    setMessage("Tegning er ferdig. Press Esc for å tegne en ny sone");

    const segments = points.slice(1).map((endPoint, index) => {
      const startPoint = points[index];
      const length = calculateLength(startPoint, endPoint, metersPerPixel);
      const angle = determineOrientation(startPoint, endPoint, points);

      return {
        length: Number(length.toFixed(1)),
        angle: angle,
        startPoint: startPoint,
        endPoint: endPoint,
      };
    });

    const filteredSegments = segments.filter((segment) => segment.length > 0);

    if (onDrawingComplete) {
      onDrawingComplete(filteredSegments);
    }
  };

  /**
   * Handles mouse movement for updating cursor position and calculations
   * @param {Object} event - Mouse move event object
   */
  const handleMouseMove = (event) => {
    if (!isDrawing) return;

    const newPosition = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
    setCursorPosition(newPosition);

    // Check for snapping
    const snapped = checkSnapping(newPosition);
    setSnappedPosition(snapped);

    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const targetPoint = snapped || newPosition;
      const dx = targetPoint.x - lastPoint.x;
      const dy = targetPoint.y - lastPoint.y;
      setDistance((Math.sqrt(dx * dx + dy * dy) * metersPerPixel).toFixed(NUMBER_OF_DECIMALS));

      // Calculate angle if there are at least two points
      if (points.length > 1) {
        const prevPoint = points[points.length - 2];
        const prevDx = lastPoint.x - prevPoint.x;
        const prevDy = lastPoint.y - prevPoint.y;
        const newDx = targetPoint.x - lastPoint.x;
        const newDy = targetPoint.y - lastPoint.y;

        let newAngle = Math.atan2(newDy, newDx) - Math.atan2(prevDy, prevDx);
        newAngle = (newAngle * 180) / Math.PI; // Convert to degrees
        if (newAngle < 0) newAngle += 360; // Ensure positive angle
        setAngle(newAngle.toFixed(0));
      } else {
        setAngle(null);
      }
    }
  };

  /**
   * Checks if the current position should snap to an existing point
   * @param {Object} position - Current cursor position
   * @returns {Object|null} Snapped position or null
   */
  const checkSnapping = (position) => {
    for (let point of points) {
      const dx = position.x - point.x;
      const dy = position.y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= SNAP_DISTANCE) {
        return point;
      }
    }
    return null;
  };

  const handleLineClick = useCallback(
    (index) => {
      if (isFinished && index < points.length - 1) {
        const startPoint = points[index];
        const endPoint = points[index + 1];
        const length = calculateLength(startPoint, endPoint, metersPerPixel);
        const angle = determineOrientation(startPoint, endPoint, points);
        console.log(`Clicked line ${index + 1}: Length = ${length.toFixed(1)}m, Angle = ${angle}°`);
      }
    },
    [isFinished, points, metersPerPixel, roundAngleTo]
  );

  /**
   * Creates a line segment graphics object
   * @param {Object} startPoint - The start point of the line
   * @param {Object} endPoint - The end point of the line
   * @returns {PIXI.Graphics} The created line segment
   */
  const createLineSegment = (startPoint, endPoint) => {
    const lineSegment = new PIXIGraphics();
    lineSegment.lineStyle(3, drawingColor);
    lineSegment.moveTo(startPoint.x, startPoint.y);
    lineSegment.lineTo(endPoint.x, endPoint.y);
    return lineSegment;
  };

  /**
   * Makes a line segment interactive
   * @param {PIXI.Graphics} lineSegment - The line segment to make interactive
   * @param {number} index - The index of the line segment
   * @param {Object} startPoint - The start point of the line
   * @param {Object} endPoint - The end point of the line
   */
  const makeLinesInteractive = (lineSegment, index, startPoint, endPoint) => {
    lineSegment.interactive = true;
    lineSegment.buttonMode = true;
    lineSegment.hitArea = {
      contains: (x, y) => {
        const A = startPoint;
        const B = endPoint;
        const C = { x, y };
        const distanceFromLine =
          Math.abs((B.y - A.y) * C.x - (B.x - A.x) * C.y + B.x * A.y - B.y * A.x) /
          Math.sqrt((B.y - A.y) ** 2 + (B.x - A.x) ** 2);
        return distanceFromLine < CLICK_SENSITIVITY;
      },
    };
    lineSegment.on("pointerdown", () => handleLineClick(index));
  };

  /**
   * Draws the lines and points on the canvas
   */
  const draw = useCallback(
    (g) => {
      g.clear();

      // Remove all children (previous line segments)
      while (g.children[0]) {
        g.removeChild(g.children[0]);
      }

      // Create a new PIXI.Graphics object for each line segment
      // Make the line segment interactive if drawing is finished
      for (let i = 1; i < points.length; i++) {
        const startPoint = points[i - 1];
        const endPoint = points[i];
        const lineSegment = createLineSegment(startPoint, endPoint);
        if (isFinished) makeLinesInteractive(lineSegment, i - 1, startPoint, endPoint);

        // Add the line segment to the main graphics object
        g.addChild(lineSegment);
      }

      // Draw line from last point to cursor if still drawing
      if (isDrawing && points.length > 0) {
        const lastPoint = points[points.length - 1];
        const targetPoint = snappedPosition || cursorPosition;
        g.lineStyle(3, lighten(drawingColor, 0.1));
        g.moveTo(lastPoint.x, lastPoint.y);
        g.lineTo(targetPoint.x, targetPoint.y);
      }

      // Draw snapping indicator
      if (snappedPosition) {
        g.lineStyle(3, 0xff0000);
        g.drawCircle(snappedPosition.x, snappedPosition.y, 5);
      }

      // Draw calibration line if in calibration mode and visible
      if (isCalibrationMode && calibrationLineVisible && calibrationPoints.length) {
        g.lineStyle(3, 0xa2c3b3); // Green color for calibration line
        g.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
        if (calibrationPoints.length > 1) {
          g.lineTo(calibrationPoints[1].x, calibrationPoints[1].y);
        } else {
          g.lineTo(cursorPosition.x, cursorPosition.y);
        }
      }
    },
    [
      points,
      cursorPosition,
      isDrawing,
      snappedPosition,
      isFinished,
      handleLineClick,
      drawingColor,
      isCalibrationMode,
      calibrationLineVisible,
      calibrationPoints,
    ]
  );

  const handleCalibrationClick = (event) => {
    const newPoint = snappedPosition || {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };

    if (calibrationPoints.length === 0) {
      setCalibrationPoints([newPoint]);
      setMessage("Click to set the end point of the calibration line");
    } else if (calibrationPoints.length === 1) {
      const startPoint = calibrationPoints[0];
      const endPoint = newPoint;
      const pixelLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
      );

      if (pixelLength < MIN_CALIBRATION_LENGTH) {
        setMessage(
          `Calibration line too short. Minimum length is ${MIN_CALIBRATION_LENGTH} pixels.`
        );
        // TODO: reset the calibration points
      } else {
        setCalibrationLineLength(pixelLength);
        setCalibrationPoints([startPoint, endPoint]);

        const newLengthMultiplier = knownMeasurement / pixelLength;
        onCalibrationComplete(newLengthMultiplier);
        setMessage("Calibration complete. You can now start drawing.");
      }
    }
  };

  /***************************************************************
   *  FIND THE ORIENTATION OF EACH LINE IN A COMPLETED POLYGON ***
   ***************************************************************/

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
  const determineOrientation = (startPoint, endPoint, polygon) => {
    let angle;
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    const midPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };

    const lineType = getLineType(dx, dy, ORIENTATION_TOLERANCE);
    console.log("Line type:", lineType);

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
      console.log("Perpendicular angle (before normalization):", angle);
    }

    // Round the angle
    const roundedAngle = roundAngle(angle, roundAngleTo);
    console.log("Original angle:", angle, "Rounded angle:", roundedAngle);
    return roundedAngle;
  };

  // TextStyle-factory for Pixi Text elements
  const getTextStyle = (fontSize = 16) =>
    new TextStyle({
      fill: 0xffffff,
      fontSize,
      fontFamily: "Arial",
    });

  return (
    <Stage
      width={canvasSize.width}
      height={canvasSize.height}
      options={{ backgroundColor: 0x1099bb, interactive: true }}
      onClick={isFinished ? undefined : handleClick}
      onMouseMove={isFinished ? undefined : handleMouseMove}
    >
      <Container>
        {backgroundTexture && (
          <Sprite
            texture={backgroundTexture}
            width={canvasSize.width}
            height={canvasSize.height}
            x={0}
            y={0}
          />
        )}
        <Graphics draw={draw} />
        <Text
          text={message}
          x={canvasSize.width / 2}
          y={canvasSize.height - 20}
          anchor={0.5}
          style={getTextStyle()}
        />
        {isDrawing && points.length > 0 && (
          <Text
            text={`Avstand: ${distance}`}
            x={canvasSize.width / 2}
            y={20}
            anchor={[0.5, 0]}
            style={getTextStyle(14)}
          />
        )}
      </Container>
    </Stage>
  );
};

export default LineDrawer;

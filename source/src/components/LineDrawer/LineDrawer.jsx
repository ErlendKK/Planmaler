import React, { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Container, Text, Graphics, Sprite } from "@pixi/react";
import { TextStyle, Texture } from "pixi.js";

import { calculateLength, determineOrientation } from "../../utils/geometry";
import { lighten, Flex } from "@mantine/core";
import useNotifications from "../../hooks/useNotifications.jsx";
import { useSegments } from "../../contexts/SegmentsContext.jsx";

// Constants
import {
  MAX_CANVAS_WIDTH,
  MAX_CANVAS_HEIGHT,
  SNAP_DISTANCE,
  NUMBER_OF_DECIMALS,
} from "../../constants/line-drawer-constants.js";

const FACADE_THICKNESS = 3.3;
const CONNECTION_THICKNESS = 4;
const CONNECTION_COLOR = 0xc84630; // Red

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
  angleAdjustment,
  drawingColor,
  roofHeight,
  isCalibrationMode,
  onCalibrationComplete,
  knownMeasurement,
  provideDownloadAccess,
}) => {
  // State declarations
  const [points, setPoints] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [snappedPosition, setSnappedPosition] = useState(null);
  const [message, setMessage] = useState("Klikk for å markere første målepunkt");
  const [distance, setDistance] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [backgroundTexture, setBackgroundTexture] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [lineNumbers, setLineNumbers] = useState([]);
  const [zoneFillPolygons, setZoneFillPolygons] = useState([]);

  const { completedZones, addZone } = useSegments();
  const stageRef = useRef(null); // Used to download the canvas as an image
  const { showGreenNotification } = useNotifications();

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
   * Used to pass the canvas data to the parent component for image download
   */
  const getCanvasData = useCallback(() => {
    if (stageRef.current) {
      const app = stageRef.current.app;
      const renderer = app.renderer;
      const extractedCanvas = renderer.extract.canvas(app.stage);
      return extractedCanvas.toDataURL("image/png");
    }
    return null;
  }, []);

  // Provide download access to parent component
  useEffect(() => {
    if (provideDownloadAccess) {
      provideDownloadAccess(getCanvasData);
    }
  }, [provideDownloadAccess, getCanvasData]);

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
    setMessage("Klikk for å markere første målepunkt");
    setDistance(0);
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
        setMessage("Klikk for å markere første målepunkt");
        setDistance(0);
      } else {
        setMessage("Press Enter for å fullføre. Press Esc for å avbryte");
        // Recalculate distance and angle if there are still points
        if (newPoints.length > 1) {
          const lastPoint = newPoints[newPoints.length - 1];
          const prevPoint = newPoints[newPoints.length - 2];
          const dx = lastPoint.x - prevPoint.x;
          const dy = lastPoint.y - prevPoint.y;
          setDistance((Math.sqrt(dx * dx + dy * dy) * metersPerPixel).toFixed(NUMBER_OF_DECIMALS));
        } else {
          setDistance(0);
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
      return;
    }

    const newPoint = snappedPosition || {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };

    if (!isDrawing) {
      // Start a new drawing
      setIsDrawing(true);
      setPoints([newPoint]);
      setMessage("Klikk for å markere neste målepunkt. Press Enter for å fullføre.");
    } else {
      // Add a new point to the drawing
      setPoints([...points, newPoint]);
      setMessage("Press Enter for å fullføre. Press Esc for å avbryte");
    }
  };

  /**
   * Beregner segmenter basert på nåværende punkter.
   * @returns {Array} Et array av segmenter med lengde, vinkel, start- og sluttpunkt.
   */
  const calculateSegments = () => {
    if (points.length < 2) return [];

    const segments = points.slice(1).map((endPoint, index) => {
      const startPoint = points[index];
      const length = calculateLength(startPoint, endPoint, metersPerPixel);
      const angle = determineOrientation(startPoint, endPoint, points, roundAngleTo);

      return {
        length: Number(length.toFixed(1)),
        angle: angle,
        startPoint: startPoint,
        endPoint: endPoint,
        color: drawingColor,
      };
    });

    return segments.filter((segment) => segment.length > 0);
  };

  /**
   * Ends the drawing process and calculates final segments
   */
  const endDrawing = () => {
    if (!isDrawing) return;

    // Add to completed polygons to permaently display its background color
    setZoneFillPolygons((prev) => [
      ...prev,
      {
        color: drawingColor,
        points: points,
      },
    ]);

    const segments = calculateSegments();
    addZone(segments, metersPerPixel, roofHeight, angleAdjustment);
    onDrawingComplete(segments);
    setPoints([]);
    setIsDrawing(false);
    setMessage("Klikk for å måle opp ny sone");
    showGreenNotification("Måling fullført!", null, 2000);
  };

  /**
   * Handles mouse movement for updating cursor position and calculations
   * @param {Object} event - Mouse move event object
   */
  const handleMouseMove = useCallback(
    (event) => {
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
      }
    },
    [isDrawing, points, metersPerPixel, completedZones]
  );

  const getAllPoints = useCallback(() => {
    return [
      // NB! Keep ...points at the bottom
      ...completedZones.flatMap((zone) =>
        zone.segments.flatMap((segment) => [segment.startPoint, segment.endPoint])
      ),
      ...points,
    ];
  }, [completedZones, points]);

  /**
   * Checks if the current position should snap to an existing point
   * @param {Object} position - Current cursor position
   * @returns {Object|null} Snapped position or null
   */
  const checkSnapping = (position) => {
    // Collect all points from completed segments and current drawing
    const allPoints = getAllPoints();

    for (let point of allPoints) {
      const dx = position.x - point.x;
      const dy = position.y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= SNAP_DISTANCE) {
        return point;
      }
    }
    return null;
  };

  /**
   * Draws the lines and points on the canvas
   */
  const draw = useCallback(
    (g) => {
      g.clear();

      // Function to draw dashed line
      const drawDashedLine = (fromX, fromY, toX, toY, dash = 12, gap = 7) => {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dashCount = Math.floor(distance / (dash + gap));
        const dashX = (dx / distance) * (dash + gap);
        const dashY = (dy / distance) * (dash + gap);

        g.moveTo(fromX, fromY);

        for (let i = 0; i < dashCount; i++) {
          const startX = fromX + i * dashX;
          const startY = fromY + i * dashY;
          const endX = startX + (dashX * dash) / (dash + gap);
          const endY = startY + (dashY * dash) / (dash + gap);

          g.lineTo(endX, endY);
          g.moveTo(endX + (dashX * gap) / (dash + gap), endY + (dashY * gap) / (dash + gap));
        }
      };

      // Draw fills for completed zones
      zoneFillPolygons.forEach((polygon) => {
        g.beginFill(lighten(polygon.color, 0.6), 0.4);
        g.moveTo(polygon.points[0].x, polygon.points[0].y);
        for (let i = 1; i < polygon.points.length; i++) {
          g.lineTo(polygon.points[i].x, polygon.points[i].y);
        }
        g.endFill();
      });

      // Draw current zone fill if at least one segment is drawn
      if (points.length > 1) {
        g.beginFill(lighten(drawingColor, 0.6), 0.4);
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          g.lineTo(points[i].x, points[i].y);
        }
        if (isDrawing) {
          g.lineTo(cursorPosition.x, cursorPosition.y);
        }
        g.endFill();
      }

      // Draw completed zones
      completedZones.forEach((zone) => {
        // Draw facades
        zone.segments.forEach((segment) => {
          g.lineStyle(FACADE_THICKNESS, segment.color || FACADE_COLOR);
          g.moveTo(segment.startPoint.x, segment.startPoint.y);
          g.lineTo(segment.endPoint.x, segment.endPoint.y);
        });

        // Draw connections
        (zone.connections || []).forEach((connection) => {
          g.lineStyle(CONNECTION_THICKNESS, CONNECTION_COLOR);
          drawDashedLine(
            connection.segment.startPoint.x,
            connection.segment.startPoint.y,
            connection.segment.endPoint.x,
            connection.segment.endPoint.y
          );
        });
      });

      // Draw current segment being drawn
      for (let i = 1; i < points.length; i++) {
        const startPoint = points[i - 1];
        const endPoint = points[i];
        g.lineStyle(FACADE_THICKNESS, drawingColor);
        g.moveTo(startPoint.x, startPoint.y);
        g.lineTo(endPoint.x, endPoint.y);
      }

      // Draw snapping indicator
      if (snappedPosition) {
        g.lineStyle(FACADE_THICKNESS, 0xff0000);
        g.drawCircle(snappedPosition.x, snappedPosition.y, 5);
      }

      // Draw line from last point to cursor only if drawing
      if (isDrawing && points.length > 0) {
        const lastPoint = points[points.length - 1];
        const targetPoint = snappedPosition || cursorPosition;
        g.lineStyle(FACADE_THICKNESS, lighten(drawingColor, 0.1));
        g.moveTo(lastPoint.x, lastPoint.y);
        g.lineTo(targetPoint.x, targetPoint.y);
      }

      // Draw calibration line if calibration mode is active
      if (isCalibrationMode && calibrationPoints.length > 0) {
        g.lineStyle(FACADE_THICKNESS, 0x668537);
        g.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
        if (calibrationPoints.length > 1) {
          g.lineTo(calibrationPoints[1].x, calibrationPoints[1].y);
        } else {
          g.lineTo(cursorPosition.x, cursorPosition.y);
        }
      }

      // Draw points for all segments (completed and current)
      const allPoints = getAllPoints();
      allPoints.forEach((point) => {
        g.beginFill(0xffffff);
        g.lineStyle(2, 0x000000);
        g.drawCircle(point.x, point.y, 3);
        g.endFill();
      });
    },
    [
      points,
      cursorPosition,
      isDrawing,
      snappedPosition,
      drawingColor,
      isCalibrationMode,
      calibrationPoints,
      completedZones,
    ]
  );

  /**
   * Handles clicks during calibration mode
   */
  const handleCalibrationClick = (event) => {
    const newPoint = snappedPosition || {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };

    // If this is the first point, set it as the start point
    if (calibrationPoints.length === 0) {
      setCalibrationPoints([newPoint]);
      setMessage("Klikk for å sette sluttpunktet for kalibreringslinen");

      // Otherwise, calculate the distance and update meters per pixel
    } else if (calibrationPoints.length === 1) {
      const startPoint = calibrationPoints[0];
      const endPoint = newPoint;
      const pixelLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
      );

      // Update meters per pixel and notify user and parent component
      const newMetersPerPixel = knownMeasurement / pixelLength;
      onCalibrationComplete(newMetersPerPixel);
      setCalibrationPoints([]);
      showGreenNotification(
        "Kalibrering utført",
        `Målestokk: ${(newMetersPerPixel * 1000).toFixed(0)} mm/px`
      );
      setMessage("Klikk for å markere første målepunkt");
    }
  };

  // Effect to update line numbers when drawing is finished
  useEffect(() => {
    const allSegments = completedZones.flatMap((zone) => zone.segments).concat(calculateSegments());
    if (allSegments.length > 0) {
      const numbers = allSegments.map((segment, index) => ({
        number: index + 1,
        x: (segment.startPoint.x + segment.endPoint.x) / 2,
        y: (segment.startPoint.y + segment.endPoint.y) / 2,
      }));
      setLineNumbers(numbers);
    } else {
      setLineNumbers([]);
    }
  }, [completedZones, points]);

  // TextStyle-factory for Pixi Text elements
  const getTextStyle = (fontSize = 16) =>
    new TextStyle({
      fill: 0xffffff,
      fontSize,
      fontFamily: "Arial",
      stroke: 0x000000,
      strokeThickness: 3,
    });

  return (
    <Flex direction="column" gap="xs" justify="center" align="center">
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        options={{ backgroundColor: 0xf7f9f9, interactive: true }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
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
          {lineNumbers.map((lineNumber) => (
            <Text
              key={lineNumber.number}
              text={lineNumber.number.toString()}
              x={lineNumber.x}
              y={lineNumber.y}
              anchor={0.5}
              style={getTextStyle(22)}
            />
          ))}
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
    </Flex>
  );
};

export default LineDrawer;

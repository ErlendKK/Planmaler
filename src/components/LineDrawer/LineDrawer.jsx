import React, { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Container, Text, Graphics, Sprite } from "@pixi/react";
import { TextStyle, Texture } from "pixi.js";
import { calculateLength, determineOrientation } from "../../utils/geometry";
import { lighten, Button, Flex } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

// Constants
import {
  MAX_CANVAS_WIDTH,
  MAX_CANVAS_HEIGHT,
  SNAP_DISTANCE,
  NUMBER_OF_DECIMALS,
} from "../../constants/line-drawer-constants.js";

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
  knownMeasurement,
  provideDownloadAccess,
}) => {
  // State declarations
  const [points, setPoints] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [snappedPosition, setSnappedPosition] = useState(null);
  const [message, setMessage] = useState("Klikk for å markere første punkt");
  const [distance, setDistance] = useState(0);
  const [isDrawing, setIsDrawing] = useState(true);
  const [backgroundTexture, setBackgroundTexture] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [isFinished, setIsFinished] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [lineNumbers, setLineNumbers] = useState([]);

  const stageRef = useRef(null); // For downloading the canvas as an image

  const downloadImage = () => {
    if (stageRef.current) {
      const app = stageRef.current.app;
      const renderer = app.renderer;

      // Render the stage to a canvas
      const extractedCanvas = renderer.extract.canvas(app.stage);

      // Convert the canvas to a data URL
      const dataURL = extractedCanvas.toDataURL("image/png");

      // Create a temporary anchor element and trigger download
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "drawing_with_background.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
    setIsFinished(false);
    setMessage("Klikk for å sette første punkt");
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
        setMessage("Klikk for å sette første punkt");
        setDistance(0);
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
      };
    });

    return segments.filter((segment) => segment.length > 0);
  };

  /**
   * Ends the drawing process and calculates final segments
   */
  const endDrawing = () => {
    const segments = calculateSegments();
    onDrawingComplete(segments);
    setIsDrawing(false);
    setIsFinished(true);
    setMessage("Tegning utført. Press Esc for å begynne forfra");
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

  /**
   * Draws the lines and points on the canvas
   */
  const draw = useCallback(
    (g) => {
      g.clear();

      // Create a new PIXI.Graphics object for each line segment
      for (let i = 1; i < points.length; i++) {
        const startPoint = points[i - 1];
        const endPoint = points[i];
        g.lineStyle(3, drawingColor);
        g.moveTo(startPoint.x, startPoint.y);
        g.lineTo(endPoint.x, endPoint.y);
      }

      // Draw line from last point to cursor if still drawing
      if (isDrawing && points.length > 0) {
        const lastPoint = points[points.length - 1];
        const targetPoint = snappedPosition || cursorPosition;
        g.lineStyle(3, lighten(drawingColor, 0.1));
        g.moveTo(lastPoint.x, lastPoint.y);
        g.lineTo(targetPoint.x, targetPoint.y);

        // Draw snapping indicator only when drawing is in progress
        if (snappedPosition) {
          g.lineStyle(3, 0xff0000);
          g.drawCircle(snappedPosition.x, snappedPosition.y, 5);
        }
      }

      // Draw calibration line if calibration mode is active
      if (isCalibrationMode && calibrationPoints.length > 0) {
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
      drawingColor,
      isCalibrationMode,
      calibrationPoints,
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

    if (calibrationPoints.length === 0) {
      setCalibrationPoints([newPoint]);
      setMessage("Klikk for å sette sluttpunktet for kalibreringslinen");
    } else if (calibrationPoints.length === 1) {
      const startPoint = calibrationPoints[0];
      const endPoint = newPoint;
      const pixelLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
      );

      const newMetersPerPixel = knownMeasurement / pixelLength;
      onCalibrationComplete(newMetersPerPixel);

      setCalibrationPoints([]);
      setMessage("Kalibrering utført. Du kan begynne å tegne.");
    }
  };

  // Effect to update line numbers when drawing is finished
  useEffect(() => {
    if (isFinished && points.length > 1) {
      const numbers = [];
      for (let i = 1; i < points.length; i++) {
        const startPoint = points[i - 1];
        const endPoint = points[i];
        const midPoint = {
          x: (startPoint.x + endPoint.x) / 2,
          y: (startPoint.y + endPoint.y) / 2,
        };
        numbers.push({ number: i, x: midPoint.x, y: midPoint.y });
      }
      setLineNumbers(numbers);
    } else {
      setLineNumbers([]);
    }
  }, [isFinished, points]);

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
      {/* {isFinished && (
        <Button onClick={downloadImage} leftSection={<IconDownload size="1rem" />}>
          Last ned bilde
        </Button>
      )} */}
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        options={{ backgroundColor: 0x1099bb, interactive: true }}
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

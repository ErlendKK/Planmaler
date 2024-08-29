import React, { useMemo } from "react";
import { Box, Text, Table, Button, Flex } from "@mantine/core";
import { IconFileExport, IconDownload } from "@tabler/icons-react";
import * as XLSX from "xlsx";

import { normalizeAngle, calculatePolygonAreaFromLines } from "../../utils/geometry";

// Constants for decimal point precision
const DECIMAL_POINTS_LENGTH = 1;
const DECIMAL_POINTS_AREA = 1;
const DECIMAL_POINTS_ANGLE = 1;

/**
 * Adjusts and normalizes an angle
 * @param {number} angle - The original angle
 * @param {number} adjustment - The adjustment to apply
 * @returns {number|string} The adjusted and normalized angle, or 'N/A' if invalid
 */
const adjustAndNormalizeAngle = (angle, adjustment) => {
  console.log("Original angle:", angle, "Adjustment:", adjustment);
  if (typeof angle !== "number" || isNaN(angle)) {
    return "N/A";
  }
  const adjustedAngle = normalizeAngle(angle + adjustment);
  console.log("Adjusted angle:", adjustedAngle);
  return adjustedAngle;
};

/**
 * ResultsTable component displays facade data and polygon area
 * @param {Object} props - Component props
 * @param {Array} props.lineSegments - Array of line segment data
 * @param {number} props.metersPerPixel - Multiplier for length calculations
 * @param {number} props.angleAdjustment - Adjustment to be applied to angles
 */
const ResultsTable = ({
  lineSegments,
  metersPerPixel,
  angleAdjustment,
  onDownload,
  isFinished,
  roofHeight,
}) => {
  console.log("Incoming lineSegments:", lineSegments);
  console.log("angleAdjustment:", angleAdjustment);

  // Calculate polygon area using memoization for performance
  const polygonArea = useMemo(() => {
    if (lineSegments.length < 3) return 0;

    const lines = lineSegments.map((segment, index) => {
      const nextIndex = (index + 1) % lineSegments.length;
      return {
        startX: segment.startPoint.x,
        startY: segment.startPoint.y,
        endX: lineSegments[nextIndex].startPoint.x,
        endY: lineSegments[nextIndex].startPoint.y,
      };
    });
    return calculatePolygonAreaFromLines(lines) * metersPerPixel * metersPerPixel;
  }, [lineSegments, metersPerPixel]);

  /**
   * Prepares facade data with adjusted angles and replaces dots with commas
   * @returns {Array} Array of facade data objects with adjusted angles and comma-formatted numbers
   */
  const prepareAdjustedFacadeData = () => {
    return lineSegments.map((segment, index) => {
      const adjustedAngle = adjustAndNormalizeAngle(segment.angle, angleAdjustment);

      const datapoint = {
        Fasade: index + 1,
        "Lengde (m)": segment.length.toFixed(DECIMAL_POINTS_LENGTH),
        "Areal (m²)": segment.area.toFixed(DECIMAL_POINTS_AREA),
        "Himmelretning (grader)":
          adjustedAngle === "N/A" ? "N/A" : adjustedAngle.toFixed(DECIMAL_POINTS_ANGLE),
      };

      return replaceDotWithComma(datapoint);
    });
  };

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
   * Exports facade data to Excel file
   */
  const exportToExcel = () => {
    const adjustedData = prepareAdjustedFacadeData();
    console.log("adjustedData: ", adjustedData);
    const ws = XLSX.utils.json_to_sheet(adjustedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fasader");
    XLSX.writeFile(wb, "fasader_data.xlsx");
  };

  // Prepare adjusted facade data for rendering
  const adjustedFacadeData = prepareAdjustedFacadeData();

  return (
    <Box mb="md">
      <Text size="lg" weight={500} mb="lg">
        Areal Sone: {polygonArea.toFixed(DECIMAL_POINTS_AREA)} m²
      </Text>
      <Table mb="lg">
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ textAlign: "center" }}>Fasade</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Lengde (m)</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Areal (m²)</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Himmelretning (grader)</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {adjustedFacadeData.map((data, index) => (
            <Table.Tr key={index}>
              <Table.Td style={{ textAlign: "center" }}>{data.Fasade}</Table.Td>
              <Table.Td style={{ textAlign: "center" }}>{data["Lengde (m)"]}</Table.Td>
              <Table.Td style={{ textAlign: "center" }}>{data["Areal (m²)"]}</Table.Td>
              <Table.Td style={{ textAlign: "center" }}>{data["Himmelretning (grader)"]}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Flex mt="md" gap="lg" justify="flex-start">
        <Button onClick={exportToExcel} leftSection={<IconFileExport size="1rem" />}>
          Eksporter til Excel
        </Button>
        {isFinished && (
          <Button variant="outline" onClick={onDownload} leftSection={<IconDownload size="1rem" />}>
            Last ned bilde
          </Button>
        )}
      </Flex>
    </Box>
  );
};

export default ResultsTable;

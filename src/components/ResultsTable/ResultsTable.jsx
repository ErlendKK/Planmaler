import React, { useState, useMemo } from "react";
import { Box, Text, Table, Button, Flex, Tooltip, List } from "@mantine/core";
import { IconFileExport, IconDownload, IconFileCode, IconInfoCircle } from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { create } from "xmlbuilder2";

import { normalizeAngle, calculatePolygonAreaFromLines } from "../../utils/geometry";
import useNotifications from "../../hooks/useNotifications";
import { replaceDotWithComma } from "../../utils/misc";
import HorizonSectorInput from "../HorizonSectorInput.jsx";

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
  if (typeof angle !== "number" || isNaN(angle)) {
    return "N/A";
  }
  return normalizeAngle(angle + adjustment);
};

/**
 * Initializes a line segment with horizon sectors
 * @param {Object} segment - Original line segment data
 * @returns {Object} Line segment with added horizon sectors
 */
const initializeSegmentWithHorizonSectors = (segment) => ({
  ...segment,
  horizonSector1: 0,
  horizonSector2: 0,
  horizonSector3: 0,
  horizonSector4: 0,
});

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
  // console.log("Incoming lineSegments:", lineSegments);
  // console.log("angleAdjustment:", angleAdjustment);
  const { showRedNotification } = useNotifications();

  // Array of lineSegment-objects that include 4 horizon sectors
  const [lineSegmentsWithHorizonSectors, setLineSegmentsWithHorizonSectors] = useState(() =>
    lineSegments.map(initializeSegmentWithHorizonSectors)
  );

  /**
   * Updates a horizon sector value for a specific line segment
   * @param {number} index - Index of the line segment
   * @param {number} sectorNumber - Number of the horizon sector (1-4)
   * @param {number} value - New value for the horizon sector
   */
  const updateHorizonSectors = (segmentIndex, sector1, sector2, sector3, sector4) => {
    setLineSegmentsWithHorizonSectors((prev) =>
      prev.map((segment, index) =>
        index === segmentIndex
          ? {
              ...segment,
              horizonSector1: sector1,
              horizonSector2: sector2,
              horizonSector3: sector3,
              horizonSector4: sector4,
            }
          : segment
      )
    );
  };

  // Calculate polygon area using memoization for performance
  const polygonArea = useMemo(() => {
    if (lineSegments.length < 3) {
      showRedNotification("Arealet er ikke beregnet", `Mål opp 3 linjer for å beregne areal.`);
      return 0;
    }

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
   * Prepares facade data with adjusted angles, replaces dots with commas, and includes horizon sectors
   * @returns {Array} Array of facade data objects with adjusted angles, comma-formatted numbers, and horizon sectors
   */
  const prepareAdjustedFacadeData = () => {
    return lineSegmentsWithHorizonSectors.map((segment, index) => {
      const adjustedAngle = adjustAndNormalizeAngle(segment.angle, angleAdjustment);

      const datapoint = {
        Fasade: index + 1,
        "Lengde (m)": segment.length.toFixed(DECIMAL_POINTS_LENGTH),
        "Areal (m²)": (segment.length * roofHeight).toFixed(DECIMAL_POINTS_AREA),
        "Himmelretning (grader)":
          adjustedAngle === "N/A" ? "N/A" : adjustedAngle.toFixed(DECIMAL_POINTS_ANGLE),
        "Horisont seksjon 1": segment.horizonSector1,
        "Horisont seksjon 2": segment.horizonSector2,
        "Horisont seksjon 3": segment.horizonSector3,
        "Horisont seksjon 4": segment.horizonSector4,
      };

      return replaceDotWithComma(datapoint);
    });
  };

  /**
   * Generates XML structure for the facade data
   * @returns {Object} XML object
   */
  const generateXMLStructure = () => {
    const xml = create({ version: "1.0", encoding: "UTF-8", standalone: "yes" })
      .ele("simien_project", {
        id: "prosjekt#1",
        name: "Nytt Prosjekt",
        comment: "",
        measure_id: "",
        person: "Erlend Kvitrud",
        units: "1",
        building_type: "Skolebygg",
        user: "Erlend Kvitrud",
        company: "Veni AS",
      })
      .ele("zone", {
        id: "sone#3",
        name: "Ny Sone",
        comment: "",
        measure_id: "",
        area: "430.0",
        volume: "1290.0",
        n50: "1.50",
        furniture: "Lette møbler/lette skillekonstruksjoner",
        thermal_cap_furniture: "5.0",
        shielding: "moderat",
        facades: "flere",
        thermal_bridge_type: "normalisert",
        norm_thermal_bridge: "0.06",
        working_days: "5-dagers uke; 8 uker ferie",
      });

    lineSegmentsWithHorizonSectors.forEach((segment, index) => {
      const adjustedAngle = adjustAndNormalizeAngle(segment.angle, angleAdjustment);
      xml.ele("facade", {
        id: `facade#${index + 1}`,
        name: `${index + 1}`,
        comment: `Lengde ${segment.length.toFixed(DECIMAL_POINTS_LENGTH)} m`,
        measure_id: "",
        area: (segment.length * roofHeight).toFixed(DECIMAL_POINTS_AREA),
        uvalue: "0.21",
        thermal_cap: "63.0",
        construction: "36mm bindingsverk, 200mm isolasjon",
        internal_layer: "Tung vegg",
        direction: adjustedAngle === "N/A" ? "N/A" : adjustedAngle.toFixed(DECIMAL_POINTS_ANGLE),
        horizon_sector1: segment.horizonSector1.toString(),
        horizon_sector2: segment.horizonSector2.toString(),
        horizon_sector3: segment.horizonSector3.toString(),
        horizon_sector4: segment.horizonSector4.toString(),
      });
    });

    xml.up().ele("climate", {
      id: "klima#0",
      name: "Stavanger",
      comment: "",
      measure_id: "",
    });

    return xml;
  };

  /**
   * Exports facade data to XML file
   */
  const exportToXML = () => {
    const xml = generateXMLStructure();
    const xmlString = xml.end({ prettyPrint: true });

    const blob = new Blob([xmlString], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fasade_data.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Exports facade data to Excel file
   * Note: Horizon sector data is excluded from Excel export
   */
  const exportToExcel = () => {
    const excelData = lineSegments.map((segment, index) => {
      const adjustedAngle = adjustAndNormalizeAngle(segment.angle, angleAdjustment);
      return {
        Fasade: index + 1,
        "Lengde (m)": segment.length.toFixed(DECIMAL_POINTS_LENGTH),
        "Areal (m²)": (segment.length * roofHeight).toFixed(DECIMAL_POINTS_AREA),
        "Himmelretning (grader)":
          adjustedAngle === "N/A" ? "N/A" : adjustedAngle.toFixed(DECIMAL_POINTS_ANGLE),
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fasader");
    XLSX.writeFile(wb, "fasade_data.xlsx");
  };

  // Prepare adjusted facade data for rendering
  const adjustedFacadeData = prepareAdjustedFacadeData();

  return (
    <Box mb="md">
      <Text size="lg" weight={500} mb="lg">
        Areal Sone: {polygonArea.toFixed(DECIMAL_POINTS_AREA)} m²
      </Text>
      <Table
        mb="xl"
        styles={{
          Tbody: {},
          th: { textAlign: "center" },
          td: { textAlign: "center" },
        }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fasade</Table.Th>
            <Table.Th>Lengde (m)</Table.Th>
            <Table.Th>Areal (m²)</Table.Th>
            <Table.Th>Himmelretning (grader)</Table.Th>
            <Table.Th styles={{ th: { textAlign: "right" } }}>
              Horisont
              <Tooltip
                label={
                  <div>
                    <Text size="sm" mb="xs">
                      De fire seksjonene tilsvarer:
                    </Text>
                    <List size="sm" spacing="xs">
                      <List.Item>90 - 45 grader venstre</List.Item>
                      <List.Item>45 - 0 grader venstre</List.Item>
                      <List.Item>0 - 45 grader høyre</List.Item>
                      <List.Item>45 - 90 grader høyre</List.Item>
                    </List>
                  </div>
                }
                position="top"
                withArrow
                multiline
              >
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Horisont <IconInfoCircle size={16} style={{ marginLeft: "5px" }} />
                </span>
              </Tooltip>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {lineSegmentsWithHorizonSectors.map((segment, index) => {
            const adjustedAngle = adjustAndNormalizeAngle(segment.angle, angleAdjustment);
            return (
              <Table.Tr key={index}>
                <Table.Td>{index + 1}</Table.Td>
                <Table.Td>{segment.length.toFixed(DECIMAL_POINTS_LENGTH)}</Table.Td>
                <Table.Td>{(segment.length * roofHeight).toFixed(DECIMAL_POINTS_AREA)}</Table.Td>
                <Table.Td>
                  {adjustedAngle === "N/A" ? "N/A" : adjustedAngle.toFixed(DECIMAL_POINTS_ANGLE)}
                </Table.Td>
                <Table.Td>
                  <HorizonSectorInput
                    values={[
                      segment.horizonSector1,
                      segment.horizonSector2,
                      segment.horizonSector3,
                      segment.horizonSector4,
                    ]}
                    onChange={(newValues) => updateHorizonSectors(index, ...newValues)}
                  />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Flex mt="md" gap="lg" justify="flex-start">
        <Button onClick={exportToExcel} leftSection={<IconFileExport size="1rem" />}>
          Eksporter til Excel
        </Button>
        <Button onClick={exportToXML} leftSection={<IconFileCode size="1rem" />}>
          Eksporter til XML
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

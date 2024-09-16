import React, { useState } from "react";
import { Box, Text, Table, Button, Flex, Grid, Space } from "@mantine/core";
import { IconFileExport, IconDownload, IconFileCode } from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { create } from "xmlbuilder2";

import { normalizeAngle } from "../../utils/geometry";
import { getFacadeName, generateRandomNumber } from "../../utils/misc";
import HorizonSectorInput from "../HorizonSectorInput.jsx";
import ButtonMultiSelect from "../ButtonMultiSelect";
import { varmelagringFasade } from "../../data/varmelagring";
import SelectWithInput from "../SelectWithInput";
import InfoIconTooltip from "../InfoIconTooltip/InfoIconTooltip.jsx";
import { useSegments } from "../../contexts/SegmentsContext.jsx";

import {
  takOptions,
  gulvOptions,
  yearsimOptions,
  internlasterOptions,
  oppvarmingOptions,
  VAVOptions,
  CAVOptions,
} from "../../constants/xml-templates.js";

import {
  DEFAULT_VARMELAGRING_FASADE,
  DECIMAL_POINTS_LENGTH,
  DECIMAL_POINTS_AREA,
  DECIMAL_POINTS_ANGLE,
} from "../../constants/results-table-constants.js";

const horisotTooltipList = [
  "90 - 45 grader venstre",
  "45 - 0 grader venstre",
  "0 - 45 grader høyre",
  "45 - 90 grader høyre",
];

const SELECTED_ELEMENTS_OPTIONS = [
  "Kombiner Sonekoblinger",
  "Tak",
  "Gulv",
  "CAV",
  "VAV",
  "Internlaster",
  "Oppvarming",
];

const ResultsTable = ({ angleAdjustment, onDownload, roofHeight }) => {
  const { completedZones, updateSegment } = useSegments();
  const [selectedVarmelagring, setSelectedVarmelagring] = useState({});
  const [selectedElements, setSelectedElements] = useState(["Kombiner Sonekoblinger"]);

  const handleVarmelagringChange = (zoneId, segmentIndex, value) => {
    setSelectedVarmelagring((prev) => ({
      ...prev,
      [zoneId]: {
        ...(prev[zoneId] || {}),
        [segmentIndex]: value,
      },
    }));
    updateSegment(zoneId, segmentIndex, { varmelagring: value });
  };

  const handleElementChange = (val) => {
    setSelectedElements((prevElements) => {
      if (prevElements.includes(val)) {
        return prevElements.filter((item) => item !== val);
      } else {
        return [...prevElements, val];
      }
    });
  };

  const handleHorizonSectorChange = (zoneId, segmentIndex, newValues) => {
    updateSegment(zoneId, segmentIndex, {
      horizonSector1: newValues[0],
      horizonSector2: newValues[1],
      horizonSector3: newValues[2],
      horizonSector4: newValues[3],
    });
  };

  const renderZoneTable = (zone) => (
    <Box key={zone.id} mb="xl">
      <Flex justify="flex-start">
        <Text size="lg" weight={500} mb="sm">
          {zone.name}:
        </Text>
        <Space w="lg" />
        <Text size="lg" weight={500} mb="sm">
          {zone.area.toFixed(DECIMAL_POINTS_AREA)} m²
        </Text>
      </Flex>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fasade</Table.Th>
            <Table.Th>Lengde (m)</Table.Th>
            <Table.Th>Areal (m²)</Table.Th>
            <Table.Th>Himmelretning (grader)</Table.Th>
            <Table.Th>
              <Flex justify="center">
                Varmelagring
                <InfoIconTooltip
                  textInput="Velg fra listen, skriv eller lim inn"
                  listItems={["Bruk TAB til å navigere nedover"]}
                />
              </Flex>
            </Table.Th>
            <Table.Th>
              <Flex justify="flex-end">
                Horisont
                <InfoIconTooltip
                  textInput="De fire seksjonene tilsvarer:"
                  listItems={horisotTooltipList}
                />
              </Flex>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {zone.segments.map((segment, index) => {
            const adjustedAngle = normalizeAngle(segment.angle + angleAdjustment);
            return (
              <Table.Tr key={index}>
                <Table.Td>{segment.number}</Table.Td>
                <Table.Td>{segment.length.toFixed(DECIMAL_POINTS_LENGTH)}</Table.Td>
                <Table.Td>{(segment.length * roofHeight).toFixed(DECIMAL_POINTS_AREA)}</Table.Td>
                <Table.Td>
                  {adjustedAngle === "N/A" ? "N/A" : adjustedAngle.toFixed(DECIMAL_POINTS_ANGLE)}
                </Table.Td>
                <Table.Td>
                  <SelectWithInput
                    data={Object.keys(varmelagringFasade)}
                    value={selectedVarmelagring[zone.id]?.[index] || ""}
                    onChange={(value) => handleVarmelagringChange(zone.id, index, value)}
                    tabIndex={index + 1}
                  />
                </Table.Td>
                <Table.Td>
                  <HorizonSectorInput
                    values={[
                      segment.horizonSector1 || 0,
                      segment.horizonSector2 || 0,
                      segment.horizonSector3 || 0,
                      segment.horizonSector4 || 0,
                    ]}
                    onChange={(newValues) => handleHorizonSectorChange(zone.id, index, newValues)}
                    tabIndex={zone.segments.length + index + 1}
                  />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Box>
  );

  /**
   * Grupperer sonekoblinger basert på hvilke soner de kobler sammen.
   *
   * @param {Array} connections - Array av sonekoblinger-objekter.
   * @param {number} currentZoneId - ID-en til den nåværende sonen som behandles.
   * @returns {Object} Et objekt hvor nøklene er ID-ene til tilkoblede soner,
   * og verdiene er arrays av koblinger til den respektive sonen.
   */
  const groupConnections = (connections, currentZoneId) => {
    return connections.reduce((acc, connection) => {
      // Bestem ID-en til den tilkoblede sonen (den som ikke er den nåværende sonen)
      const facingZoneId =
        connection.zoneId1 === currentZoneId ? connection.zoneId2 : connection.zoneId1;

      // Hvis dette er den første koblingen til denne sonen, initialiser en tom array
      if (!acc[facingZoneId]) {
        acc[facingZoneId] = [];
      }

      // Legg til den nåværende koblingen i arrayen for den tilkoblede sonen
      acc[facingZoneId].push(connection);

      return acc;
    }, {});
  };

  const exportToXML = () => {
    const xml = create({ version: "1.0", encoding: "UTF-8", standalone: "yes" }).ele(
      "simien_project",
      {
        id: "prosjekt#1",
        name: "Nytt Prosjekt",
        comment: "",
        measure_id: "",
        person: "Erlend Kvitrud",
        units: String(completedZones.length),
        building_type: "Kontorbygg",
        user: "Erlend Kvitrud",
        company: "Veni AS",
      }
    );

    completedZones.forEach((zone, zoneIndex) => {
      const zoneElement = xml.ele("zone", {
        id: `sone#${zone.id}`,
        name: zone.name || `Sone ${zoneIndex + 1}`,
        comment: "",
        measure_id: "",
        area: zone.area.toFixed(DECIMAL_POINTS_AREA),
        volume: (zone.area * zone.roofHeight).toFixed(DECIMAL_POINTS_AREA),
        n50: "1.50",
        furniture: "Lette møbler/lette skillekonstruksjoner",
        thermal_cap_furniture: "5.0",
        shielding: "moderat",
        facades: "flere",
        thermal_bridge_type: "normalisert",
        norm_thermal_bridge: "0.06",
        working_days: "5-dagers uke; 8 uker ferie",
      });

      zone.segments.forEach((segment) => {
        const adjustedAngle = normalizeAngle(segment.angle + zone.angleAdjustment);
        zoneElement.ele("facade", {
          id: `fasade#${generateRandomNumber()}`,
          name: getFacadeName(segment, adjustedAngle),
          comment: `Lengde ${segment.length.toFixed(DECIMAL_POINTS_LENGTH)} m`,
          measure_id: "",
          area: (segment.length * zone.roofHeight).toFixed(DECIMAL_POINTS_AREA),
          uvalue: "0.21",
          thermal_cap:
            varmelagringFasade[segment.varmelagring || DEFAULT_VARMELAGRING_FASADE].toString(),
          construction: "36mm bindingsverk, 200mm isolasjon",
          internal_layer: segment.varmelagring || DEFAULT_VARMELAGRING_FASADE,
          direction: adjustedAngle === "N/A" ? "N/A" : adjustedAngle.toFixed(DECIMAL_POINTS_ANGLE),
          horizon_sector1: (segment.horizonSector1 || 0).toString(),
          horizon_sector2: (segment.horizonSector2 || 0).toString(),
          horizon_sector3: (segment.horizonSector3 || 0).toString(),
          horizon_sector4: (segment.horizonSector4 || 0).toString(),
        });
      });

      if (selectedElements.includes("Kombiner Sonekoblinger")) {
        // Grupperer alle tilkoblinger basert på hvilken sone de er koblet til
        const groupedConnections = groupConnections(zone.connections || []);

        Object.entries(groupedConnections).forEach(([facingZoneId, connections]) => {
          const facingZone = completedZones.find((z) => z.id === Number(facingZoneId));
          const facingZoneName = facingZone ? facingZone.name : `Sone ${facingZoneId}`;

          const totalArea = connections.reduce(
            (sum, connection) => sum + connection.segment.length * zone.roofHeight,
            0
          );

          zoneElement.ele("zone_connection", {
            id: `sonekobling#${generateRandomNumber()}`,
            name: `kobling ${facingZoneName} - ${zone.name}`,
            comment: "",
            measure_id: "",
            area: totalArea.toFixed(DECIMAL_POINTS_AREA),
            uvalue: "0.25",
            thermal_cap: "18.0",
            construction: "Standard konstruksjon",
            internal_layer: "Standard akkumulerende sjikt",
            type: "vegg",
            facing: `sone#${facingZoneId}`,
            opening_area: "2.00",
            opening_height: "2.00",
            always_open: "false",
            percent_open: "25.0",
            start_opening: "6.00",
            end_opening: "18.00",
            infiltration: "25.0",
            thermal_cap2: "18.0",
            internal_layer2: "Standard akkumulerende sjikt",
          });
        });
      } else {
        // Hvis vi ikke skal kombinere tilkoblinger, behandler vi hver tilkobling separat
        (zone.connections || []).forEach((connection) => {
          const facingZoneId =
            connection.zoneId1 === zone.id ? connection.zoneId2 : connection.zoneId1;
          const facingZone = completedZones.find((z) => z.id === facingZoneId);
          const facingZoneName = facingZone ? facingZone.name : `Sone ${facingZoneId}`;

          zoneElement.ele("zone_connection", {
            id: `sonekobling#${generateRandomNumber()}`,
            name: `kobling ${facingZoneName} - ${zone.name}`,
            comment: "",
            measure_id: "",
            area: (connection.segment.length * zone.roofHeight).toFixed(DECIMAL_POINTS_AREA),
            uvalue: "0.25",
            thermal_cap: "18.0",
            construction: "Standard konstruksjon",
            internal_layer: "Standard akkumulerende sjikt",
            type: "vegg",
            facing: `sone#${facingZoneId}`,
            opening_area: "2.00",
            opening_height: "2.00",
            always_open: "false",
            percent_open: "25.0",
            start_opening: "6.00",
            end_opening: "18.00",
            infiltration: "25.0",
            thermal_cap2: "18.0",
            internal_layer2: "Standard akkumulerende sjikt",
          });
        });
      }

      // Add new elements based on selectedElements

      // Add roof if selected
      if (selectedElements.includes("Tak")) {
        zoneElement.ele("roof", takOptions(zone));
      }
      // Add floor if selected
      if (selectedElements.includes("Gulv")) {
        zoneElement.ele("floor", gulvOptions(zone));
      }
      // Add CAV if selected
      if (selectedElements.includes("CAV")) {
        zoneElement.ele("ventilation", CAVOptions);
      }
      // Add VAV if selected
      if (selectedElements.includes("VAV")) {
        zoneElement.ele("ventilation", VAVOptions);
      }
      // Add internlaster if selected
      if (selectedElements.includes("Internlaster")) {
        zoneElement.ele("internal_gain", internlasterOptions);
      }
      // Add heating if selected
      if (selectedElements.includes("Oppvarming")) {
        zoneElement.ele("heating", oppvarmingOptions);
      }
    });

    // Årssimmulering
    xml.ele("yearsim", yearsimOptions);

    // Energimerke
    const energymarkElement = xml.ele("energymark", {
      id: "energimerke#38",
      name: "Energimerke",
      comment: "",
      measure_id: "",
      scale: "new2",
      project_type: "old_building",
      building_subtype: "Kontorer, enkle",
      built: "2024",
      company: "Veni AS",
      person: "Navn Navnesen",
      unheated_floor_area: "0.0",
    });

    // Add included_zone elements for each zone
    completedZones.forEach((zone) => {
      energymarkElement.ele("included_zone", { id: `sone#${zone.id}` });
    });

    // Add climate data
    xml.ele("climate", {
      id: "klima#0",
      name: "Stavanger",
      comment: "",
      measure_id: "",
    });

    const xmlString = xml.end({ prettyPrint: true });

    // Create and trigger download
    const blob = new Blob([xmlString], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sone_data.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log("XML exported successfully");
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Create summary sheet data
    const summaryData = [];
    const allSegmentsData = [];

    completedZones.forEach((zone, zoneIndex) => {
      // Zone summary
      summaryData.push({
        "Sone navn": zone.name || `Sone ${zoneIndex + 1}`,
        "Antall fasader": zone.segments.length,
        "Total lengde (m)": zone.segments
          .reduce((acc, segment) => acc + segment.length, 0)
          .toFixed(DECIMAL_POINTS_LENGTH),
        "Totalt Areal (m²)": zone.area.toFixed(DECIMAL_POINTS_AREA),
        "Volum (m³)": (zone.area * zone.roofHeight).toFixed(DECIMAL_POINTS_AREA),
      });

      // All segments data
      zone.segments.forEach((segment) => {
        const adjustedAngle = normalizeAngle(segment.angle + zone.angleAdjustment);
        allSegmentsData.push({
          Sone: zone.name || `Sone ${zoneIndex + 1}`,
          Fasade: getFacadeName(segment, adjustedAngle),
          "Lengde (m)": segment.length.toFixed(DECIMAL_POINTS_LENGTH),
          "Areal (m²)": (segment.length * zone.roofHeight).toFixed(DECIMAL_POINTS_AREA),
          "Himmelretning (grader)":
            adjustedAngle === "N/A" ? "N/A" : Math.round(adjustedAngle).toString(),
        });
      });

      // Create individual zone worksheets
      const zoneData = zone.segments.map((segment) => {
        const adjustedAngle = normalizeAngle(segment.angle + zone.angleAdjustment);
        return {
          Fasade: getFacadeName(segment, adjustedAngle),
          "Lengde (m)": segment.length.toFixed(DECIMAL_POINTS_LENGTH),
          "Areal (m²)": (segment.length * zone.roofHeight).toFixed(DECIMAL_POINTS_AREA),
          "Himmelretning (grader)":
            adjustedAngle === "N/A" ? "N/A" : Math.round(adjustedAngle).toString(),
        };
      });

      zoneData.push({}); // Empty row for separation
      zoneData.push({
        Fasade: "Total",
        "Areal (m²)": zone.area.toFixed(DECIMAL_POINTS_AREA),
        "Lengde (m)": zone.segments
          .reduce((acc, segment) => acc + segment.length, 0)
          .toFixed(DECIMAL_POINTS_LENGTH),
      });

      const ws = XLSX.utils.json_to_sheet(zoneData);

      // Set column widths for zone sheets
      const zoneWsCols = [
        { wch: 20 }, // Fasade
        { wch: 15 }, // Lengde (m)
        { wch: 15 }, // Areal (m²)
        { wch: 25 }, // Himmelretning (grader)
      ];
      ws["!cols"] = zoneWsCols;

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, `Sone ${zoneIndex + 1}`);
    });

    // Create and add the "Oppsummering" sheet
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Oppsummering");

    // Add all segments data to the "Oppsummering" sheet
    XLSX.utils.sheet_add_json(summaryWs, allSegmentsData, {
      origin: "A" + (summaryData.length + 3),
    });

    // Set column widths for summary sheet
    const summaryWsCols = [
      { wch: 20 }, // Sone navn
      { wch: 15 }, // Antall fasader
      { wch: 20 }, // Total lengde (m)
      { wch: 20 }, // Totalt Areal (m²)
      { wch: 15 }, // Volum (m³)
      { wch: 20 }, // Sone (in all segments data)
      { wch: 20 }, // Fasade
      { wch: 15 }, // Lengde (m)
      { wch: 15 }, // Areal (m²)
      { wch: 25 }, // Himmelretning (grader)
    ];
    summaryWs["!cols"] = summaryWsCols;

    // Move "Oppsummering" sheet to the first position
    const sheets = wb.SheetNames;
    sheets.unshift(sheets.pop());
    wb.SheetNames = sheets;

    // Generate Excel file
    XLSX.writeFile(wb, "fasade_data.xlsx");

    console.log("Excel exported successfully");
  };

  return (
    <Box mb="md">
      {completedZones.map(renderZoneTable)}
      <Grid>
        <Grid.Col span={6}>
          <Flex mt="md" gap="md" justify="flex-start">
            <Button onClick={exportToExcel} leftSection={<IconFileExport size="1rem" />}>
              Eksporter til Excel
            </Button>
            <Button
              variant="outline"
              onClick={onDownload}
              leftSection={<IconDownload size="1rem" />}
            >
              Last ned bilde
            </Button>
          </Flex>
        </Grid.Col>
        <Grid.Col span={6}>
          <Flex gap="md" justify="flex-end" align="flex-start" mt="md" mr="sm">
            <Button onClick={exportToXML} leftSection={<IconFileCode size="1rem" />}>
              Eksporter til XML
            </Button>
            <ButtonMultiSelect
              bygningsElements={SELECTED_ELEMENTS_OPTIONS}
              selectedElements={selectedElements}
              handleElementChange={handleElementChange}
            />
          </Flex>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default ResultsTable;

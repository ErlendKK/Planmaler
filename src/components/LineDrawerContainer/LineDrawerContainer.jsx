import React, { memo, useEffect, useState, useCallback } from "react";
import {
  Container,
  Text,
  Box,
  Grid,
  Flex,
  NumberInput,
  Title,
  rem,
  Group,
  Fieldset,
  Select,
  Button,
  Space,
  ColorInput,
  Checkbox,
  useMantineTheme,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import "@mantine/dropzone/styles.css";
import { IconUpload, IconPhoto, IconX } from "@tabler/icons-react";
import styles from "./LineDrawerContainer.module.css";
import * as pdfjsLib from "pdfjs-dist";
// import "pdfjs-dist/build/pdf.worker.entry";
import("pdfjs-dist/build/pdf.worker.min.mjs").then(() => {
  console.log("PDF worker loaded");
});

import LineDrawer from "../LineDrawer";
import ResultsTable from "../ResultsTable";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// TODO: Fiks bug som gjør at ringen blir værende igjen etter jeg presser Esc.

const LineDrawerContainer = () => {
  const theme = useMantineTheme();

  const [imageFile, setImageFile] = useState(null);
  const [lineSegments, setLineSegments] = useState([]);
  const [errors, setErrors] = useState([]);
  const [metersPerPixel, setMetersPerPixel] = useState(0.15);
  const [roundAngleTo, setRoundAngleTo] = useState("90");
  const [roofHeight, setRoofHeight] = useState(2.7);
  const [drawingColor, setDrawingColor] = useState(theme.colors.customPrimary[7]);
  const [angleAdjustment, setAngleAdjustment] = useState(0);

  const [isCalibrationMode, setIsCalibrationMode] = useState(false);
  const [knownMeasurement, setKnownMeasurement] = useState(1);
  const [calibrationLineVisible, setCalibrationLineVisible] = useState(true);

  /**
   * Håndterer fullføring av tegning
   * @param {Object[]} segments - Linjesegmenter fra tegningen
   */
  const handleDrawingComplete = useCallback(
    (segments) => {
      const segmentsWithArea = segments.map((segment) => ({
        ...segment,
        area: segment.length * roofHeight,
      }));
      setLineSegments(segmentsWithArea);
    },
    [roofHeight]
  );

  /***********************************
   *****   HANDLE INPUT FILE   *******
   ***********************************/

  /**
   * Håndterer feil som oppstår under tegning
   * @param {string[]} errorList - Liste over feilmeldinger
   */
  const handleErrors = useCallback((errorList) => {
    setErrors(errorList);
  }, []);

  const convertPdfToImage = async (file) => {
    console.log("Starting PDF conversion");
    const arrayBuffer = await file.arrayBuffer();
    console.log("File converted to ArrayBuffer");

    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    console.log("PDF document loaded");

    const page = await pdf.getPage(1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    console.log("Canvas created with size:", canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    console.log("Page rendered to canvas");

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        console.log("Canvas converted to blob");
        resolve(blob);
      }, "image/png");
    });
  };

  const handleFileDrop = async (files) => {
    if (files.length <= 0) return;

    const file = files[0];
    console.log("File dropped:", file.name, file.type);
    try {
      let imageBlob;
      let isPdf = false;

      if (file.type === "application/pdf") {
        console.log("PDF file detected:", file.name);
        imageBlob = await convertPdfToImage(file);
        isPdf = true;
      } else {
        imageBlob = file;
      }

      console.log("Image blob created:", imageBlob);
      const imageUrl = URL.createObjectURL(imageBlob);
      console.log("Image URL created:", imageUrl);
      setImageFile({ file: imageBlob, url: imageUrl, isPdf, name: file.name });
      console.log("ImageFile state updated");
    } catch (error) {
      console.error("Error processing file:", error);
      setErrors(["Kunne ikke behandle filen. Vennligst prøv igjen."]);
    }
  };

  /**
   * Handles file rejection
   * @param {File[]} files - The rejected files
   */
  const handleFileReject = (files) => {
    console.log("rejected files", files);
    setErrors(["Filen ble avvist. Sørg for at det er en gyldig bilde- eller PDF-fil under 10MB."]);
  };

  /********************************
   *****   CALIBRATE SCALE  *******
   ********************************/

  /**
   * Starts the calibration process.
   * Sets the calibration mode to true and resets any existing calibration data.
   */
  const startCalibration = () => {
    if (!imageFile) {
      console.warn("Kalibrering kan ikke starte før plantegningen er lastet opp");
      return;
    }
    setIsCalibrationMode(true);
    // TODO: Reset any existing calibration data if necessary
    // TODO: add more reset logic?
  };

  /**
   * Handles the completion of the calibration process.
   * @param {number} newMetersPerPixel - The newly calculated length multiplier
   */
  const handleCalibrationComplete = useCallback((newMetersPerPixel) => {
    setMetersPerPixel(newMetersPerPixel);
    setIsCalibrationMode(false);
    // TODO: add a success message
  }, []);

  /**
   * Toggles the visibility of the calibration line.
   */
  const toggleCalibrationLineVisibility = () => {
    setCalibrationLineVisible((prev) => !prev);
  };

  const ImageDropZone = () => {
    return (
      <Dropzone
        onDrop={handleFileDrop}
        onReject={handleFileReject}
        maxSize={10 * 1024 ** 2}
        accept={[MIME_TYPES.pdf, MIME_TYPES.png, MIME_TYPES.jpeg]}
        h={200}
        mt="md"
        className={styles.dropzone}
      >
        <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: "none" }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(52), height: rem(52), color: theme.colors.customPrimary[7] }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ width: rem(52), height: rem(52), color: theme.colors.customPrimary[7] }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              style={{ width: rem(52), height: rem(52), color: theme.colors.customPrimary[7] }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              Slipp tegningen her eller klikk for å velge fil
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Aksepterer pdf eller bildefiler opp til 10MB
            </Text>
          </div>
        </Group>
      </Dropzone>
    );
  };

  return (
    <Container className={styles.LineDrawerContainer} radius={10}>
      {/* <Title weight={700}>Mål Plantegning</Title> */}
      <Space h="lg" />

      <ImageDropZone />

      <Fieldset legend="Kalibrer Målestokk" mb="lg" className={styles.Fieldset}>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Verdi til kalibrering (m)"
              value={knownMeasurement}
              onChange={(value) => setKnownMeasurement(value)}
              precision={2}
              step={0.1}
              min={0.1}
              styles={{
                root: {
                  maxWidth: "400px",
                },
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Målestokk (m/px)"
              value={metersPerPixel.toFixed(4)}
              onChange={(value) => {
                if (!isCalibrationMode) {
                  setMetersPerPixel(value);
                }
              }}
              precision={2}
              step={0.01}
              min={0.01}
              max={10}
              readOnly={isCalibrationMode}
              styles={{
                root: {
                  maxWidth: "400px",
                },
                input: {
                  backgroundColor: isCalibrationMode ? "var(--mantine-color-gray-1)" : undefined,
                },
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Flex
              align="end"
              gap="xs"
              styles={{
                root: {
                  maxWidth: "400px",
                },
              }}
            >
              <Button
                onClick={startCalibration}
                variant="outline"
                disabled={isCalibrationMode}
                styles={{
                  root: {
                    minWidth: "120px",
                  },
                }}
              >
                Start Kalibrering
              </Button>
              <Checkbox
                label="Vis kalibreringslinje"
                checked={calibrationLineVisible}
                onChange={toggleCalibrationLineVisibility}
              />
            </Flex>
          </Grid.Col>
        </Grid>
      </Fieldset>
      <Fieldset legend="Sett Parametere" mb="lg" className={styles.Fieldset}>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Sett himmelretning (forskyvning ift nord)"
              value={angleAdjustment}
              onChange={(value) => setAngleAdjustment(value)}
              precision={0}
              step={1}
              min={0}
              max={360}
              styles={{
                root: {
                  maxWidth: "400px",
                },
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Takhøyde (m)"
              value={roofHeight}
              onChange={(value) => setRoofHeight(value)}
              precision={2}
              step={0.1}
              min={0.1}
              styles={{
                root: {
                  maxWidth: "400px",
                },
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Rund av vinkler til nærmeste.."
              value={roundAngleTo}
              onChange={setRoundAngleTo}
              data={[
                { value: "1", label: "1 grad" },
                { value: "5", label: "5 grader" },
                { value: "10", label: "10 grader" },
                { value: "45", label: "45 grader" },
                { value: "90", label: "90 grader" },
              ]}
              styles={{
                root: {
                  maxWidth: "400px",
                },
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <ColorInput
              label="Velg farge for tegning"
              value={drawingColor}
              onChange={setDrawingColor}
              format="hex"
              swatches={[
                "#ffffff",
                "#868e96",
                "#fa5252",
                "#e64980",
                "#be4bdb",
                "#7950f2",
                "#4c6ef5",
                "#228be6",
                "#15aabf",
                "#12b886",
                "#40c057",
                "#82c91e",
                "#fab005",
                "#fd7e14",
              ]}
              styles={{
                root: {
                  maxWidth: "400px",
                },
              }}
            />
          </Grid.Col>
        </Grid>
      </Fieldset>

      {lineSegments.length > 0 && (
        <Fieldset legend="Resultater" mb="lg" className={styles.Fieldset}>
          <ResultsTable
            lineSegments={lineSegments}
            metersPerPixel={metersPerPixel}
            angleAdjustment={angleAdjustment}
            roofHeight={roofHeight}
          />
        </Fieldset>
      )}
      <Space h="md" />

      {imageFile && (
        <LineDrawer
          image={imageFile.file}
          onDrawingComplete={handleDrawingComplete}
          onErrors={handleErrors}
          metersPerPixel={metersPerPixel}
          roundAngleTo={Number(roundAngleTo)}
          drawingColor={drawingColor}
          isCalibrationMode={isCalibrationMode}
          onCalibrationComplete={handleCalibrationComplete}
          calibrationLineVisible={calibrationLineVisible}
          knownMeasurement={knownMeasurement}
        />
      )}

      {errors.length > 0 && (
        <Box mt="md">
          <Text fontcolor="red" size="sm">
            Errors:
          </Text>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Box>
      )}
    </Container>
  );
};

export default LineDrawerContainer;

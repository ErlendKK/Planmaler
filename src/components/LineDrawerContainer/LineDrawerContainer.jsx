import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Text,
  Box,
  Grid,
  Flex,
  NumberInput,
  rem,
  Group,
  Fieldset,
  Select,
  Button,
  Space,
  ColorInput,
  LoadingOverlay,
  useMantineTheme,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import "@mantine/dropzone/styles.css";
import { IconUpload, IconPhoto, IconX, IconAdjustments } from "@tabler/icons-react";

import * as pdfjsLib from "pdfjs-dist";
import("pdfjs-dist/build/pdf.worker.min.mjs").then(() => {
  console.log("PDF worker loaded");
});

import useNotifications from "../../hooks/useNotifications";
import LineDrawer from "../LineDrawer";
import ResultsTable from "../ResultsTable";
import styles from "./LineDrawerContainer.module.css";
import { DEFAULT_COLORS, FILE_SIZE_THRESHOLD } from "../../constants/line-drawer-constants";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// TODO: Fiks bug som gjør at ringen blir værende igjen etter jeg presser Esc.

const LineDrawerContainer = () => {
  const theme = useMantineTheme();
  const [isLoading, { open: openLoading, close: closeLoading }] = useDisclosure(false);
  const { showRedNotification } = useNotifications();
  // User inputs
  const [imageFile, setImageFile] = useState(null);
  const [metersPerPixel, setMetersPerPixel] = useState(0.15);
  const [roundAngleTo, setRoundAngleTo] = useState("90");
  const [roofHeight, setRoofHeight] = useState(2.7);
  const [drawingColor, setDrawingColor] = useState(theme.colors.customPrimary[7]);
  const [angleAdjustment, setAngleAdjustment] = useState(0);
  // Other state variables
  const [lineSegments, setLineSegments] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [getCanvasData, setGetCanvasData] = useState(null);
  const [isCalibrationMode, setIsCalibrationMode] = useState(false);
  const [isCalibrationDone, setIsCalibrationDone] = useState(false);
  const [previousMetersPerPixel, setPreviousMetersPerPixel] = useState(null);
  const [knownMeasurement, setKnownMeasurement] = useState(1);

  /**
   * Håndterer fullføring av tegning
   * @param {Object[]} segments - Linjesegmenter fra tegningen
   */
  const handleDrawingComplete = useCallback(
    (segments) => {
      console.log("Drawing completed, segments:", segments);
      const segmentsWithArea = segments.map((segment) => ({
        ...segment,
        area: segment.length * roofHeight,
      }));
      setLineSegments(segmentsWithArea);
      setIsFinished(true);
      console.log("isFinished set to true");
    },
    [roofHeight]
  );

  useEffect(() => {
    console.log("isFinished changed:", isFinished);
  }, [isFinished]);

  // Function to receive download access from LineDrawer
  const handleProvideDownloadAccess = useCallback((getDataFunction) => {
    setGetCanvasData(() => getDataFunction);
  }, []);

  // Function to handle download button click
  const handleDownload = useCallback(() => {
    if (getCanvasData) {
      const dataURL = getCanvasData();
      if (dataURL) {
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = "nummerert_tegning.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [getCanvasData]);

  /***********************************
   *****   HANDLE INPUT FILE   *******
   ***********************************/

  /**
   * Converts the first page of a PDF file to a PNG image.
   * @param {File} file - The PDF file to convert.
   * @returns {Promise<Blob>} A promise that resolves with a Blob containing the PNG image.
   * */
  const convertPdfToImage = async (file) => {
    // Display LoadingOverlay while converting large files
    if (file.size > FILE_SIZE_THRESHOLD) {
      openLoading();
    }
    try {
      console.log("Starting PDF conversion");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

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

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      });
    } finally {
      if (file.size > FILE_SIZE_THRESHOLD) {
        closeLoading();
      }
    }
  };

  const handleFileDrop = async (files) => {
    if (files.length <= 0) return;

    const file = files[0];
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

      const imageUrl = URL.createObjectURL(imageBlob);
      setImageFile({ file: imageBlob, url: imageUrl, isPdf, name: file.name });
      console.log("ImageFile state updated");
    } catch (error) {
      console.warn("Error processing file:", error);
      showRedNotification("Kunne ikke behandle filen.", "Vennligst prøv igjen.");
    }
  };

  /**
   * Informs the user that the file was rejected.
   */
  const handleFileReject = () => {
    showRedNotification("Filen ble avvist", "Vennligst last opp en gyldig PDF- eller bildefil.");
  };

  /********************************
   *****   CALIBRATE SCALE  *******
   ********************************/

  /**
   * Initiates or restarts the calibration process.
   * Stores the previous version of the metersPerPixel value.
   */
  const startCalibration = () => {
    if (!imageFile) {
      console.warn("Kalibrering kan ikke starte før plantegningen er lastet opp");
      return;
    }

    setPreviousMetersPerPixel(metersPerPixel);
    setIsCalibrationMode(true);
    console.log("Kalibrering startet. Tidligere skala:", metersPerPixel);
  };

  /**
   * Handles the completion of the calibration process.
   * Adjusts existing measurements based on the new calibration if necessary.
   * @param {number} newMetersPerPixel - The newly calculated meters per pixel value
   */
  const handleCalibrationComplete = useCallback(
    (newMetersPerPixel) => {
      // scaleFactor represents how much our measurements need to be adjusted
      const scaleFactor = newMetersPerPixel / previousMetersPerPixel;

      // Update existing measurements if there are any
      if (lineSegments.length > 0) {
        const updatedSegments = lineSegments.map((segment) => ({
          ...segment,
          length: segment.length * scaleFactor,
          area: segment.area * scaleFactor,
        }));
        setLineSegments(updatedSegments);
      }

      setMetersPerPixel(newMetersPerPixel);
      setIsCalibrationMode(false);
      setPreviousMetersPerPixel(null);
      setIsCalibrationDone(true);

      console.log(
        `Kalibrering fullført. Ny skala: ${newMetersPerPixel} Skala faktor: ${scaleFactor}`
      );
    },
    [lineSegments, previousMetersPerPixel]
  );

  const ImageDropZone = () => {
    return (
      <Dropzone
        onDrop={handleFileDrop}
        onReject={handleFileReject}
        maxSize={10 * 1024 ** 2}
        accept={[MIME_TYPES.pdf, MIME_TYPES.png, MIME_TYPES.jpeg]}
        h={200}
        mt="md"
        mb="md"
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
            <IconX style={{ width: rem(52), height: rem(52) }} stroke={1.5} />
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
    <Container size="lg" className={styles.LineDrawerContainer}>
      <Box pos="relative">
        <LoadingOverlay
          visible={isLoading}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ color: theme.colors.customPrimary[7], type: "bars" }}
        />
        <Space h="lg" />
        <ImageDropZone />

        {/* Fieldset for kalibrering */}
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
                className={styles.maxWidthContainer}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Målestokk (mm/px)"
                value={(metersPerPixel * 1000).toFixed(0)}
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
                className={styles.maxWidthContainer}
                styles={{
                  input: {
                    backgroundColor: isCalibrationMode ? "var(--mantine-color-gray-1)" : undefined,
                  },
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Flex align="end" gap="xs" className={styles.maxWidthContainer}>
                <Button
                  onClick={startCalibration}
                  variant="outline"
                  disabled={isCalibrationMode || lineSegments.length || !imageFile}
                  leftSection={<IconAdjustments size="1rem" />}
                >
                  {isCalibrationMode
                    ? "Kalibrering pågår"
                    : isCalibrationDone
                    ? "Start Rekalibrering"
                    : "Start Kalibrering"}
                </Button>
              </Flex>
            </Grid.Col>
          </Grid>
        </Fieldset>

        {/* Fieldset for parametere */}
        <Fieldset legend="Sett Parametere" mb="lg" className={styles.Fieldset}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Sett himmelretning (oppover)"
                value={angleAdjustment}
                onChange={(value) => setAngleAdjustment(value)}
                precision={0}
                step={1}
                min={0}
                max={360}
                className={styles.maxWidthContainer}
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
                className={styles.maxWidthContainer}
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
                label="Velg farge for oppmåling"
                value={drawingColor}
                onChange={setDrawingColor}
                format="hex"
                swatches={DEFAULT_COLORS}
                className={styles.maxWidthContainer}
              />
            </Grid.Col>
          </Grid>
        </Fieldset>

        {/* Resultater */}
        {lineSegments.length > 0 && (
          <Fieldset legend="Resultater" mb="lg" className={styles.Fieldset}>
            <ResultsTable
              lineSegments={lineSegments}
              metersPerPixel={metersPerPixel}
              angleAdjustment={angleAdjustment}
              roofHeight={roofHeight}
              onDownload={handleDownload}
              isFinished={isFinished}
            />
          </Fieldset>
        )}
        <Space h="md" />

        {/* Canvas for LineDrawer */}
        {imageFile && (
          <LineDrawer
            image={imageFile.file}
            onDrawingComplete={handleDrawingComplete}
            metersPerPixel={metersPerPixel}
            roundAngleTo={Number(roundAngleTo)}
            drawingColor={drawingColor}
            isCalibrationMode={isCalibrationMode}
            onCalibrationComplete={handleCalibrationComplete}
            knownMeasurement={knownMeasurement}
            provideDownloadAccess={handleProvideDownloadAccess}
          />
        )}
      </Box>
    </Container>
  );
};

export default LineDrawerContainer;

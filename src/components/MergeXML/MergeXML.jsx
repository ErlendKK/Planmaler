import React from "react";
import { Box, Button, List, Fieldset, Grid } from "@mantine/core";
import { IconLayersIntersect2 } from "@tabler/icons-react";
import { create } from "xmlbuilder2";

import useNotifications from "../../hooks/useNotifications";
import styles from "../LineDrawerContainer/LineDrawerContainer.module.css";

const MergeXML = ({ files, onMergeComplete }) => {
  const { showGreenNotification, showRedNotification } = useNotifications();

  const handleMerge = () => {
    if (files.length < 2) {
      return;
    }

    try {
      console.log("Starting XML to JS object conversion and merging");
      console.log("Number of files:", files.length);

      // Convert all XML files to JS objects
      const jsObjects = files.map((file, index) => {
        try {
          const xmlDoc = create(file.content);
          const jsObject = xmlDoc.end({ format: "object" });
          console.log(`XML File ${index + 1} (${file.name}) converted to JS object`);
          return jsObject;
        } catch (parseError) {
          console.error(`Error parsing XML file ${index + 1} (${file.name}):`, parseError);
          throw new Error(`Error parsing XML file ${file.name}: ${parseError.message}`);
        }
      });

      // Extract the base object (first file)
      const baseObject = jsObjects[0];

      // Extract zones from all other objects
      const zonesToMerge = jsObjects
        .slice(1)
        .flatMap((obj) =>
          obj.simien_project.zone
            ? Array.isArray(obj.simien_project.zone)
              ? obj.simien_project.zone
              : [obj.simien_project.zone]
            : []
        );

      // Merge zones into the base object
      if (!baseObject.simien_project.zone) {
        baseObject.simien_project.zone = [];
      } else if (!Array.isArray(baseObject.simien_project.zone)) {
        baseObject.simien_project.zone = [baseObject.simien_project.zone];
      }
      baseObject.simien_project.zone.push(...zonesToMerge);

      // Update the units attribute
      baseObject.simien_project["@units"] = baseObject.simien_project.zone.length.toString();

      // Update energymark included_zone
      if (baseObject.simien_project.energymark) {
        if (!baseObject.simien_project.energymark.included_zone) {
          baseObject.simien_project.energymark.included_zone = [];
        } else if (!Array.isArray(baseObject.simien_project.energymark.included_zone)) {
          baseObject.simien_project.energymark.included_zone = [
            baseObject.simien_project.energymark.included_zone,
          ];
        }
        zonesToMerge.forEach((zone) => {
          baseObject.simien_project.energymark.included_zone.push({ "@id": zone["@id"] });
        });
      }

      console.log("Merged object:", baseObject);

      exportMergedXML(baseObject);
    } catch (error) {
      console.error("XML filene kunne ikke kombineres:", error);
      showRedNotification("XML filene kunne ikke kombineres", `Error: ${error.message}`);
    }
  };

  const exportMergedXML = (baseObject) => {
    const xml = create({ version: "1.0", encoding: "UTF-8", standalone: "yes" });
    const root = xml.ele("simien_project");

    // Add attributes to the root element
    Object.entries(baseObject.simien_project).forEach(([key, value]) => {
      if (key.startsWith("@")) {
        root.att(key.slice(1), value);
      }
    });

    // Add child elements to simien_project
    Object.entries(baseObject.simien_project).forEach(([key, value]) => {
      if (!key.startsWith("@")) {
        addElement(root, key, value);
      }
    });

    function addElement(parent, key, value) {
      if (Array.isArray(value)) {
        value.forEach((item) => addElement(parent, key, item));
      } else if (typeof value === "object" && value !== null) {
        const element = parent.ele(key);
        Object.entries(value).forEach(([k, v]) => {
          if (k.startsWith("@")) {
            element.att(k.slice(1), v);
          } else {
            addElement(element, k, v);
          }
        });
      } else {
        parent.ele(key).txt(value);
      }
    }

    const xmlString = xml.end({ prettyPrint: true });

    // Create and trigger download
    const blob = new Blob([xmlString], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kombinerte_soner.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onMergeComplete();
    showGreenNotification(
      "XML filene ble kombinert",
      "Filen ble lastet ned som 'kombinerte_soner.xml'"
    );

    console.log("Merged XML exported successfully");
  };

  return (
    <Box mt="md">
      <Fieldset legend="Kombiner XML Filer:" mb="lg" className={styles.Fieldset}>
        <Grid gutter="md" justify="flex-start">
          <Grid.Col span="6">
            <List>
              {files.map((file, index) => (
                <List.Item key={index}>{file.name}</List.Item>
              ))}
            </List>
          </Grid.Col>
          <Grid.Col span="6">
            <Button
              onClick={handleMerge}
              disabled={files.length < 2}
              mt="md"
              leftSection={<IconLayersIntersect2 size="1rem" />}
            >
              Kombiner
            </Button>
          </Grid.Col>
        </Grid>
      </Fieldset>
    </Box>
  );
};

export default MergeXML;

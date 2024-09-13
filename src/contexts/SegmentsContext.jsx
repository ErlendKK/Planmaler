import React, { createContext, useContext, useState, useCallback } from "react";
import { calculatePolygonAreaFromLines } from "../utils/geometry";
import { getFacadeName } from "../utils/misc";

const SegmentsContext = createContext();

export const useSegments = () => useContext(SegmentsContext);

export const SegmentsProvider = ({ children }) => {
  const [completedZones, setCompletedZones] = useState([]);
  const [zoneConnections, setZoneConnections] = useState([]);

  const calculateZoneArea = useCallback((segments, metersPerPixel) => {
    if (segments.length < 3) {
      showRedNotification("Arealet er ikke beregnet", `Mål opp 3+ linjer for å beregne areal.`);
      return 0;
    }

    const lines = segments.map((segment, index) => {
      const nextIndex = (index + 1) % segments.length;
      return {
        startX: segment.startPoint.x,
        startY: segment.startPoint.y,
        endX: segments[nextIndex].startPoint.x,
        endY: segments[nextIndex].startPoint.y,
      };
    });
    return calculatePolygonAreaFromLines(lines) * metersPerPixel * metersPerPixel;
  }, []);

  const renumberAllSegments = (zones) => {
    let segmentNumber = 1;
    return zones.map((zone) => ({
      ...zone,
      segments: zone.segments.map((segment) => ({
        ...segment,
        number: segmentNumber++,
      })),
    }));
  };

  const addZone = useCallback(
    (segments, metersPerPixel, roofHeight, angleAdjustment) => {
      setCompletedZones((prevZones) => {
        const { newSegments, connectionSegments, connections, newZoneId, updatedPrevZones } =
          processZoneConnections(segments, prevZones);

        const segmentCount = updatedPrevZones.reduce((acc, zone) => acc + zone.segments.length, 0);
        let count = segmentCount + 1;
        const initializedSegments = newSegments.map((segment) => ({
          ...segment,
          number: count++,
          horizonSector1: 0,
          horizonSector2: 0,
          horizonSector3: 0,
          horizonSector4: 0,
        }));

        // Use both newSegments and connectionSegments for area calculation
        const zoneArea = calculateZoneArea(
          [...initializedSegments, ...connectionSegments],
          metersPerPixel
        );
        const defaultName = `Sone ${updatedPrevZones.length + 1}`;

        // Update zoneConnections
        setZoneConnections((prevConnections) => [...prevConnections, ...connections]);

        return [
          ...updatedPrevZones,
          {
            id: newZoneId,
            name: defaultName,
            segments: initializedSegments,
            connections: connections,
            area: zoneArea,
            roofHeight,
            angleAdjustment,
          },
        ];
      });
    },
    [calculateZoneArea, setZoneConnections]
  );

  const updateSegment = useCallback((zoneId, segmentIndex, updatedData) => {
    setCompletedZones((prevZones) =>
      prevZones.map((zone) =>
        zone.id === zoneId
          ? {
              ...zone,
              segments: zone.segments.map((segment, index) =>
                index === segmentIndex ? { ...segment, ...updatedData } : segment
              ),
            }
          : zone
      )
    );
  }, []);

  const processZoneConnections = (segments, prevZones) => {
    const newSegments = [];
    const connectionSegments = [];
    const connections = [];
    const newZoneId = Date.now();

    segments.forEach((segment) => {
      const match = findMatchingSegment(segment, prevZones);
      if (match) {
        connectionSegments.push(segment);
        connections.push({
          segment,
          zoneId1: match.zone.id,
          zoneId2: newZoneId,
        });
        match.zone.segments.splice(match.segmentIndex, 1);
      } else {
        newSegments.push(segment);
      }
    });

    // Renumber all segments in prevZones
    const updatedPrevZones = renumberAllSegments(prevZones);

    return { newSegments, connectionSegments, connections, newZoneId, updatedPrevZones };
  };

  const findMatchingSegment = (segment, completedZones) => {
    for (let zone of completedZones) {
      const matchingSegmentIndex = zone.segments.findIndex(
        (existingSegment) =>
          (existingSegment.startPoint.x === segment.startPoint.x &&
            existingSegment.startPoint.y === segment.startPoint.y &&
            existingSegment.endPoint.x === segment.endPoint.x &&
            existingSegment.endPoint.y === segment.endPoint.y) ||
          (existingSegment.startPoint.x === segment.endPoint.x &&
            existingSegment.startPoint.y === segment.endPoint.y &&
            existingSegment.endPoint.x === segment.startPoint.x &&
            existingSegment.endPoint.y === segment.startPoint.y)
      );
      if (matchingSegmentIndex !== -1) {
        return { zone, segmentIndex: matchingSegmentIndex };
      }
    }
    return null;
  };

  return (
    <SegmentsContext.Provider
      value={{
        completedZones,
        zoneConnections,
        addZone,
        updateSegment,
        calculateZoneArea,
      }}
    >
      {children}
    </SegmentsContext.Provider>
  );
};

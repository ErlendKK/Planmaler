import React, { useRef, useEffect, useState } from "react";
import { TextInput, lighten } from "@mantine/core";
import styles from "./HorizonSectorInput.module.css";

const HorizonSectorInput = ({ values, onChange }) => {
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState(formatValue(values));

  useEffect(() => {
    setInputValue(formatValue(values));
  }, [values]);

  function formatValue(vals) {
    return vals.map((v) => v.toString().padStart(2, "0")).join("-");
  }

  function parseValue(input) {
    return input.split("-").map((v) => parseInt(v, 10) || 0);
  }

  function handleChange(event) {
    const newInputValue = event.target.value;
    const cursorPosition = event.target.selectionStart;
    const updatedValue =
      newInputValue.slice(0, cursorPosition) + newInputValue.slice(cursorPosition + 1);
    console.log("cursorPosition", cursorPosition);
    console.log("newInputValue", newInputValue);
    console.log("updatedValue", updatedValue);

    let sections = updatedValue.split("-");
    let newValues = [0, 0, 0, 0];
    let newCursorPosition = cursorPosition;

    sections.forEach((section, index) => {
      if (section.length > 0) {
        let value = parseInt(section, 10);
        console.log(value);
        if (!isNaN(value)) {
          newValues[index] = Math.min(Math.max(value, 0), 90);
        }
      }
    });

    // Adjust cursor position if a section is complete
    if (cursorPosition % 3 === 2 && newInputValue[cursorPosition - 1] !== "-") {
      newCursorPosition++;
    }

    const formattedValue = formatValue(newValues);
    setInputValue(formattedValue);
    onChange(newValues);

    // Set cursor position after React updates the input
    setTimeout(() => {
      inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  }

  return (
    <TextInput
      ref={inputRef}
      value={inputValue}
      onChange={handleChange}
      placeholder="00-00-00-00"
      classNames={{
        root: styles.root,
        input: styles.input,
      }}
      styles={(theme) => ({
        input: {
          backgroundColor: lighten(theme.colors.dark[7], 0.95),
        },
      })}
    />
  );
};

export default HorizonSectorInput;

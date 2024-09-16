import React, { useRef, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { TextInput, lighten } from "@mantine/core";
import styles from "./HorizonSectorInput.module.css";

/**
 * Formats the input value as a string with 4 sections separated by dashes
 * @param {number[]} vals - The values to format
 * @returns {string} The formatted value
 */
function formatValue(values) {
  return values.map((v) => v.toString().padStart(2, "0")).join("-");
}

const HorizonSectorInput = ({ values, onChange, tabIndex }) => {
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState(formatValue(values));
  const [wait, setWait] = useState(false);

  // Update the formated version of input value when the values prop changes
  useEffect(() => {
    setInputValue(formatValue(values));
  }, [values]);

  /**
   * Updates the input value and cursor position based on the new value and the cursor position.
   * The cursor position is used to determine which section of the input value to update.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event
   * @returns {void}
   */
  function handleChange(event) {
    if (wait) return;

    // Remove the old character at the cursor position
    const newInputValue = event.target.value;
    const cursorPosition = event.target.selectionStart;
    const updatedValue =
      newInputValue.slice(0, cursorPosition) + newInputValue.slice(cursorPosition + 1);

    let sections = updatedValue.split("-");
    let newValues = [0, 0, 0, 0];
    let newCursorPosition = cursorPosition;

    sections.forEach((section, index) => {
      if (section.length > 0 && index < 4) {
        flushSync(() => setWait(true));

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

    // Set cursor position after React updates the input (pass to microtask queue)
    setTimeout(() => {
      setWait(false);
      inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  }

  function handlePaste(event) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    const sections = pastedText.split("-").slice(0, 4);
    const newValues = sections.map((section) => {
      const value = parseInt(section, 10);
      return isNaN(value) ? 0 : Math.min(Math.max(value, 0), 90);
    });
    while (newValues.length < 4) newValues.push(0);
    const formattedValue = formatValue(newValues);
    setInputValue(formattedValue);
    onChange(newValues);
  }

  return (
    <TextInput
      ref={inputRef}
      radius="md"
      value={inputValue}
      onChange={handleChange}
      onPaste={handlePaste}
      placeholder="00-00-00-00"
      tabIndex={tabIndex}
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

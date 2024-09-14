import React, { useEffect, useRef } from "react";
import { Box, Button, CheckIcon, Combobox, Group, useCombobox } from "@mantine/core";
import { IconSelector } from "@tabler/icons-react";

function ButtonMultiSelect({ bygningsElements, selectedElements, handleElementChange }) {
  const comboboxRef = useRef(null);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // Separate general and office-specific elements
  const generalElements = ["Tak", "Gulv"];
  const officeElements = ["Internlaster", "CAV", "VAV", "Oppvarming"];

  const renderOptions = (elements) =>
    elements.map((item) => (
      <Combobox.Option value={item} key={item}>
        <Group>
          {selectedElements.includes(item) && <CheckIcon size={12} />}
          <span>{item}</span>
        </Group>
      </Combobox.Option>
    ));

  // Close the dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        combobox.closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [combobox]);

  return (
    <Box ref={comboboxRef}>
      <Combobox
        store={combobox}
        width={250}
        position="bottom-start"
        withArrow
        withinPortal={false}
        onOptionSubmit={(val) => {
          handleElementChange(val);
          // Don't close dropdown here, allowing multiple selections
        }}
      >
        <Combobox.Target>
          <Button
            variant="outline"
            leftSection={<IconSelector size="1rem" />}
            onClick={() => combobox.toggleDropdown()}
          >
            Velg Elementer
          </Button>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            <Combobox.Group label="Generelt">{renderOptions(generalElements)}</Combobox.Group>
            <Combobox.Group label="Kontor">{renderOptions(officeElements)}</Combobox.Group>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  );
}

export default ButtonMultiSelect;

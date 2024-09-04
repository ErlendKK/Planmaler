import React from "react";
import {
  Box,
  Button,
  CheckIcon,
  Combobox,
  Group,
  List,
  Flex,
  useCombobox,
  Stack,
} from "@mantine/core";
import { IconSelector } from "@tabler/icons-react";
import { Container } from "postcss";

function ButtonMultiSelect({ bygningsElements, selectedElements, handleElementChange }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const options = bygningsElements.map((item) => (
    <Combobox.Option value={item} key={item}>
      <Group>
        {selectedElements.includes(item) && <CheckIcon size={12} />}
        <span>{item}</span>
      </Group>
    </Combobox.Option>
  ));

  return (
    <Box>
      <Combobox
        store={combobox}
        width={250}
        position="bottom-start"
        withArrow
        withinPortal={false}
        onOptionSubmit={(val) => {
          handleElementChange(val);
          combobox.closeDropdown();
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
          <Combobox.Options>{options}</Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      {selectedElements.length > 0 && (
        <List mt="xs">
          {selectedElements.map((item) => (
            <List.Item key={item}>{item}</List.Item>
          ))}
        </List>
      )}
    </Box>
  );
}

export default ButtonMultiSelect;

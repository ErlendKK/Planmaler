import { useState, useEffect } from "react";
import { Select, lighten } from "@mantine/core";
import styles from "./SelectWithInput.module.css";
import { DEFAULT_VARMELAGRING_FASADE } from "../../constants/results-table-constants";

const SelectWithInput = ({ value, onChange, data, tabIndex }) => {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = (newValue) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleInputChange = (newValue) => {
    setInputValue(newValue);
    if (data.includes(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <Select
      data={data}
      value={value}
      onChange={handleChange}
      searchable
      clearable={false}
      placeholder={DEFAULT_VARMELAGRING_FASADE}
      onSearchChange={handleInputChange}
      searchValue={inputValue.trim()}
      nothingFoundMessage="Ingen treff"
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

export default SelectWithInput;

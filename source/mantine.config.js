import { createTheme } from "@mantine/core";

const theme = createTheme({
  primaryColor: "customPrimary",
  colors: {
    customPrimary: [
      "#e8f0ec",
      "#d1e1d9",
      "#b9d2c6",
      "#a2c3b3",
      "#8ab4a0",
      "#73a58d",
      "#5b967a",
      "#378566", // <-- main color
      "#2a6b4f",
      "#1d5038",
    ],
  },
});

export default theme;

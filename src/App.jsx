import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import LineDrawerContainer from "./components/LineDrawerContainer";
import "./App.css";
import theme from "../mantine.config";

function App() {
  return (
    <MantineProvider theme={theme}>
      <div className="App">
        <LineDrawerContainer />
      </div>
    </MantineProvider>
  );
}

export default App;

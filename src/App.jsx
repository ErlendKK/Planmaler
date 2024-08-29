import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import "@mantine/core/styles.css";
import LineDrawerContainer from "./components/LineDrawerContainer";
import "./App.css";
import theme from "../mantine.config";

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications containerWidth="420px" limit={5} notificationMaxHeight={100} />
      <div className="App">
        <LineDrawerContainer />
      </div>
    </MantineProvider>
  );
}

export default App;

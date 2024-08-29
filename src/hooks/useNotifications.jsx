import { notifications } from "@mantine/notifications";
import { IconX, IconCheck, IconExclamationMark } from "@tabler/icons-react";
import { rem, useMantineTheme } from "@mantine/core";

const useNotifications = () => {
  const theme = useMantineTheme();

  const customGreen = theme.colors["customPrimary"][6]; // deep green
  const customRed = "#e74c3c"; // soft red
  const customYellow = "#f39c12"; // warm yellow

  const showRedNotification = (title, message = null, time = 2200) => {
    notifications.show({
      title: title,
      message: message,
      color: customRed,
      autoClose: time,
      icon: <IconX style={{ width: rem(18), height: rem(18) }} />,
    });
  };

  const showGreenNotification = (title, message = null, time = 2500) => {
    notifications.show({
      title: title,
      message: message,
      color: customGreen,
      autoClose: time,
      icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
    });
  };

  const showYellowNotification = (title, message = null, time = 3000) => {
    notifications.show({
      title: title,
      message: message,
      color: customYellow,
      autoClose: time,
      icon: <IconExclamationMark style={{ width: rem(18), height: rem(18) }} />,
    });
  };

  const showBlueNotification = (title, message = null, time = 2500) => {
    notifications.show({
      title: title,
      message: message,
      color: theme.colors.blue[6],

      autoClose: time,
      icon: <IconExclamationMark style={{ width: rem(18), height: rem(18) }} />,
    });
  };

  return {
    showRedNotification,
    showGreenNotification,
    showYellowNotification,
    showBlueNotification,
  };
};

export default useNotifications;

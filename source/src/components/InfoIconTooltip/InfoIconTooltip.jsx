import { IconInfoCircle } from "@tabler/icons-react";
import { Tooltip, Text, List } from "@mantine/core";

const InfoIconTooltip = ({ textInput, listItems }) => {
  return (
    <div>
      {" "}
      <Tooltip
        label={
          <div>
            <Text size="md" mb="xs">
              {textInput}
            </Text>
            <List size="sm" spacing="3px">
              {listItems && listItems.map((item) => <List.Item key={item}>{item}</List.Item>)}
            </List>
          </div>
        }
        position="top"
        withArrow
        multiline
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <IconInfoCircle size={16} style={{ marginLeft: "5px" }} />
        </span>
      </Tooltip>
    </div>
  );
};

export default InfoIconTooltip;

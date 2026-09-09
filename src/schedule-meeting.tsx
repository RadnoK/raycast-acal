import type { LaunchProps } from "@raycast/api";
import Planner from "./components/planner";
export default function Command(
  props: LaunchProps<{ arguments: { prompt?: string } }>,
) {
  return <Planner initialPrompt={props.arguments.prompt || ""} />;
}

import { join } from "node:path";

import { FooterComponent, getAgentDir } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

import { createExtension } from "./extension.mjs";

const configPath = join(getAgentDir(), "pi-compact-ex.json");

export default createExtension(configPath, FooterComponent, truncateToWidth);

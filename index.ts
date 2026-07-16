import { join } from "node:path";

import { getAgentDir } from "@earendil-works/pi-coding-agent";

import { createExtension } from "./extension.mjs";

const configPath = join(getAgentDir(), "pi-compact-ex.json");

export default createExtension(configPath);

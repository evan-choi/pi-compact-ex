import { FooterComponent } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

import { createExtension } from "./extension.mjs";

export default createExtension(undefined, FooterComponent, truncateToWidth);

/*import config from "./config.json" assert { type: "json" };

export {
  config,
}*/

import { readFileSync } from "fs";

export const config = JSON.parse(
  readFileSync(new URL("./config.json", import.meta.url), "utf8")
);

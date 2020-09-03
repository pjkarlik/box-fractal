import Render from "./App";
import { description, version } from "../version.json";

require("../resources/styles/styles.css");

const args = [
  `\n${description} %c ver ${version} \n`,
  "background: #000; padding:5px 0;border-top-left-radius:10px;border-bottom-left-radius:10px;",
];

window.console.log.apply(console, args);
window.onload = () => {
  const demo = new Render();
  return demo;
};

import fs from "fs";

// Set up global variablesfarmMobs
const settings_file_name = "settings.json";
let settings = load_settings();
let named_points = settings["named_points"] || {};
let mode = null;
let prevHealth = null;
let defaultMove = null;
let bot = null;

function load_settings() {
  try {
    return JSON.parse(fs.readFileSync(settings_file_name));
  } catch (error) {
    if (
      error.message ===
      "ENOENT: no such file or directory, open 'settings.json'"
    ) {
      return {};
    } else {
      throw error;
    }
  }
}

function save_settings() {
  const data = JSON.stringify(settings, undefined, 4);
  fs.writeFileSync(settings_file_name, data);
}

export default {
  settings,
  named_points,
  mode,
  prevHealth,
  defaultMove,
  settings_file_name,
  load_settings,
  save_settings,
  bot,
};

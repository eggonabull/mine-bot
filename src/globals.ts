import * as mineflayer from "mineflayer";
import * as pathfinder_pkg from "mineflayer-pathfinder";
import * as fs from "fs";

// Set up global variablesfarmMobs
const settings_file_name = "settings.json";
export let settings = load_settings();
export let named_points = settings["named_points"] || {};
export let mode: string | null = null;
export let prevHealth: number | null = null;
export let defaultMove: pathfinder_pkg.Movements | null = null;
export let bot: mineflayer.Bot | null = null;

const noFileError = "ENOENT: no such file or directory, open 'settings.json'";

export function load_settings() {
  try {
    return JSON.parse(fs.readFileSync(settings_file_name).toString());
  } catch (error) {
    // @ts-ignore
    if (error.message === noFileError) {
      return {};
    } else {
      throw error;
    }
  }
}

export function setPrevHealth(h: number) {
  prevHealth = h;
}

export function setMode(m: string | null) {
  mode = m;
}

export function setBot(b: mineflayer.Bot) {
  bot = b;
}

export function getBot(): mineflayer.Bot {
  if (!bot) {
    throw new Error("bot is not set");
  }
  return bot;
}

export function getDefaultMove(): pathfinder_pkg.Movements {
  if (!defaultMove) {
    throw new Error("defaultMove is not set");
  }
  return defaultMove;
}

export function setDefaultMove(m: pathfinder_pkg.Movements) {
  defaultMove = m;
}

export function save_settings() {
  const data = JSON.stringify(settings, undefined, 4);
  fs.writeFileSync(settings_file_name, data);
}

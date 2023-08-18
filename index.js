import mineflayer from "mineflayer";
import pathfinder_pkg from "mineflayer-pathfinder";
import autoeat from "mineflayer-auto-eat";
import { Vec3 } from "vec3";
import { getDistances, itemToString, drop, pickUpItems } from "./shared.js";
import { farmMobs } from "./mob-farm.js";
import { farmCrops } from "./plant-farm.js";
import { goToBed } from "./bed.js";
import { doTreeMining, placeSaplings } from "./tree-farm.js";
import { mVoidDump, mDepositItems } from "./inventory.js";
import g from "./globals.js";

const { pathfinder, Movements } = pathfinder_pkg;
const { GoalNear, GoalFollow } = pathfinder_pkg.goals;
let settings = g.settings;
let defaultMove = null;

// Initialize bot
const bot = mineflayer.createBot({
  host: settings.host, // minecraft server ip
  username: settings.username, // minecraft username
  auth: settings.auth, // for offline mode servers, you can set this to 'offline'
});
g.bot = bot;

// Load plugins
bot.loadPlugin(pathfinder);
bot.loadPlugin(autoeat.plugin);

// Bind event handlers
bot.once("spawn", () => {
  g.defaultMove = new Movements(bot);
  defaultMove = g.defaultMove;
  defaultMove.blocksCantBreak.add(538); // oak_slab
  defaultMove.blocksCantBreak.add(253); // fence
  defaultMove.blocksCantBreak.add(13); // oak_block
  defaultMove.blocksCantBreak.add(8); // grass
  defaultMove.blocksCantBreak.add(9); // dirt
  defaultMove.blocksCantBreak.add(175); // oak_stairs
  defaultMove.blocksCantBreak.add(176); // chest
  defaultMove.blocksCantBreak.add(183); // farmland
  defaultMove.blocksCantBreak.add(116); // white_bed
  defaultMove.blocksCantBreak.add(102); // red_bed
  defaultMove.blocksCantBreak.add(181); // crafting_table
  defaultMove.blocksCantBreak.add(194); // oak_door
  defaultMove.canOpenDoors = true;
  defaultMove.allowSprinting = false;
  bot.pathfinder.setMovements(defaultMove);

  bot.autoEat.options = {
    priority: "foodPoints",
    startAt: 18,
    bannedFood: [],
  };

  bot.on("chat", function (username, message) {
    chat_handler(username, message);
  });

  // bot.on('blockUpdate', function (block) {
  //   console.log("blockupdate", arguments)
  // })

  // bot.on("entityUpdate", function (entity) {
  //   console.log("entityUpdate", entity)
  // });

  bot.on("health", () => {
    if (g.prevHealth) {
      if (bot.health < g.prevHealth) {
        bot.chat(`I'm taking damage!  ${bot.health}`);
        if (bot.entity.position.y < -30) {
          bot.chat(
            `I've probably fallen ${bot.entity.position.x}, ${bot.entity.position.y}, ${bot.entity.position.z}. My health is ${bot.health}. My hunger is ${bot.food}/${bot.foodSaturation}`,
          );
          g.mode = null;
          bot.quit();
          bot.pathfinder.stop();
        }
        if (bot.health < 14) {
          bot.chat("I'm scared, bye");
          g.mode = null;
          bot.quit();
          bot.pathfinder.stop();
        }
      }
    }
    g.prevHealth = bot.health;
    if (bot.food === 20) {
      // Disable the plugin if the bot is at 20 food points
      bot.autoEat.disable();
    } else {
      bot.autoEat.enable();
    }
  });
});

function chat_handler(username, message) {
  if (username === bot.username) return;
  const target = bot.players[username] ? bot.players[username].entity : null;
  const short_name =
    bot.username === "SnowMalt"
      ? "snow"
      : bot.username == "rainflavor"
      ? "rf"
      : "buttface";
  const prelude_regex = new RegExp(
    "^(" + bot.username + "|" + short_name + ") ",
    "gi",
  );
  console.log(username + ": " + message);
  if (!prelude_regex.exec(message)) {
    return;
  }
  message = message.toLowerCase().replace(prelude_regex, "");
  const split_message = message.split(" ");
  const args = split_message.slice(1);
  const command = split_message[0];
  if (command === "come") {
    if (!target) {
      bot.chat("I don't see you !");
      return;
    }
    const p = target.position;
    bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1));
  } else if (command === "hide" || command === "quit") {
    bot.chat("See you later!");
    g.mode = null;
    bot.quit();
  } else if (command === "distance") {
    const dist = getDistances(target.position);
    bot.chat(
      `Our y-distance is ${dist.ydiff} and our horizontal distance is ${
        Math.round(dist.posdiff * 100) / 100
      }`,
    );
  } else if (command === "blockinfo") {
    const p = target.position;
    const foot_block = bot.blockAt(p);
    const floor_block = bot.blockAt(new Vec3(p.x, p.y - 1, p.z));
    const chest_block = bot.blockAt(new Vec3(p.x, p.y + 1, p.z));
    console.log("foot_block", foot_block);
    console.log("floor_block", floor_block);
    console.log("chest_block", chest_block);
    if (floor_block.name != "air") {
      bot.chat(`Your feet are above ${floor_block.name} ${floor_block.type}`);
    }
    if (foot_block.name != "air") {
      bot.chat(`Your feet are in ${foot_block.name} ${foot_block.type}`);
    }
    if (chest_block.name != "air") {
      bot.chat(`You're standing in ${chest_block.name} ${chest_block.type}`);
    }
  } else if (command === "deposit") {
    mDepositItems();
  } else if (command === "point") {
    if (!target) {
      bot.chat("I don't see you !");
      return;
    }
    const name = args[0];
    const pos = target.position.floored();
    g.named_points[name] = pos;
    g.save_settings();
    bot.chat(`Checkpoint ${name} set to ${pos}`);
  } else if (command === "list") {
    bot.chat("Okay, listing");
    const items = bot.inventory.items();
    const output = items.map(itemToString).join(", ");
    if (output) {
      bot.chat(output);
    } else {
      bot.chat("empty");
    }
  } else if (command === "status") {
    bot.chat(
      `My health is ${Math.round(bot.health * 100) / 100} and my hunger is ${
        bot.food
      }, ${Math.round(bot.foodSaturation * 10) / 10}`,
    );
    if (g.mode) {
      bot.chat(`My current task is ${g.mode}`);
    }
  } else if (command === "tree") {
    g.mode = "tree";
    doTreeMining();
  } else if (command === "plant") {
    placeSaplings();
  } else if (command === "follow") {
    bot.pathfinder.setGoal(new GoalFollow(target, 3), true);
  } else if (command === "tidy") {
    pickUpItems();
  } else if (command === "stop") {
    g.mode = null;
    //bot.pathfinder.stop()
  } else if (command === "drop") {
    drop(args.length && args[0]);
  } else if (command === "fight") {
    bot.chat("Who do I look like? Fuckin' Rambo?");
  } else if (command === "farm-mobs") {
    farmMobs();
  } else if (command === "inv") {
    mVoidDump();
  } else if (command === "farm") {
    if (args.length === 0) {
      bot.chat("What do you want me to farm?");
      return;
    }
    farmCrops(args[0]);
  } else if (command === "sleep") {
    goToBed(true);
  } else if (g.named_points[command]) {
    const p = g.named_points[command];
    bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1));
  }
}

// Log errors and kick reasons:
bot.on("kicked", console.log);
bot.on("error", console.log);

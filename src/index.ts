import * as mineflayer from "mineflayer";
import * as pathfinder_pkg from "mineflayer-pathfinder";
import * as autoeat from "mineflayer-auto-eat";
import { Vec3 } from "vec3";
import {
  getDistances,
  itemToString,
  drop,
  pickUpItems,
  equip_by_name,
} from "./shared";
import { farmMobs, createSwords } from "./mob-farm";
import { farmCrops } from "./plant-farm";
import { goToBed } from "./bed";
import { doTreeMining, placeSaplings } from "./tree-farm";
import { mVoidDump, mDepositItems } from "./inventory";
import * as g from "./globals";

const { pathfinder, Movements } = pathfinder_pkg;
const { GoalNear, GoalFollow, GoalPlaceBlock } = pathfinder_pkg.goals;
let settings = g.settings;

// Initialize bot
const bot = mineflayer.createBot({
  host: settings.host, // minecraft server ip
  username: settings.username, // minecraft username
  auth: settings.auth, // for offline mode servers, you can set this to 'offline'
});
g.setBot(bot);
bot.loadPlugins([pathfinder, autoeat.plugin]);

// Bind event handlers
bot.once("spawn", () => {
  const defaultMove = new Movements(bot);
  g.setDefaultMove(defaultMove);
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

  bot.autoEat.options = {
    priority: "foodPoints",
    startAt: 18,
    bannedFood: [],
    checkOnItemPickup: true,
    eatingTimeout: 2000,
    equipOldItem: true,
    ignoreInventoryCheck: false,
    offhand: false,
  };

  bot.pathfinder.setMovements(defaultMove);

  bot.on("chat", function (username, message) {
    chat_handler(username, message);
  });

  // bot.on('blockUpdate', function (block) {
  //   console.log("blockupdate", arguments)
  // })

  // bot.on("entityUpdate", function (entity) {
  //   console.log("entityUpdate", entity)
  // });

  bot.on("autoeat_error", (err) => {
    console.log("autoeat_error", err);
  });
  bot.on("autoeat_started", () => {
    console.log("autoeat_started");
  });
  bot.on("autoeat_finished", () => {
    console.log("autoeat_finished");
  });

  bot.on("health", async () => {
    console.log("health", bot.health, bot.food);
    if (bot.food === 20 && !bot.autoEat.disabled) {
      // Disable the plugin if the bot is at 20 food points
      console.log("disable autoeat");
      bot.autoEat.disable();
    }
    if (bot.autoEat.disabled && bot.food < 19) {
      console.log("enable autoeat");
      bot.autoEat.enable();
    }
    if (g.prevHealth) {
      if (bot.health < g.prevHealth) {
        console.log(`I lost health ${bot.health}`);
        bot.chat(`I'm taking damage!  ${bot.health}`);
        if (bot.health < 10) {
          bot.chat("I'm scared, bye");
          g.setMode(null);
          bot.quit();
          bot.pathfinder.stop();
        }
        if (bot.entity.position.y < -63.7) {
          bot.chat(
            `I've probably fallen ${bot.entity.position.x}, ${bot.entity.position.y}, ${bot.entity.position.z}. My health is ${bot.health}. My hunger is ${bot.food}/${bot.foodSaturation}`,
          );
          bot.quit();
          bot.pathfinder.stop();
        }
        console.log("g.mode", g.mode);
        if (g.mode === "farmMobs" || g.mode === "testfight") {
          bot.chat("I'm taking damage, probably from a tiny");
          g.setMode(null);
          await attack_tinies();
        }
      }
    }
    g.setPrevHealth(bot.health);
  });
});

async function attack_tinies() {
  let hit = 20;
  const p = g.named_points["refuge"];
  const goto = bot.pathfinder.goto(new GoalNear(p.x, p.y, p.z, 1));
  while (hit) {
    for (const entity_id in bot.entities) {
      const entity = bot.entities[entity_id];
      if (!entity) {
        continue;
      }
      // @ts-ignore
      if (entity.type !== "hostile") {
        continue;
      }
      if (entity.mobType !== "Zombie") {
        continue;
      }

      if (
        // @ts-ignore
        !entity.attributes ||
        // @ts-ignore
        !entity.attributes["minecraft:generic.movement_speed"]?.modifiers
          ?.length
      ) {
        continue;
      }
      if (!entity.metadata || entity.metadata.length == 0) {
        continue;
      }
      const edist = getDistances(entity.position);
      if (edist.ydiff > 2 || edist.posdiff > 5) {
        continue;
      }
      hit = 20;
      bot.attack(entity);
    }
    await bot.waitForTicks(5);
    hit--;
  }
  await goto;
  bot.chat("I'm done attacking tinies");
  await bot.waitForTicks(20);
  g.setMode("farmMobs");
  farmMobs();
}

function chat_handler(username: string, message: string) {
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
    g.setMode(null);
    bot.quit();
  } else if (command === "distance") {
    if (!target) {
      bot.chat("I don't see you!");
      return;
    }
    const dist = getDistances(target.position);
    bot.chat(
      `Our y-distance is ${dist.ydiff} and our horizontal distance is ${
        Math.round(dist.posdiff * 100) / 100
      }`,
    );
  } else if (command === "blockinfo") {
    if (!target) {
      bot.chat("I don't see you!");
      return;
    }
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
  } else if (command === "mode") {
    args && g.setMode(args[0]);
    bot.chat(`Okay, mode is ${g.mode}`);
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
    g.setMode("tree");
    doTreeMining();
  } else if (command === "plant") {
    placeSaplings();
  } else if (command === "follow") {
    if (!target) {
      bot.chat("I don't see you !");
      return;
    }
    bot.pathfinder.setGoal(new GoalFollow(target, 3), true);
  } else if (command === "tidy") {
    pickUpItems();
  } else if (command === "stop") {
    g.setMode(null);
    //bot.pathfinder.stop()
  } else if (command === "drop") {
    drop((args.length && args[0]) || undefined);
  } else if (command === "fight") {
    bot.chat("Who do I look like? Fuckin' Rambo?");
  } else if (command === "farm-mobs") {
    farmMobs();
  } else if (command === "inv") {
    mVoidDump();
  } else if (command === "eat") {
    (async () => {
      bot.chat("Okay eating");
      await equip_by_name("carrot");
      if (bot.food < 20) {
        await bot.consume();
      }
    })();
  } else if (command === "mobinfo") {
    for (const entity_id in bot.entities) {
      const entity = bot.entities[entity_id];
      if (!entity) {
        continue;
      }
      // @ts-ignore
      if (entity.type !== "hostile") {
        continue;
      }
      if (entity.mobType !== "Zombie") {
        continue;
      }
      if (
        // @ts-ignore
        !entity.attributes ||
        // @ts-ignore
        !entity.attributes["minecraft:generic.movement_speed"]?.modifiers
          ?.length
      ) {
        continue;
      }
      if (!entity.metadata || entity.metadata.length == 0) {
        continue;
      }
      const edist = getDistances(entity.position);
      if (edist.ydiff > 2 || edist.posdiff > 4) {
        continue;
      }
      console.log("see tiny", entity);
    }
  } else if (command === "farm") {
    if (args.length === 0) {
      bot.chat("What do you want me to farm?");
      return;
    }
    farmCrops(args[0]);
  } else if (command === "bridge") {
    if (!target) {
      bot.chat("I don't see you!");
      return;
    }
    const dist = (args[0] && parseInt(args[0])) || 50;
    let origin = target.position.floored();
    const direction = (target.pitch, target.yaw);

    let normal;
    if (
      ((7 * Math.PI) / 4 <= target.yaw && target.yaw < 2 * Math.PI) ||
      (0 <= target.yaw && target.yaw < Math.PI / 4)
    ) {
      console.log(" Negative z -- North");
      normal = new Vec3(0, 0, -1);
    } else if (Math.PI / 4 <= target.yaw && target.yaw < (3 * Math.PI) / 4) {
      console.log(" Negative x -- West");
      normal = new Vec3(-1, 0, 0);
    } else if (
      (3 * Math.PI) / 4 <= target.yaw &&
      target.yaw < (5 * Math.PI) / 4
    ) {
      console.log(" Positive z -- South");
      normal = new Vec3(0, 0, 1);
    } else if (
      (5 * Math.PI) / 4 <= target.yaw &&
      target.yaw < (7 * Math.PI) / 4
    ) {
      console.log(" Positive x -- East");
      normal = new Vec3(1, 0, 0);
    } else {
      console.log("yaw", target.yaw * (180 / Math.PI));
    }

    if (!normal) {
      bot.chat("I don't know which way you're facing");
      return;
    }

    bridge(origin, normal, dist);
  } else if (command === "swords") {
    createSwords();
  } else if (command === "sleep") {
    goToBed(true);
  } else if (g.named_points[command]) {
    const p = g.named_points[command];
    bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1));
  }
}

async function bridge(player_position: Vec3, normal: Vec3, dist: number) {
  const origin = player_position;
  let working_pos = origin.add(new Vec3(0, -1, 0));

  while (bot.blockAt(working_pos).name != "air") {
    console.log("new origin", origin);
    working_pos = working_pos.add(normal);
  }

  while (working_pos.xzDistanceTo(origin) < dist) {
    console.log("origin", origin);
    // export interface GoalPlaceBlockOptions {
    //   range: number;
    //   LOS: boolean;
    //   faces: Vec3[];
    //   facing: 'north' | 'east' | 'south' | 'west' | 'up' | 'down';
    // }
    console.log("normal", normal);
    console.log(normal.minus(normal).minus(normal));

    //bot.pathfinder.goto(new GoalPlaceBlock(origin, bot.world, { range: 4, LOS: false, faces: [normal], facing: "east" }));
    await bot.pathfinder.goto(
      new GoalNear(working_pos.x, working_pos.y, working_pos.z, 4),
    );
    const invert_normal = normal.minus(normal).minus(normal);

    // base
    equip_by_name("oak_planks");
    await bot.activateBlock(bot.blockAt(working_pos), invert_normal);
    await bot.waitForTicks(2);
    await bot.activateBlock(
      bot.blockAt(working_pos.plus(new Vec3(normal.z, 0, -normal.x))),
      invert_normal,
    );
    await bot.waitForTicks(2);
    await bot.activateBlock(
      bot.blockAt(working_pos.plus(new Vec3(-normal.z, 0, normal.x))),
      invert_normal,
    );
    await bot.waitForTicks(2);

    equip_by_name("oak_slab");
    const slab_pos = working_pos.plus(new Vec3(0, 1, 0));
    await bot.activateBlock(bot.blockAt(slab_pos), invert_normal);
    await bot.waitForTicks(2);
    await bot.activateBlock(
      bot.blockAt(slab_pos.plus(new Vec3(normal.z, 0, -normal.x))),
      invert_normal,
    );
    await bot.waitForTicks(2);
    await bot.activateBlock(
      bot.blockAt(slab_pos.plus(new Vec3(-normal.z, 0, normal.x))),
      invert_normal,
    );
    await bot.waitForTicks(2);

    working_pos = working_pos.plus(normal);
  }
}

// Log errors and kick reasons:
bot.on("kicked", console.log);
bot.on("error", console.log);

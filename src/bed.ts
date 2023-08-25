//
import * as pathfinder_pkg from "mineflayer-pathfinder";
import { sleep } from "./shared";
import * as g from "./globals";

const { GoalNear } = pathfinder_pkg.goals;

async function goToBed(direct: boolean = false) {
  const bot = g.getBot();
  const defaultMove = g.getDefaultMove();
  console.log(
    "goToBed",
    direct,
    direct !== true,
    bot.time.isDay,
    bot.thunderState,
  );
  if (direct !== true) {
    if (bot.time.isDay && !(bot.isRaining && bot.thunderState > 0)) {
      return;
    }
  }
  const ids = [
    bot.registry.blocksByName["white_bed"].id,
    bot.registry.blocksByName["red_bed"].id,
  ];
  const beds = bot.findBlocks({
    matching: ids,
    maxDistance: 128,
    count: 3,
  });
  console.log("beds", beds);
  if (beds.length === 0) {
    bot.chat("I don't see any beds");
    return;
  }
  for (let bed_index = 0; bed_index < beds.length; bed_index++) {
    const bed_vec = beds[bed_index];
    const bed_goal = new GoalNear(bed_vec.x, bed_vec.y, bed_vec.z, 1);
    const path = bot.pathfinder.getPathTo(defaultMove, bed_goal);
    if (!path) {
      continue;
    }
    console.log("bed_goal", bed_goal);
    await bot.pathfinder.goto(bed_goal);
    bot.lookAt(bed_vec);
    try {
      await bot.sleep(bot.blockAt(bed_vec));
      bot.chat("I'm in bed");
      await sleep(2000);
      while (!bot.time.isDay) {
        await sleep(2000);
      }
      bot.chat("I feel so refreshed");
    } catch (error) {
      console.log(error);
      // @ts-ignore
      bot.chat(error.message);
    }
    return;
  }
  bot.chat("I couldn't get to any beds");
}

export { goToBed };

#!/usr/bin/env node
var secrets = require("./secrets");
var mineflayer = require("mineflayer");
var navigatePlugin = require("mineflayer-navigate")(mineflayer);
var scaffoldPlugin = require("mineflayer-scaffold")(mineflayer);
var requireIndex = require("requireindex");
var fs = require("fs");
var path = require("path");

function init(argv) {
  var bot = mineflayer.createBot({
    host: "192.168.1.9", // optional
    port: 25565, // optional
    username: secrets.username,
    password: secrets.password,
  });
  bot.nick = secrets.nick;
  bot.connected = true;
  bot.on("end", function () {
    bot.connected = false;
    process.exit();
  });
  bot.setTimeout = function (fn, delay) {
    setTimeout(function () {
      if (bot.connected) {
        fn();
      }
    }, delay);
  };
  navigatePlugin(bot);
  scaffoldPlugin(bot);
  var plugins = requireIndex(path.join(__dirname, "lib", "plugins"));
  for (plugin in plugins) {
    if (plugins[plugin].inject != null) {
      plugins[plugin].inject(bot);
    } else {
      console.log(plugin, "has no inject function.");
    }
  }
}

/*
process.on('uncaughtException', (e) => {
  console.log(e);
});
*/

init();

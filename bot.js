var mineflayer = require('mineflayer');
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var scaffoldPlugin = require('mineflayer-scaffold')(mineflayer);
var bot = mineflayer.createBot({
  host: "192.168.1.9",   // optional
  port: 25565,         // optional
  username: "username",
  password: "password"
});
navigatePlugin(bot);
scaffoldPlugin(bot);
bot.on('chat', function(username, message) {
  if (username === bot.username) return;
  console.log("player", bot.players);
  console.log("username", username);

  message.split(" ")
  
  if (message === 'come') {
    var target = bot.players[username].entity;
    if(target === null) {
      bot.chat("You're too far away, where are you?");
      return;
    }
    bot.scaffold.to(target.position, function(err) {
      if (err) {
        bot.chat("didn't make it: " + err.code);
      } else {
        bot.chat("made it!");
      }
    });
  } else {
    bot.chat(message);
  }
});

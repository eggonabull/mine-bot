var vec3 = require("vec3")

module.exports = {
    inject: inject
};

function inject(bot) {
    bot.on('chat', function(username, message) {
        if (username === bot.username)
            return;
        var messageParts = message.split(" ");
        if (messageParts.length < 2)
            return;
        var name = messageParts.shift();
        var action = messageParts.shift();
        if (name !== bot.nick) {
            return;
        }

        try {
            if (action in actions) {
                actions[action](username, messageParts);
            }    
        } catch (e) {
            bot.chat(e.toString())
        }
        
    });

    var zeroVec = vec3(0, 0, 0);

    var actions = new(function ActionList() {

        this.where = function(username, args) {
            console.log(bot.position);
            bot.chat(bot.entity.position.toString());
        }

        this.come = function(username, args) {
            var target = bot.players[username].entity;
            if (target === null) {
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
        }

        this.say = function(username, args) {
            bot.chat(args.join(" "));
        }

        this.offsetx10 = function(username, args) {
            var botPosition = bot.entity.position.offset(10, 0, 0);
            bot.scaffold.to(botPosition, function(err) {
                if (err) {
                    bot.chat("didn't make it: " + err.code);
                } else {
                    bot.chat("made it!");
                }
            });
        }

        this.list = function(username, args) {
            var id, count, item;
            var output = "";
            bot.chat("Taking inventory...");
            console.log(bot.inventory.items());
            items = bot.inventory.items()
            for (id in items) {
                item = items[id]
                output += item.name + ": " + item.count + ", ";
            }
            bot.chat(output);
        }

        this.dig = function(username, args) {
            console.log("entering dig routine");
            if (bot.targetDigBlock) {
                bot.chat("already digging " + bot.targetDigBlock.name);
            } else {
                var target = bot.blockAt(bot.entity.position.offset(0, -1,  0));
                if (target && bot.canDigBlock(target)) {
                    bot.chat("starting to dig " + target.name);
                    bot.dig(target, onDiggingCompleted);
                } else {
                    bot.chat("cannot dig");
                }
            }

            function onDiggingCompleted() {
                bot.chat("finished digging " + target.name);
            }
        }

        this.leave = function(username, args) {
            bot.quit("Fuck you guys");
        }

        this.eval = function(username, args) {
            if(username !== "eggonabull") {
                return;
            }

            console.log(eval(args.join(" ")))
        }


        this.goto = function (username, args) {
            console.log("goto", username, args)

            if(args.length < 2) {
                logSay("You have to tell me where you want me to go to.");
                return;
            }

            var x, y, z;
            
            x = args[0]
            if(args.length == 2) {
                z = parseInt(args[1]);
            } else {
                y = parseInt(args[1])
                z = parseInt(args[2])
            }
            


            var botPosition = bot.entity.position.clone();
            logSay("my position: " + botPosition.toString())
            var desiredLocation = vec3(x, botPosition.y, z);
            logSay("desired location: " + desiredLocation.toString())
            var desiredOffset = desiredLocation.minus(botPosition);
            logSay("desired offset: " + desiredOffset.toString())
            var offsetDistance = zeroVec.distanceTo(desiredOffset);
            logSay("offset distance: " + offsetDistance.toString())

            var scaledOffset = desiredOffset.scaled(1 / offsetDistance * 100).floored();
            logSay("scaledOffset: " + scaledOffset.toString())
            var localTarget = bot.entity.position.plus(scaledOffset);
            var highestBlockForColumn = findHighestBlockInColumn(localTarget.x, localTarget.z);
            localTarget.y =  highestBlockForColumn.position.y;
            logSay("localTarget: " + localTarget.toString());

            var actions = this;
            bot.scaffold.to(localTarget.floored(), function(err) {
                if (err) {
                    bot.chat("didn't make it: " + err.code);
                    if(bot.entity.position.equals(botPosition)) {
                        bot.chat("didn't move, stopping");
                    } else {
                        logSay("made it somewhere, continuing.", args);
                        bot.setTimeout(function () { actions.goto(username, args); }, 1000);
                    }
                } else {
                    logSay("made it to " + bot.entity.position.x + " " + bot.entity.position.z);
                    bot.setTimeout(function () { actions.goto(username, args); }, 1000);
                }
            });
        }

        function logSay() {
            bot.chat(arguments[0]);
            console.log(arguments);
        }

        this.highest = function(username, args) {
            if(args.length < 2) {
                bot.chat("You'll have to tell me where to look.");
                return;
            }

            var x = parseInt(args.shift());
            var z = parseInt(args.shift());
            var blox = findHighestBlockInColumn(x, z);
            bot.chat("The highest block at " + x + " " + z + " is a " + block.name + " at " + block.position.y);
        }

        function findHighestBlockInColumn(x, z) {
            console.log("highest", x, z);
            var position = bot.entity.position;
            for(var y = 254; y >= 0; y--) {
                var block = bot.blockAt(vec3(x, y, z));
                if(block === null) {
                    bot.chat("I can't see as far as " + x + " " + y);
                    return;
                }
                if(block.name != "air") {
                    break;
                }
            }
            return block;
        }
    })();
}
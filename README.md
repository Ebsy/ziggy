ziggy
===

an irc bot in node

## usage

````js
var Ziggy = require('ziggy').Ziggy,
    ziggy = new Ziggy({ server: "irc.freenode.org",
                        nickname: "Gushie",
                        channels: ["#quantumleap", "#sliderssucks"] });
````

Ta-da! You've got a bot online.

What's that? You want it to do something? Oh. Sorry. You can make a plugin for it!

## example plugin

````js
module.exports = function (ziggy) {
  ziggy.on('pm', function (user, text) {
    ziggy.say(user.nick, "Speak up, I can't hear you.");
  });
  ziggy.on('message', function (user, channel, text) {
    var bits = text.split(' '),
        command = bits.shift();
    if (command === '!reverse') {
      ziggy.say(channel, bits.reverse().join(' '));
    }
    if (command === '!upper') {
      ziggy.say(channel, bits.join(' ').toUpperCase());
    }
    if (command === '!lower') {
      ziggy.say(channel, bits.join(' ').toLowerCase());
    }
  });
  
}
````

Save something like that as, say, dumb-plugin.js and then modify your main code a bit.

````js
var Ziggy = require('ziggy').Ziggy,
    dumbPlugin = require('dumb-plugin.js'),
    ziggy = new Ziggy({ server: "irc.freenode.org",
                        nickname: "Gushie",
                        plugins: [dumbplugin],
                        channels: ["#quantumleap", "#sliderssucks"] });
````

Now we're talkin'. Pretty self-explanatory, but it will respond to all private messages with "Speak up, I can't hear you."
as well as responding to in-channel "commands" like !reverse, !upper, and !lower with the replies associated.

## events

### `ready`
bot has connected to the server

### `message (user, channel, text)`
when a message is sent in a channel

### `pm (user, text)`
when a private message is received

### `nick (oldNick, user, channels)`
when a person changes their nickname

### `mode (channel, setBy, mode, argument)`
when a mode is set

### `topic (channel, topic, nick)`
when a topic is set

### `part (user, channel, reason)`
when a person parts a channel

### `ziggypart (channel)`
when ziggy parts a channel

### `quit (user, reason)`
when a user quits IRC

### `kick (kicked, kickedBy, channel, reason)`
when a person is kicked

### `invite (channel, user)`
when a channel invitation is received

### `join (channel, user)`
when a person joins a channel

### `ziggyjoin (channel)`
when the bot joins a channel

## API

### `say(to, text)`
where to can be a nickname or a channel

### `part(channels, callback)`
channels can be an array of channels or a string for a single channel

### `join(channels, callback)`
channels can be an array of channels or a string for a single channel

### `whois(nick, callback)`
perform a whois for `nick`, all of the user information will be passed as the first argument to `callback`

### `disconnect(message, callback)`
disconnect bot from IRC with optional message

### `channels`
return list of channels

### `channel(channel)`
get info about `channel`

### `users(callback)`
calls callback with user list

### `user(nick)`
return user information

### `level(channel)`
get bot level on `channel`

### `colorize(text, color)`
returns text formatted with `color`

## license
MIT

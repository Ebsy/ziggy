var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    irc = require('irc'),
    noop = function () {};

function activatePlugins(ziggy) {
  var i = 0,
      l = ziggy.settings.plugins.length;
  for (; i < l; ++i) {
    ziggy.settings.plugins[i](ziggy);
  }
}

function populateUsers(ziggy) {
  var users = Object.keys(ziggy.settings.users),
      i = 0,
      l = users.length
  for (; i < l; ++i) {
    ziggy.settings.users[users[i]].shared = {
      userLevel: ziggy.settings.users[users[i]].userLevel,
      authenticated: false,
      whois: null
    };
  }
}

function massExecute(ziggy, command, items, callback) {

  callback = callback || noop;

  var i = 0,
      l = items.length;

  for (; i < l; ++i) {
    if (i !== l - 1) { callback = noop; }
    this[command](items[i], callback);
  }

}

function userList(ziggy, callback) {
  var users = Object.keys(this.settings.users),
      i = 0,
      l = users.length,
      userList = {};

  for (; i < l; ++i) {
    userList[users[i]] = this.settings.users[users[i]].shared;
    if (i === l) { callback && callback(userList); }
  }
}

function lookupUser(ziggy, nickname) {
  var userInfo = ziggy.settings.users[nickname] ? ziggy.settings.users[nickname].shared : null;
  return {
    nick: nickname,
    info: userInfo
  };
}

function Ziggy(settings) {

  this.settings = Object.create(settings);
  populateUsers(this);
  activatePlugins(this);

  this.client = new irc.Client(this.settings.server, this.settings.nickname,
                               { channels: this.settings.channels,
                                 userName: 'ziggy',
                                 realName: 'Ziggy',
                                 secure: this.settings.secure });

  this.client.on('registered', function () {
    this.emit('ready');
  }.bind(this));

  this.client.on('message#', function (nick, to, text, message) {
    var user = lookupUser(this, nick);
    this.emit('message', user, to, text);
  }.bind(this));

  this.client.on('pm', function (nick, text, message) {
    var user = lookupUser(this, nick);
    this.emit('pm', user, text);
  }.bind(this));

  this.client.on('nick', function (oldnick, newnick, channels) {
    if (this.settings.users[oldnick]) {
      this.settings.users[newnick] = Object.create(this.settings.users[oldnick]);
      delete this.settings.users[oldnick];
    }
    var i = 0,
        l = channels.length;

    for (; i < l; ++i) {
      this.settings.channels[channels[i]].users[newnick] = Object.create(this.settings.channels[channels[i]].users[oldnick]);
      delete this.settings.channels[channels[i]].users[oldnick];
    }

    this.emit('nick', oldnick, lookupUser(this, newnick), channels);

  }.bind(this));

  this.client.on('+mode', function (channel, by, mode, argument) { 
    var setBy = userLookup(this, by);
    if (mode === 'o' || mode === 'v') {
      var currentLevel = this.settings.channels[channel].users[argument].shared.level;
      if (currentLevel !== '@') {

        var userMode = '';

        if (mode == 'o') {
          this.emit('op', channel, setBy, userLookup(this, argument));
          userMode = '@';
        } else {
          this.emit('voice', channel, setBy, userLookup(this, argument));
          userMode = '+';
        }
        
        this.settings.channels[channel].users[argument].shared.level = userMode;
      }
    } else {
      this.emit('mode', channel, setBy, '+' + mode, argument);
    }
  }.bind(this));
  this.client.on('-mode', function (channel, by, mode, argument) { 
    var setBy = userLookup(this, by);
    if (mode === 'o' || mode === 'v') {
      var currentLevel = this.settings.channels[channel].users[argument].shared.level;
      if (currentLevel !== '') {
        
        var userMode = '';

        if (mode == 'o') {
          this.emit('deop', channel, setBy, userLookup(this, argument));
        } else {
          userMode = currentLevel == '@' ? '@' : '';
          this.emit('devoice', channel, setBy, userLookup(this, argument));
        }

        this.settings.channels[channel].users[argument].shared.level = userMode;
      }
    } else {
      this.emit('mode', channel, setBy, '-' + mode, argument);
    }
  }.bind(this));

  this.client.on('topic', function (channel, topic, nick, message) {
    
    this.settings.channels[channel].topic = {
      text: topic,
      setBy: lookupUser(this, nick)
    };

    this.emit('topic', channel, topic, nick, message);
  }.bind(this));
  this.client.on('names', function (channel, nicks) {
    var nicknames = Object.keys(nicks),
        i = 0,
        l = nicknames.length;
    if (!this.settings.channels[channel]) { this.settings.channels[channel] = {}; }
    if (!this.settings.channels[channel].users) { this.settings.channels[channel].users = {}; }
    for (; i < l; ++i) {
      this.settings.channels[channel].users[nicknames[i]] = lookupUser(this, nicknames[i]);
      this.settings.channels[channel].users[nicknames[i]].level = nicks[nicknames[i]];
    }
  }.bind(this));
  this.client.on('part', function (channel, nick, reason, message) {
    if (nick === this.settings.nickname) {
      this.emit('ziggypart', channel);
    } else {
      user = lookupUser(this, nick);
      delete this.settings.channels[channel].users[nick];
      this.emit('part', user, channel, reason);
    }
  }.bind(this));
  this.client.on('quit', function (nick, reason, channels, message) {
    var user = lookupUser(this, nick),
        i = 0,
        l = channels.length;

    for (; i < l; ++i) {
      if (this.settings.channels[channels[i]] && this.settings.channels[channels[i]][nick]) {
        delete this.settings.channels[channel[i]][nick];
      }
    }
    this.emit('quit', user, reason);

  }.bind(this));
  this.client.on('kick', function (channel, nick, by, reason) {
    var kicked = userLookup(this, nick),
        kicker = userLookup(this, by);

    if (this.settings.channels[channel][nick]) {
      delete this.settings.channels[channel][nick];
    }

    this.emit('kick', kicked, kicker, channel, reason);
  }.bind(this));
  this.client.on('invite', function (channel, from, message) {
    var user = lookupUser(this, from);
    this.emit('invite', channel, user);
  }.bind(this));
  this.client.on('join', function (channel, nick, message) {
    if (nick === this.settings.nickname) {
      this.emit('ziggyjoin', channel, message);
    } else {
      user = lookupUser(this, nick);
      this.settings.channels[channel].users[nick] = user;
      this.emit('join', channel, user, message);
    }
  }.bind(this));
}

Ziggy.prototype.part = function (channels, callback) {

  callback = callback || noop;

  if (channels instanceof Array) {
    massExecute(this, 'part', channels, callback);
    return;
  }

  this.client.part(channels, function () {
    if (this.settings.channels[channels]) {
      delete this.settings.channels[channels];
    }
    callback();
  }.bind(this));

};

Ziggy.prototype.join = function (channels, callback) {

  callback = callback || noop;

  if (channels instanceof Array) {
    massExecute(this, 'join', channels, callback);
    return;
  }

  this.client.join(channels, function () {
    if (!this.settings.channels[channels]) {
      this.settings.channels[channels] = {};
      callback();
    }
  }.bind(this));
};

Ziggy.prototype.whois = function (nick, callback) {
  this.client.whois(nick, function (info) {
    if (!this.settings[nick]) { this.settings[nick] = {}; }
    this.settings.users[nick].shared.whois = info;
    callback && callback(lookupUser(this, nick));
  }.bind(this));
};

Ziggy.prototype.colorize = irc.colors.wrap;

Ziggy.prototype.say = function (target, message) {
  return this.client.say(target, message);
};

Ziggy.prototype.disconnect = function (message, callback) {
  this.client.disconnect(message, callback);
};

Ziggy.prototype.channels = function () {
  return this.settings.channels;
};

Ziggy.prototype.channel = function (channel) {
  return this.settings.channels[channel];
};

Ziggy.prototype.users = function (callback) {
  userList(this, function (list) {
    callback && callback(list);
  });
};

Ziggy.prototype.user = function (nickname) {
  return lookupUser(this, nickname);
};

Ziggy.prototype.level = function (channel) {
  return this.settings.channels[channel][this.settings.nickname].shared.level;
};

function start(options) {
  
  var settings = {};

  settings.server = options.server || 'irc.freenode.org';
  settings.channels = options.channels || [];
  settings.nickname = options.nickname || 'Ziggy';
  settings.plugins = options.plugins || [];
  settings.password = options.password || '';
  settings.users = options.users || {};
  settings.secure = options.secure;

  return new Ziggy(settings);

}

util.inherits(Ziggy, EventEmitter);

module.exports = start;

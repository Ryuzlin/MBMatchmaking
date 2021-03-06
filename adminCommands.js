const util = require('util');
const config = require('./config/config');
const character = require('./config/character');
const commands = require('./commands');

module.exports = {
  showTemp: showTemp,
  showSpam: showSpam,
  test: test
};

function showTemp(arg, msg, client) {
    if(!hasPermission(msg.author.id)) return;

    msg.reply(`\ntemp: ${util.inspect(commands.temp)}\n` +
        `temp lenght: ${commands.temp.length}\n\n`);
}

function showSpam(arg, msg, client) {
    if(!hasPermission(msg.author.id)) return;

    msg.reply(`\nspam: ${util.inspect(commands.spam)}\n` +
        `spam lenght: ${commands.spam.length}\n\n`);
}

function test(arg, msg, client) {
    if(!hasPermission(msg.author.id)) return;
    console.log(character["StreetFighterV"].type.length);

    if(character["StreetFighterV"].type.length > 0) {
        msg.author.send(`Sim`);
    } else {
        msg.author.send(`Não`);
    }
    
}

function hasPermission(authorID) {
    if(authorID == config.ownerID) return true; else return false;
}
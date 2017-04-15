const util = require('util');
const Discord = require("discord.js");
const config = require('./config/config');
const commands = require('./commands');
const adminCommands = require('./adminCommands');

const client = new Discord.Client();


client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}!\n-`);
});

client.on('error', (e) => console.error("error: " + e));
client.on('warn', (e) => console.warn("warn: " + e));
//client.on('debug', (e) => console.info("debug: " + e));

client.on('message', msg => {
	if (msg.author.id == client.user.id) {
		console.log(`Bot's message...\n`);
		return;
	} else if(!msg.content.startsWith(config.prefix) || msg.guild === null) return;

	console.log(`Author: ${msg.author.username} (${msg.author.id})\n` + 
		`Server: ${msg.guild.name} (${msg.guild.id})\n` + 
		`Channel: ${msg.channel.name} (${msg.channel.id})\n` + 
		`Content: ${util.inspect(msg.content)} (${msg.id})\n`);
	
	let arg = msg.content.toLocaleLowerCase().replace(/ +/g, ' ').split(' ');
	if (arg[0] === config.prefix + 'report') {
		commands.reportMatch(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'confirm')) {
		commands.confirm(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'deny')) {
		commands.deny(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'ranking')) {
		commands.ranking(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'findchar')) {
		commands.findChar(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'mypoints')) {
		commands.myPoints(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'help') || arg[0].startsWith(config.prefix + 'commands')) {
		commands.help(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'showtemp')) {
		adminCommands.showTemp(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'showspam')) {
		adminCommands.showSpam(arg, msg, client);
	} else if (arg[0].startsWith(config.prefix + 'test')) {
		adminCommands.test(arg, msg, client);
	}
});

client.login(config.loginKey);
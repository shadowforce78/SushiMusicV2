require('dotenv').config();
const fs = require('fs');
const DiscordBot = require('./client/DiscordBot');
const musicQueue = require('./utils/MusicQueue');

fs.writeFileSync('./terminal.log', '', 'utf-8');

// Initialiser la base de données music
console.log('Initializing music database system...');
musicQueue.restoreAllSessions().then(() => {
    console.log('Music database system ready!');
}).catch(console.error);

const client = new DiscordBot();

module.exports = client;

client.connect();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
const { ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

module.exports = new ApplicationCommand({
    command: {
        name: 'ping',
        description: 'Replies with Pong!',
        type: 1,
        options: []
    },
    options: {
        cooldown: 5000
    },
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {

        const superSexyEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Pong!')
            .setDescription(`Latency: ${Date.now() - interaction.createdTimestamp}ms\nAPI Latency: ${Math.round(client.ws.ping)}ms`)
            .setTimestamp()
            .setFooter({ text: 'SushiMusic Bot', iconURL: client.user.displayAvatarURL() });
        await interaction.reply({
            embeds: [superSexyEmbed],
            ephemeral: true
        });
    }
}).toJSON();
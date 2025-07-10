const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const run = require('@saumondeluxe/musicord-dl')

module.exports = new ApplicationCommand({
    command: {
        name: 'download',
        description: 'Downloads a mp3 file from a given youtube URL.',
        type: 1,
        options: [
            {
                name: 'url',
                description: 'The YouTube URL to download.',
                type: 3,
                required: true
            }
        ]
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
        const url = interaction.options.getString('url');
        if (!url) {
            return interaction.reply({
                content: 'Please provide a valid YouTube URL.',
                ephemeral: true
            });
        }
        try {
            await interaction.reply({
                content: 'Downloading your file, please wait...',
                ephemeral: true
            })
            const filePath = await run(url, { format: 'mp3' });
            await interaction.editReply({
                content: `Download complete! You can find your file here: `,
                files: [filePath],
                ephemeral: true
            });
        } catch (error) {
            console.error('Download error:', error);
            await interaction.reply({
                content: 'An error occurred while downloading the file. Please try again later.',
                ephemeral: true
            });
        }
    }
}).toJSON();
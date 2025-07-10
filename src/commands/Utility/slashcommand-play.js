const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
module.exports = new ApplicationCommand({
    command: {
        name: 'play',
        description: 'Plays a song from YouTube.',
        type: 1,
        options: [
            // {
            //     name: 'url',
            //     description: 'The YouTube URL of the song to play.',
            //     type: 3,
            //     required: true
            // } For later
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
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({
                content: 'You need to be in a voice channel to use this command.',
                ephemeral: true
            });
        }

        const file = 'C:\\Users\\adamp\\Desktop\\DevProject\\SushiMusicV2\\LOCO_LOCO_PDL-qQxXoN4.mp3';

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        
        const player = createAudioPlayer();
        const resource = createAudioResource(file);
        connection.subscribe(player);
        player.play(resource);
        await interaction.reply({
            content: `Now playing: ${file}`,
            ephemeral: true
        });

        player.on('finish', () => {
            console.log('Finished playing audio file:', file);
        });
        player.on('error', error => {
            console.error('Error playing audio file:', error);
            interaction.followUp({
                content: 'An error occurred while trying to play the audio file.',
                ephemeral: true
            });
        });

    }
}).toJSON();
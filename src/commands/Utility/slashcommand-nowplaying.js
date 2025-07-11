const { ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const musicQueue = require('../../utils/MusicQueue');

module.exports = new ApplicationCommand({
    command: {
        name: 'nowplaying',
        description: 'Shows currently playing song with control buttons.',
        type: 1,
        options: []
    },
    options: {
        cooldown: 3000,
    },

    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        const status = musicQueue.getStatus(interaction.guild.id);
        
        if (!status || !status.currentSong) {
            return interaction.reply({
                content: '❌ No music is currently playing.',
                ephemeral: true
            });
        }

        // Créer l'embed avec les informations de la chanson
        const embed = new EmbedBuilder()
            .setTitle('🎵 Now Playing')
            .setDescription(`**${status.currentSong.title}**`)
            .addFields(
                {
                    name: '🎭 Status',
                    value: status.isPaused ? '⏸️ Paused' : '▶️ Playing',
                    inline: true
                },
                {
                    name: '🔊 Volume',
                    value: `${status.volume}%`,
                    inline: true
                },
                {
                    name: '📝 Queue',
                    value: `${status.queueLength} songs`,
                    inline: true
                },
                {
                    name: '👤 Requested by',
                    value: status.currentSong.requestedBy,
                    inline: true
                },
                {
                    name: '🔗 URL',
                    value: `[YouTube Link](${status.currentSong.url})`,
                    inline: true
                }
            )
            .setColor(status.isPaused ? 0xffa500 : 0x00ff00)
            .setTimestamp();

        // Créer les boutons de contrôle
        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_pause_resume')
                    .setLabel(status.isPaused ? 'Resume' : 'Pause')
                    .setEmoji(status.isPaused ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('Skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!status.hasQueue),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('Stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
            );

        const volumeRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('volume_down')
                    .setLabel('-10%')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('volume_up')
                    .setLabel('+10%')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('show_queue')
                    .setLabel('Show Queue')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!status.hasQueue)
            );

        await interaction.reply({
            embeds: [embed],
            components: [controlRow, volumeRow],
            ephemeral: false
        });
    }
}).toJSON()
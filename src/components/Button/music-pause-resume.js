const { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Component = require("../../structure/Component");
const musicQueue = require("../../utils/MusicQueue");

module.exports = new Component({
    customId: "music_pause_resume",
    type: "button",

    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */

    run: async (client, interaction) => {
        const result = musicQueue.pause(interaction.guild.id);
        
        if (!result || !result.success) {
            return interaction.reply({
                content: '❌ No music is currently playing.',
                ephemeral: true
            });
        }

        const status = musicQueue.getStatus(interaction.guild.id);
        
        // Mettre à jour l'embed
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

        // Mettre à jour les boutons
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

        await interaction.update({
            embeds: [embed],
            components: [controlRow, volumeRow]
        });

        // Notification dans le chat
        await interaction.followUp({
            content: `🎵 Music ${result.action}`,
            ephemeral: true
        });
    }
}).toJSON()
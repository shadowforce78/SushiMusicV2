const { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Component = require("../../structure/Component");
const musicQueue = require("../../utils/MusicQueue");

module.exports = new Component({
    customId: "volume_down",
    type: "button",

    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */

    run: async (client, interaction) => {
        const status = musicQueue.getStatus(interaction.guild.id);
        if (!status || !status.currentSong) {
            return interaction.reply({
                content: '❌ No music is currently playing.',
                ephemeral: true
            });
        }

        const newVolume = Math.max(0.0, status.volume / 100 - 0.1);
        const result = musicQueue.setVolume(interaction.guild.id, newVolume);
        
        if (!result || !result.success) {
            return interaction.reply({
                content: '❌ Failed to change volume.',
                ephemeral: true
            });
        }

        // Mettre à jour l'affichage
        await this.updateNowPlayingDisplay(interaction, result.volume);
        
        await interaction.followUp({
            content: `🔉 Volume decreased to ${result.volume}%`,
            ephemeral: true
        });
    },

    async updateNowPlayingDisplay(interaction, volume) {
        const status = musicQueue.getStatus(interaction.guild.id);
        
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
                    value: `${volume}%`,
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
    }
});

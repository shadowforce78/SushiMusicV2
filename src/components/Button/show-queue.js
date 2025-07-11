const { ButtonInteraction, EmbedBuilder } = require("discord.js");
const Component = require("../../structure/Component");
const musicQueue = require("../../utils/MusicQueue");

module.exports = new Component({
    customId: "show_queue",
    type: "button",

    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */

    run: async (client, interaction) => {
        const queue = musicQueue.getQueue(interaction.guild.id);
        
        if (!queue || queue.songs.length === 0) {
            return interaction.reply({
                content: '📋 The queue is empty.',
                ephemeral: true
            });
        }

        let queueText = '';
        const maxSongs = 10; // Limiter l'affichage à 10 chansons
        
        for (let i = 0; i < Math.min(queue.songs.length, maxSongs); i++) {
            const song = queue.songs[i];
            queueText += `**${i + 1}.** ${song.title}\n   └ *Requested by ${song.requestedBy}*\n\n`;
        }

        if (queue.songs.length > maxSongs) {
            queueText += `*... and ${queue.songs.length - maxSongs} more songs*`;
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Music Queue')
            .setDescription(queueText || 'No songs in queue')
            .addFields({
                name: '📊 Queue Stats',
                value: `Total songs: **${queue.songs.length}**`,
                inline: false
            })
            .setColor(0x0099ff)
            .setTimestamp()
            .setFooter({
                text: `Use /skip to skip to the next song`
            });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
});

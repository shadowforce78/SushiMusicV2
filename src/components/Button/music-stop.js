const { ButtonInteraction } = require("discord.js");
const Component = require("../../structure/Component");
const musicQueue = require("../../utils/MusicQueue");

module.exports = new Component({
    customId: "music_stop",
    type: "button",

    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */

    run: async (client, interaction) => {
        await musicQueue.cleanup(interaction.guild.id);
        
        await interaction.reply({
            content: '⏹️ Music stopped and queue cleared!',
            ephemeral: true
        });

        // Mettre à jour le message pour indiquer que la musique s'est arrêtée
        try {
            await interaction.message.edit({
                embeds: [{
                    title: '⏹️ Music Stopped',
                    description: 'Queue has been cleared',
                    color: 0xff0000,
                    timestamp: new Date()
                }],
                components: [] // Supprimer tous les boutons
            });
        } catch (error) {
            console.error('Error updating message after stop:', error);
        }
    }
});

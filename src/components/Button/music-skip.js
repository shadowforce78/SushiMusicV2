const { ButtonInteraction } = require("discord.js");
const Component = require("../../structure/Component");
const musicQueue = require("../../utils/MusicQueue");

module.exports = new Component({
    customId: "music_skip",
    type: "button",

    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */

    run: async (client, interaction) => {
        const success = await musicQueue.skip(interaction.guild.id);
        
        if (!success) {
            return interaction.reply({
                content: '❌ No songs in queue to skip to.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: '⏭️ Skipped to next song!',
            ephemeral: true
        });

        // Mettre à jour l'affichage du now playing après un court délai
        setTimeout(async () => {
            const status = musicQueue.getStatus(interaction.guild.id);
            if (status && status.currentSong) {
                // Re-déclencher la commande nowplaying pour mettre à jour l'affichage
                // On va juste disabled les boutons pour indiquer que la chanson a changé
                const disabledRow1 = interaction.message.components[0];
                const disabledRow2 = interaction.message.components[1];
                
                // Désactiver tous les boutons pour indiquer le changement
                disabledRow1.components.forEach(component => component.data.disabled = true);
                disabledRow2.components.forEach(component => component.data.disabled = true);

                try {
                    await interaction.message.edit({
                        embeds: [{
                            title: '🎵 Song Skipped',
                            description: 'Use `/nowplaying` to see the current song',
                            color: 0x00ff00
                        }],
                        components: [disabledRow1, disabledRow2]
                    });
                } catch (error) {
                    console.error('Error updating message after skip:', error);
                }
            }
        }, 1000);
    }
}).toJSON()
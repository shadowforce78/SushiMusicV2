const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const fileCache = require('../../utils/FileCache');

module.exports = new ApplicationCommand({
    command: {
        name: 'cache',
        description: 'Manage and view music file cache.',
        type: 1,
        options: [
            {
                name: 'action',
                description: 'Action to perform on the cache',
                type: 3, // STRING
                required: true,
                choices: [
                    {
                        name: 'stats',
                        value: 'stats'
                    },
                    {
                        name: 'clear',
                        value: 'clear'
                    }
                ]
            }
        ]
    },
    options: {
        cooldown: 5000,
        dirname: __dirname,
        botDevelopers: true
    },

    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */

    run: async (client, interaction) => {
        const action = interaction.options.getString('action');

        if (action === 'stats') {
            const stats = fileCache.getCacheStats();
            
            // Convertir la taille en MB
            const sizeInMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
            
            await interaction.reply({
                embeds: [{
                    title: '📊 Music Cache Statistics',
                    color: 0x00ff00,
                    fields: [
                        {
                            name: '📁 Total Files',
                            value: stats.totalFiles.toString(),
                            inline: true
                        },
                        {
                            name: '✅ Valid Files',
                            value: stats.validFiles.toString(),
                            inline: true
                        },
                        {
                            name: '⏰ Expired Files',
                            value: stats.expiredFiles.toString(),
                            inline: true
                        },
                        {
                            name: '💾 Total Size',
                            value: `${sizeInMB} MB`,
                            inline: true
                        },
                        {
                            name: '⏱️ Cache Duration',
                            value: '30 minutes',
                            inline: true
                        },
                        {
                            name: '🔄 Cleanup Interval',
                            value: '5 minutes',
                            inline: true
                        }
                    ],
                    footer: {
                        text: 'Files are automatically deleted after 30 minutes'
                    },
                    timestamp: new Date()
                }],
                ephemeral: true
            });
            
        } else if (action === 'clear') {
            // Vérifier les permissions (admin ou owner)
            if (!interaction.member.permissions.has('Administrator') && interaction.user.id !== client.config.ownerId) {
                return interaction.reply({
                    content: '❌ You need Administrator permissions to clear the cache.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '🧹 Clearing music cache...',
                ephemeral: true
            });

            const deletedCount = fileCache.clearAll();
            
            await interaction.editReply({
                content: `✅ Cache cleared! Deleted ${deletedCount} files.`,
                ephemeral: true
            });
        }
    }
});

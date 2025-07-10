const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { joinVoiceChannel } = require('@discordjs/voice');
const run = require('@saumondeluxe/musicord-dl');
const fs = require('fs');
const path = require('path');
const { search } = require('yt-search');
const musicQueue = require('../../utils/MusicQueue');


module.exports = new ApplicationCommand({
    command: {
        name: 'play',
        description: 'Downloads and plays a song from YouTube.',
        type: 1,
        options: [
            {
                name: 'query',
                description: 'YouTube URL or song title to play.',
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
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({
                content: 'You need to be in a voice channel to use this command.',
                ephemeral: true
            });
        }

        const query = interaction.options.getString('query');
        if (!query) {
            return interaction.reply({
                content: 'Please provide a valid YouTube URL or song title.',
                ephemeral: true
            });
        }

        // Fonction pour détecter si c'est un lien YouTube
        const isYouTubeUrl = (str) => {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
            return youtubeRegex.test(str);
        };

        // Créer le dossier temp s'il n'existe pas
        const tempDir = path.join(__dirname, '../../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Nettoyer le dossier temp seulement si aucune queue n'existe
        if (!musicQueue.hasQueue(interaction.guild.id)) {
            musicQueue.clearTempDir();
        }

        let downloadedFile = null;
        let finalFilePath = null;
        let url = query;
        let songTitle = query;

        try {
            // Si ce n'est pas un lien YouTube, rechercher la chanson
            if (!isYouTubeUrl(query)) {
                await interaction.reply({
                    content: `Searching for: "${query}"...`,
                    ephemeral: true
                });

                const searchResults = await search(query);
                if (!searchResults.videos || searchResults.videos.length === 0) {
                    return interaction.editReply({
                        content: 'No songs found for your search query. Please try a different search term.',
                        ephemeral: true
                    });
                }

                // Prendre la première vidéo trouvée
                const firstVideo = searchResults.videos[0];
                url = firstVideo.url;
                songTitle = `${firstVideo.title} - ${firstVideo.author.name}`;
                
                await interaction.editReply({
                    content: `Found: "${firstVideo.title}" by ${firstVideo.author.name}. Downloading...`,
                    ephemeral: true
                });
            } else {
                // Étape 1: Télécharger le fichier (URL directe)
                await interaction.reply({
                    content: 'Downloading your song, please wait...',
                    ephemeral: true
                });
            }

            // Étape 2: Télécharger le fichier avec l'URL (recherchée ou directe)
            downloadedFile = await run(url, { format: 'mp3' });
            console.log('Downloaded file:', downloadedFile);

            // Étape 3: Déplacer le fichier vers le dossier temp
            const fileName = path.basename(downloadedFile);
            finalFilePath = path.join(tempDir, fileName);

            fs.renameSync(downloadedFile, finalFilePath);
            console.log('Moved file to:', finalFilePath);

            // Créer l'objet chanson
            const songData = {
                title: songTitle,
                filePath: finalFilePath,
                url: url,
                requestedBy: interaction.user.tag
            };

            // Vérifier s'il y a déjà une queue active
            let queue = musicQueue.getQueue(interaction.guild.id);
            
            if (!queue) {
                // Créer une nouvelle connexion et queue
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });

                queue = musicQueue.createQueue(interaction.guild.id, connection, interaction);
                
                if (await musicQueue.addSong(interaction.guild.id, songData)) {
                    await interaction.editReply({
                        content: `🎵 Added to queue: **${songTitle}**\nStarting playback...`,
                        ephemeral: true
                    });

                    // Commencer la lecture
                    await musicQueue.playNext(interaction.guild.id);
                } else {
                    throw new Error('Failed to add song to database queue');
                }
            } else {            // Ajouter à la queue existante
            if (await musicQueue.addSong(interaction.guild.id, songData)) {
                const queuePosition = queue.songs.length;
                
                await interaction.editReply({
                    content: `📝 Added to queue: **${songTitle}**\nPosition in queue: **${queuePosition}**`,
                    ephemeral: true
                });
            } else {
                throw new Error('Failed to add song to database queue');
            }
            }

        } catch (error) {
            console.error('Download or playback error:', error);

            // Nettoyer en cas d'erreur
            if (downloadedFile && fs.existsSync(downloadedFile)) {
                fs.unlinkSync(downloadedFile);
            }
            if (finalFilePath && fs.existsSync(finalFilePath)) {
                fs.unlinkSync(finalFilePath);
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while downloading or playing the song. Please try again later.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while downloading or playing the song. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
}).toJSON();
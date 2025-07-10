const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const run = require('@saumondeluxe/musicord-dl');
const fs = require('fs');
const path = require('path');


module.exports = new ApplicationCommand({
    command: {
        name: 'play',
        description: 'Downloads and plays a song from YouTube.',
        type: 1,
        options: [
            {
                name: 'url',
                description: 'The YouTube URL of the song to play.',
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

        const url = interaction.options.getString('url');
        if (!url) {
            return interaction.reply({
                content: 'Please provide a valid YouTube URL.',
                ephemeral: true
            });
        }

        // Créer le dossier temp s'il n'existe pas
        const tempDir = path.join(__dirname, '../../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        let downloadedFile = null;
        let finalFilePath = null;

        try {
            // Étape 1: Télécharger le fichier
            await interaction.reply({
                content: 'Downloading your song, please wait...',
                ephemeral: true
            });

            downloadedFile = await run(url, { format: 'mp3' });
            console.log('Downloaded file:', downloadedFile);

            // Étape 2: Déplacer le fichier vers le dossier temp
            const fileName = path.basename(downloadedFile);
            finalFilePath = path.join(tempDir, fileName);

            fs.renameSync(downloadedFile, finalFilePath);
            console.log('Moved file to:', finalFilePath);

            // Étape 3: Jouer la musique
            await interaction.editReply({
                content: 'Download complete! Now playing your song...',
                ephemeral: true
            });

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(finalFilePath);
            connection.subscribe(player);
            player.play(resource);

            // Étape 4: Gérer la fin de la lecture et supprimer le fichier
            player.on(AudioPlayerStatus.Idle, () => {
                console.log('Finished playing audio file:', finalFilePath);

                // Supprimer le fichier après la lecture
                if (fs.existsSync(finalFilePath)) {
                    fs.unlinkSync(finalFilePath);
                    console.log('Deleted temporary file:', finalFilePath);
                }

                // Déconnecter le bot du channel vocal
                connection.destroy();
            });

            player.on('error', error => {
                console.error('Error playing audio file:', error);
                interaction.followUp({
                    content: 'An error occurred while trying to play the audio file.',
                    ephemeral: true
                });

                // Supprimer le fichier en cas d'erreur
                if (finalFilePath && fs.existsSync(finalFilePath)) {
                    fs.unlinkSync(finalFilePath);
                    console.log('Deleted temporary file after error:', finalFilePath);
                }

                connection.destroy();
            });

        } catch (error) {
            console.error('Download or playback error:', error);

            // Nettoyer en cas d'erreur
            if (downloadedFile && fs.existsSync(downloadedFile)) {
                fs.unlinkSync(downloadedFile);
            }
            if (finalFilePath && fs.existsSync(finalFilePath)) {
                fs.unlinkSync(finalFilePath);
            }

            await interaction.editReply({
                content: 'An error occurred while downloading or playing the song. Please try again later.',
                ephemeral: true
            });
        }
    }
}).toJSON();
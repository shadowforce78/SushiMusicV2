const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const musicDatabase = require('./MusicDatabase');

class MusicQueue {
    constructor() {
        this.queues = new Map(); // guildId -> queue data
        this.commandQueue = new Map(); // guildId -> array of pending commands
        this.isProcessing = new Map(); // guildId -> boolean
    }

    // Créer une nouvelle queue pour un serveur
    createQueue(guildId, connection, interaction) {
        const player = createAudioPlayer();
        connection.subscribe(player);

        const queueData = {
            connection,
            player,
            songs: [],
            currentSong: null,
            isPlaying: false,
            isPaused: false,
            volume: 1.0, // Volume de 0.0 à 1.0
            interaction
        };

        this.queues.set(guildId, queueData);

        // Gérer les événements du player
        player.on(AudioPlayerStatus.Idle, () => {
            this.handleSongEnd(guildId);
        });

        player.on('error', (error) => {
            console.error('Player error:', error);
            this.handleError(guildId, error);
        });

        return queueData;
    }

    // Ajouter une chanson à la queue
    async addSong(guildId, songData) {
        const queue = this.queues.get(guildId);
        if (!queue) return false;

        // Sauvegarder en base de données
        const songId = await musicDatabase.saveQueueSong(guildId, songData);
        if (songId) {
            songData.id = songId;
            queue.songs.push(songData);
            
            // Mettre à jour les statistiques
            await musicDatabase.updateStats(guildId, songData.requestedBy);
            
            return true;
        }
        return false;
    }

    // Ajouter une chanson à la queue en maintenant l'ordre
    async addSongInOrder(guildId, songDataPromise) {
        // Initialiser la command queue si elle n'existe pas
        if (!this.commandQueue.has(guildId)) {
            this.commandQueue.set(guildId, []);
        }
        
        const commands = this.commandQueue.get(guildId);
        commands.push(songDataPromise);
        
        // Traiter la queue si on n'est pas déjà en train de traiter
        if (!this.isProcessing.get(guildId)) {
            await this.processCommandQueue(guildId);
        }
    }

    // Traiter la queue de commandes dans l'ordre
    async processCommandQueue(guildId) {
        this.isProcessing.set(guildId, true);
        const commands = this.commandQueue.get(guildId) || [];
        
        while (commands.length > 0) {
            const songDataPromise = commands.shift();
            try {
                const songData = await songDataPromise;
                if (songData) {
                    await this.addSong(guildId, songData);
                }
            } catch (error) {
                console.error('Error processing command in queue:', error);
            }
        }
        
        this.isProcessing.set(guildId, false);
    }

    // Jouer la prochaine chanson
    async playNext(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue || queue.songs.length === 0) {
            this.cleanup(guildId);
            return false;
        }

        const song = queue.songs.shift();
        queue.currentSong = song;
        queue.isPlaying = true;

        try {
            // Sauvegarder la chanson actuelle en base
            await musicDatabase.saveCurrentSong(guildId, song);
            
            // Supprimer de la queue en base
            if (song.id) {
                await musicDatabase.removeQueueSong(guildId, song.id);
            }

            const resource = createAudioResource(song.filePath, {
                inlineVolume: true
            });
            
            // Appliquer le volume
            if (resource.volume) {
                resource.volume.setVolume(queue.volume);
            }
            
            queue.player.play(resource);
            
            // Notifier qu'une nouvelle chanson commence
            if (queue.interaction) {
                await queue.interaction.followUp({
                    content: `🎵 Now playing: **${song.title}**`,
                    ephemeral: false
                });
            }

            return true;
        } catch (error) {
            console.error('Error playing song:', error);
            this.handleError(guildId, error);
            return false;
        }
    }

    // Gérer la fin d'une chanson
    async handleSongEnd(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return;

        // Marquer la chanson comme jouée en base
        await musicDatabase.markSongAsPlayed(guildId);
        
        // Supprimer la chanson actuelle de la base
        await musicDatabase.clearCurrentSong(guildId);

        queue.currentSong = null;
        queue.isPlaying = false;

        // Jouer la prochaine chanson
        if (queue.songs.length > 0) {
            await this.playNext(guildId);
        } else {
            await this.cleanup(guildId);
        }
    }

    // Gérer les erreurs
    async handleError(guildId, error) {
        const queue = this.queues.get(guildId);
        if (!queue) return;

        if (queue.interaction) {
            await queue.interaction.followUp({
                content: 'An error occurred while playing music.',
                ephemeral: true
            });
        }

        this.cleanup(guildId);
    }

    // Passer à la chanson suivante
    async skip(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue || !queue.isPlaying) return false;

        // Arrêter le player proprement
        queue.player.stop();

        queue.currentSong = null;
        queue.isPlaying = false;

        // Jouer la prochaine chanson
        if (queue.songs.length > 0) {
            const success = await this.playNext(guildId);
            return success;
        } else {
            await this.cleanup(guildId);
            return false;
        }
    }

    // Arrêter et nettoyer
    async cleanup(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return;

        // Arrêter le player proprement
        if (queue.player) {
            queue.player.stop();
        }

        // Nettoyer la base de données
        await musicDatabase.clearQueue(guildId);
        await musicDatabase.clearCurrentSong(guildId);

        // Déconnecter
        if (queue.connection) {
            queue.connection.destroy();
        }

        // Supprimer la queue
        this.queues.delete(guildId);
    }

    // Obtenir les informations de la queue
    getQueue(guildId) {
        return this.queues.get(guildId);
    }

    // Vérifier si une queue existe
    hasQueue(guildId) {
        return this.queues.has(guildId);
    }

    // Restaurer les sessions depuis la base de données
    async restoreAllSessions() {
        try {
            // Note: Dans une vraie implémentation, on récupérerait toutes les guildes depuis la DB
            // Pour l'instant, cette méthode est appelée quand une guild reconnecte
            console.log('Music queue system ready - sessions will be restored when guilds reconnect');
            return true;
        } catch (error) {
            console.error('Error restoring sessions:', error);
            return false;
        }
    }

    // Restaurer une session spécifique pour une guilde
    async restoreGuildSession(guildId, connection, interaction) {
        try {
            const sessionData = await musicDatabase.restoreSession(guildId);
            
            if (sessionData.hasData) {
                // Recréer la queue en mémoire
                const queueData = this.createQueue(guildId, connection, interaction);
                
                // Restaurer les chansons de la queue
                sessionData.queue.forEach(song => {
                    // Vérifier si le fichier existe encore
                    if (fs.existsSync(song.filePath)) {
                        queueData.songs.push(song);
                    } else {
                        // Supprimer de la DB si le fichier n'existe plus
                        musicDatabase.removeQueueSong(guildId, song.id);
                    }
                });

                // Si il y avait une chanson en cours, la remettre en queue
                if (sessionData.currentSong && fs.existsSync(sessionData.currentSong.filePath)) {
                    queueData.songs.unshift(sessionData.currentSong);
                }

                console.log(`Restored session for guild ${guildId}: ${queueData.songs.length} songs in queue`);
                
                return queueData.songs.length > 0;
            }
            
            return false;
        } catch (error) {
            console.error(`Error restoring guild session for ${guildId}:`, error);
            return false;
        }
    }

    // Mettre en pause ou reprendre
    pause(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue || !queue.isPlaying) return false;

        if (queue.isPaused) {
            queue.player.unpause();
            queue.isPaused = false;
            return { action: 'resumed', success: true };
        } else {
            queue.player.pause();
            queue.isPaused = true;
            return { action: 'paused', success: true };
        }
    }

    // Changer le volume
    setVolume(guildId, volume) {
        const queue = this.queues.get(guildId);
        if (!queue) return false;

        // Limiter le volume entre 0.0 et 1.0
        volume = Math.max(0.0, Math.min(1.0, volume));
        queue.volume = volume;

        // Appliquer le volume si une chanson joue
        if (queue.player && queue.player.state.resource && queue.player.state.resource.volume) {
            queue.player.state.resource.volume.setVolume(volume);
        }

        return { volume: Math.round(volume * 100), success: true };
    }

    // Obtenir le statut actuel
    getStatus(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return null;

        return {
            isPlaying: queue.isPlaying,
            isPaused: queue.isPaused,
            volume: Math.round(queue.volume * 100),
            currentSong: queue.currentSong,
            queueLength: queue.songs.length,
            hasQueue: queue.songs.length > 0
        };
    }
}

// Instance globale
const musicQueue = new MusicQueue();
module.exports = musicQueue;

const fs = require('fs');
const path = require('path');

class MusicDatabase {
    constructor() {
        this.dbPath = path.resolve('./database.json');
        
        // S'assurer que le fichier existe
        if (!fs.existsSync(this.dbPath)) {
            this.saveData({});
        }
    }
    
    // Lire les données
    loadData() {
        try {
            const data = fs.readFileSync(this.dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading database:', error);
            return {};
        }
    }
    
    // Sauvegarder les données
    saveData(data) {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Error saving database:', error);
            return false;
        }
    }
    
    // Obtenir une valeur par clé
    async get(key) {
        const data = this.loadData();
        const keys = key.split('.');
        let result = data;
        
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return null;
            }
        }
        
        return result;
    }
    
    // Définir une valeur par clé
    async set(key, value) {
        const data = this.loadData();
        const keys = key.split('.');
        let current = data;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!current[k] || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
        return this.saveData(data);
    }
    
    // Supprimer une clé
    async delete(key) {
        const data = this.loadData();
        const keys = key.split('.');
        let current = data;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!current[k] || typeof current[k] !== 'object') {
                return true; // La clé n'existe pas déjà
            }
            current = current[k];
        }
        
        delete current[keys[keys.length - 1]];
        return this.saveData(data);
    }

    // Sauvegarder une chanson dans la queue d'un serveur
    async saveQueueSong(guildId, songData, position = null) {
        try {
            const key = `queues.${guildId}`;
            let queue = await this.get(key) || [];
            
            const songEntry = {
                id: Date.now() + Math.random().toString(36).substr(2, 9), // ID unique
                title: songData.title,
                url: songData.url,
                filePath: songData.filePath,
                requestedBy: songData.requestedBy,
                requestedAt: new Date().toISOString(),
                position: position !== null ? position : queue.length
            };

            if (position !== null && position < queue.length) {
                queue.splice(position, 0, songEntry);
                // Réajuster les positions
                queue.forEach((song, index) => {
                    song.position = index;
                });
            } else {
                queue.push(songEntry);
            }

            await this.set(key, queue);
            return songEntry.id;
        } catch (error) {
            console.error('Error saving queue song:', error);
            return null;
        }
    }

    // Récupérer la queue d'un serveur
    async getQueue(guildId) {
        try {
            const key = `queues.${guildId}`;
            return await this.get(key) || [];
        } catch (error) {
            console.error('Error getting queue:', error);
            return [];
        }
    }

    // Supprimer une chanson de la queue
    async removeQueueSong(guildId, songId) {
        try {
            const key = `queues.${guildId}`;
            let queue = await this.get(key) || [];
            
            queue = queue.filter(song => song.id !== songId);
            
            // Réajuster les positions
            queue.forEach((song, index) => {
                song.position = index;
            });

            await this.set(key, queue);
            return true;
        } catch (error) {
            console.error('Error removing queue song:', error);
            return false;
        }
    }

    // Supprimer la première chanson de la queue (celle qui vient d'être jouée)
    async removeFirstSong(guildId) {
        try {
            const key = `queues.${guildId}`;
            let queue = await this.get(key) || [];
            
            if (queue.length > 0) {
                const removedSong = queue.shift();
                
                // Réajuster les positions
                queue.forEach((song, index) => {
                    song.position = index;
                });

                await this.set(key, queue);
                return removedSong;
            }
            return null;
        } catch (error) {
            console.error('Error removing first song:', error);
            return null;
        }
    }

    // Vider complètement la queue d'un serveur
    async clearQueue(guildId) {
        try {
            const key = `queues.${guildId}`;
            await this.delete(key);
            return true;
        } catch (error) {
            console.error('Error clearing queue:', error);
            return false;
        }
    }

    // Sauvegarder l'état actuel de lecture
    async saveCurrentSong(guildId, songData) {
        try {
            const key = `current.${guildId}`;
            const currentSong = {
                title: songData.title,
                url: songData.url,
                filePath: songData.filePath,
                requestedBy: songData.requestedBy,
                startedAt: new Date().toISOString()
            };

            await this.set(key, currentSong);
            return true;
        } catch (error) {
            console.error('Error saving current song:', error);
            return false;
        }
    }

    // Récupérer la chanson actuelle
    async getCurrentSong(guildId) {
        try {
            const key = `current.${guildId}`;
            return await this.get(key) || null;
        } catch (error) {
            console.error('Error getting current song:', error);
            return null;
        }
    }

    // Supprimer la chanson actuelle
    async clearCurrentSong(guildId) {
        try {
            const key = `current.${guildId}`;
            await this.delete(key);
            return true;
        } catch (error) {
            console.error('Error clearing current song:', error);
            return false;
        }
    }

    // Obtenir des statistiques
    async getGuildStats(guildId) {
        try {
            const statsKey = `stats.${guildId}`;
            let stats = await this.get(statsKey) || {
                totalSongsPlayed: 0,
                totalRequests: 0,
                lastActivity: null,
                topRequesters: {}
            };

            return stats;
        } catch (error) {
            console.error('Error getting guild stats:', error);
            return null;
        }
    }

    // Mettre à jour les statistiques
    async updateStats(guildId, requesterTag) {
        try {
            const statsKey = `stats.${guildId}`;
            let stats = await this.get(statsKey) || {
                totalSongsPlayed: 0,
                totalRequests: 0,
                lastActivity: null,
                topRequesters: {}
            };

            stats.totalRequests++;
            stats.lastActivity = new Date().toISOString();
            
            if (requesterTag) {
                stats.topRequesters[requesterTag] = (stats.topRequesters[requesterTag] || 0) + 1;
            }

            await this.set(statsKey, stats);
            return true;
        } catch (error) {
            console.error('Error updating stats:', error);
            return false;
        }
    }

    // Marquer une chanson comme jouée
    async markSongAsPlayed(guildId) {
        try {
            const statsKey = `stats.${guildId}`;
            let stats = await this.get(statsKey) || {
                totalSongsPlayed: 0,
                totalRequests: 0,
                lastActivity: null,
                topRequesters: {}
            };

            stats.totalSongsPlayed++;
            stats.lastActivity = new Date().toISOString();

            await this.set(statsKey, stats);
            return true;
        } catch (error) {
            console.error('Error marking song as played:', error);
            return false;
        }
    }

    // Restaurer une session (au démarrage du bot)
    async restoreSession(guildId) {
        try {
            const queue = await this.getQueue(guildId);
            const currentSong = await this.getCurrentSong(guildId);
            
            return {
                queue,
                currentSong,
                hasData: queue.length > 0 || currentSong !== null
            };
        } catch (error) {
            console.error('Error restoring session:', error);
            return { queue: [], currentSong: null, hasData: false };
        }
    }
}

// Instance globale
const musicDatabase = new MusicDatabase();
module.exports = musicDatabase;

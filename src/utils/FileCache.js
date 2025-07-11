const fs = require('fs');
const path = require('path');

class FileCache {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        this.cacheMap = new Map(); // url -> { filePath, timestamp, title }
        this.cleanupInterval = 5 * 60 * 1000; // Nettoyage toutes les 5 minutes
        this.maxAge = 30 * 60 * 1000; // 30 minutes en millisecondes
        
        this.init();
    }

    init() {
        // Créer le dossier temp s'il n'existe pas
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        // Charger les fichiers existants au démarrage
        this.loadExistingFiles();

        // Démarrer le nettoyage automatique
        this.startCleanupTimer();
    }

    // Charger les fichiers existants au démarrage
    loadExistingFiles() {
        try {
            const files = fs.readdirSync(this.tempDir);
            const now = Date.now();

            for (const file of files) {
                if (path.extname(file) === '.mp3') {
                    const filePath = path.join(this.tempDir, file);
                    const stats = fs.statSync(filePath);
                    const fileAge = now - stats.mtimeMs;

                    // Supprimer les fichiers trop anciens
                    if (fileAge > this.maxAge) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log('Deleted old cached file:', file);
                        } catch (error) {
                            console.error('Error deleting old file:', error);
                        }
                    } else {
                        // Garder les fichiers récents dans le cache
                        // Essayer d'extraire l'URL depuis le nom de fichier (si possible)
                        console.log('Keeping cached file:', file);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading existing files:', error);
        }
    }

    // Générer un nom de fichier avec timestamp
    generateFileName(url, title) {
        const timestamp = Date.now();
        // Nettoyer le titre pour le nom de fichier
        const cleanTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
        const urlHash = this.generateUrlHash(url);
        return `${cleanTitle}_${timestamp}_${urlHash}.mp3`;
    }

    // Générer un hash court de l'URL pour l'identification
    generateUrlHash(url) {
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir en entier 32-bit
        }
        return Math.abs(hash).toString(36);
    }

    // Vérifier si un fichier existe dans le cache
    getCachedFile(url) {
        const cached = this.cacheMap.get(url);
        if (!cached) return null;

        const now = Date.now();
        const age = now - cached.timestamp;

        // Vérifier si le fichier est encore valide
        if (age > this.maxAge) {
            this.cacheMap.delete(url);
            // Essayer de supprimer le fichier
            try {
                if (fs.existsSync(cached.filePath)) {
                    fs.unlinkSync(cached.filePath);
                    console.log('Deleted expired cached file:', cached.filePath);
                }
            } catch (error) {
                console.error('Error deleting expired file:', error);
            }
            return null;
        }

        // Vérifier si le fichier existe encore physiquement
        if (!fs.existsSync(cached.filePath)) {
            this.cacheMap.delete(url);
            return null;
        }

        return cached;
    }

    // Ajouter un fichier au cache
    addToCache(url, filePath, title) {
        const cacheEntry = {
            filePath,
            timestamp: Date.now(),
            title
        };
        
        this.cacheMap.set(url, cacheEntry);
        console.log(`Added to cache: ${title} (${url})`);
        
        return cacheEntry;
    }

    // Déplacer et renommer un fichier téléchargé
    cacheDownloadedFile(downloadedPath, url, title) {
        try {
            const fileName = this.generateFileName(url, title);
            const targetPath = path.join(this.tempDir, fileName);

            // Déplacer le fichier
            fs.renameSync(downloadedPath, targetPath);
            
            // Ajouter au cache
            this.addToCache(url, targetPath, title);
            
            return targetPath;
        } catch (error) {
            console.error('Error caching downloaded file:', error);
            return downloadedPath; // Retourner le chemin original en cas d'erreur
        }
    }

    // Nettoyer les fichiers expirés
    cleanupExpiredFiles() {
        const now = Date.now();
        const expiredUrls = [];

        for (const [url, cached] of this.cacheMap.entries()) {
            const age = now - cached.timestamp;
            
            if (age > this.maxAge) {
                expiredUrls.push(url);
                
                // Supprimer le fichier physique
                try {
                    if (fs.existsSync(cached.filePath)) {
                        fs.unlinkSync(cached.filePath);
                        console.log('Cleaned up expired file:', cached.filePath);
                    }
                } catch (error) {
                    console.error('Error cleaning up expired file:', error);
                }
            }
        }

        // Supprimer du cache
        expiredUrls.forEach(url => this.cacheMap.delete(url));

        if (expiredUrls.length > 0) {
            console.log(`Cleaned up ${expiredUrls.length} expired files from cache`);
        }
    }

    // Démarrer le timer de nettoyage automatique
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupExpiredFiles();
        }, this.cleanupInterval);
        
        console.log('File cache cleanup timer started (every 5 minutes)');
    }

    // Obtenir des statistiques du cache
    getCacheStats() {
        const now = Date.now();
        const stats = {
            totalFiles: this.cacheMap.size,
            validFiles: 0,
            expiredFiles: 0,
            totalSize: 0
        };

        for (const [url, cached] of this.cacheMap.entries()) {
            const age = now - cached.timestamp;
            
            if (age > this.maxAge) {
                stats.expiredFiles++;
            } else {
                stats.validFiles++;
                
                // Calculer la taille si le fichier existe
                try {
                    if (fs.existsSync(cached.filePath)) {
                        const fileStats = fs.statSync(cached.filePath);
                        stats.totalSize += fileStats.size;
                    }
                } catch (error) {
                    // Ignorer les erreurs de stats
                }
            }
        }

        return stats;
    }

    // Forcer le nettoyage complet
    clearAll() {
        try {
            const files = fs.readdirSync(this.tempDir);
            let deletedCount = 0;

            for (const file of files) {
                if (path.extname(file) === '.mp3') {
                    const filePath = path.join(this.tempDir, file);
                    try {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    } catch (error) {
                        console.error(`Error deleting ${file}:`, error);
                    }
                }
            }

            this.cacheMap.clear();
            console.log(`Cleared all cache: ${deletedCount} files deleted`);
            
            return deletedCount;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return 0;
        }
    }
}

// Instance globale
const fileCache = new FileCache();
module.exports = fileCache;

function loadHowler() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
class AudioPlayer {
    constructor(container) {
        this.container = container;
        
        // Initialize controls
        this.playButton = container.querySelector('[data-control="play"]');
        this.pauseButton = container.querySelector('[data-control="pause"]');
        this.muteButton = container.querySelector('[data-control="mute"]');
        this.unmuteButton = container.querySelector('[data-control="unmute"]');
        
        // Progress controls
        this.progressContainer = container.querySelector('[data-control="progress"]');
        this.progressBar = container.querySelector('[data-progress="bar"]');
        this.progressHandle = container.querySelector('[data-progress="handle"]');
        
        // Volume controls
        this.volumeContainer = container.querySelector('[data-control="volume"]');
        this.volumeBar = container.querySelector('[data-volume="bar"]');
        this.volumeHandle = container.querySelector('[data-volume="handle"]');
        
        // Time display elements
        this.currentTimeDisplay = container.querySelector('[data-audio-current-time]');
        this.durationDisplay = container.querySelector('[data-audio-duration]');
        
        // Audio source - handle both single source and playlist cases
        const sourceElement = container.querySelector('[data-audio-source]');
        this.audioSource = sourceElement ? sourceElement.textContent : null;
        
        // State variables
        this.isDragging = false;
        this.isDraggingVolume = false;
        this.lastVolume = 1;
        
        this.initializeHowl();
        this.bindEvents();
    }

    formatTime(seconds) {
        seconds = Math.floor(seconds);
        const minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    initializeHowl() {
        // Only initialize if we have a source
        if (!this.audioSource) return;
        this.sound = new Howl({
            src: [this.audioSource],
            html5: true,
            volume: 1,
            onload: () => {
                this.enableControls();
                this.updateVolumeBar(1);
                
                // Set initial duration
                const duration = this.sound.duration();
                if (this.durationDisplay) {
                    this.durationDisplay.textContent = this.formatTime(duration);
                }
            }
        });
    }

    enableControls() {
        this.playButton.disabled = false;
        this.pauseButton.disabled = false;
        this.muteButton.disabled = false;
        this.unmuteButton.disabled = false;
    }

    updateVolume(percentage) {
        this.sound.volume(percentage);
        this.updateVolumeBar(percentage);
        this.lastVolume = percentage;
        
        // Update mute/unmute button states
        if (percentage === 0) {
            this.muteButton.classList.add('hidden');
            this.unmuteButton.classList.remove('hidden');
        } else {
            this.unmuteButton.classList.add('hidden');
            this.muteButton.classList.remove('hidden');
        }
    }

    updateVolumeBar(percentage) {
        this.volumeBar.style.width = `${percentage * 100}%`;
        this.volumeHandle.style.left = `${percentage * 100}%`;
    }

    bindEvents() {
        // Play control
        this.playButton.addEventListener('click', () => {
            this.sound.play();
            this.playButton.classList.add('hidden');
            this.pauseButton.classList.remove('hidden');
        });

        // Pause control
        this.pauseButton.addEventListener('click', () => {
            this.sound.pause();
            this.pauseButton.classList.add('hidden');
            this.playButton.classList.remove('hidden');
        });

        // Mute control
        this.muteButton.addEventListener('click', () => {
            this.lastVolume = this.sound.volume();
            this.sound.volume(0);
            this.updateVolumeBar(0);
            this.muteButton.classList.add('hidden');
            this.unmuteButton.classList.remove('hidden');
        });

        // Unmute control
        this.unmuteButton.addEventListener('click', () => {
            this.sound.volume(this.lastVolume);
            this.updateVolumeBar(this.lastVolume);
            this.unmuteButton.classList.add('hidden');
            this.muteButton.classList.remove('hidden');
        });

        // Volume control click
        this.volumeContainer.addEventListener('click', (e) => {
            if (!this.isDraggingVolume) {
                const rect = this.volumeContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                this.updateVolume(percentage);
            }
        });

        // Volume control drag
        this.volumeHandle.addEventListener('mousedown', () => {
            this.isDraggingVolume = true;
        });

        // Progress bar click
        this.progressContainer.addEventListener('click', (e) => {
            if (!this.isDragging) {
                const rect = this.progressContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                const seekTime = percentage * this.sound.duration();
                this.sound.seek(seekTime);
                if (this.currentTimeDisplay) {
                    this.currentTimeDisplay.textContent = this.formatTime(seekTime);
                }
            }
        });

        // Progress bar drag
        this.progressHandle.addEventListener('mousedown', () => {
            this.isDragging = true;
        });

        // Global mouse move handler
        document.addEventListener('mousemove', (e) => {
            // Handle volume dragging
            if (this.isDraggingVolume) {
                const rect = this.volumeContainer.getBoundingClientRect();
                let x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                this.updateVolumeBar(percentage);
            }
            
            // Handle progress dragging
            if (this.isDragging) {
                const rect = this.progressContainer.getBoundingClientRect();
                let x = e.clientX - rect.left;
                x = Math.max(0, Math.min(x, rect.width));
                const percentage = x / rect.width;
                this.progressBar.style.width = `${percentage * 100}%`;
                this.progressHandle.style.left = `${percentage * 100}%`;
                
                // Update time display while dragging
                const seekTime = percentage * this.sound.duration();
                if (this.currentTimeDisplay) {
                    this.currentTimeDisplay.textContent = this.formatTime(seekTime);
                }
            }
        });

        // Global mouse up handler
        document.addEventListener('mouseup', () => {
            // Handle volume drag end
            if (this.isDraggingVolume) {
                const percentage = parseFloat(this.volumeBar.style.width) / 100;
                this.updateVolume(percentage);
                this.isDraggingVolume = false;
            }
            
            // Handle progress drag end
            if (this.isDragging) {
                const percentage = parseFloat(this.progressBar.style.width) / 100;
                const seekTime = percentage * this.sound.duration();
                this.sound.seek(seekTime);
                this.isDragging = false;
            }
        });

        // Update progress during playback
        if (this.sound) {
            this.sound.on('play', () => {
                this.updateProgress();
            });
        }
        
    }

    updateProgress() {
        if (this.sound.playing() && !this.isDragging) {
            const currentTime = this.sound.seek();
            const duration = this.sound.duration();
            const progress = currentTime / duration;
            
            this.progressBar.style.width = `${progress * 100}%`;
            this.progressHandle.style.left = `${progress * 100}%`;
            
            // Update current time display
            if (this.currentTimeDisplay) {
                this.currentTimeDisplay.textContent = this.formatTime(currentTime);
            }
            
            requestAnimationFrame(() => this.updateProgress());
        }
    }
}
        
class PlaylistAudioPlayer extends AudioPlayer {
    constructor(container) {
        super(container);
        
        // Stop and destroy the initial Howl instance since we'll create our own
        if (this.sound) {
            this.sound.unload();
        }
        
        // Additional controls for playlist
        this.prevButton = container.querySelector('[data-control="prev"]');
        this.nextButton = container.querySelector('[data-control="next"]');
        this.playlistContainer = container.querySelector('[data-playlist-container]');
        this.playlistTitle = container.querySelector('[data-playlist-title]');
        
        // Get playlist items
        this.playlistItems = Array.from(this.playlistContainer.querySelectorAll('.playlist-item'));
        this.currentTrackIndex = 0;
        
        this.initializePlaylist();
        this.bindPlaylistEvents();
    }

    initializePlaylist() {
        // Set active class on first item
        if (this.playlistItems.length > 0) {
            this.playlistItems[0].classList.add('active');
            // Set initial track
            this.setTrack(0);
        }
    }

    setTrack(index) {
        // Update current track index
        this.currentTrackIndex = index;
        
        // Update playlist UI
        this.playlistItems.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        // Get current track item
        const currentItem = this.playlistItems[index];
        
        // Update player title
        this.playlistTitle.textContent = currentItem.textContent.trim();
        
        // Stop current track if playing
        if (this.sound) {
            this.sound.stop();
        }
        
        // Initialize new track with URL from data attribute
        this.audioSource = currentItem.getAttribute('data-track-url');
        this.initializeHowl();
    }

    bindPlaylistEvents() {
        // Previous track
        this.prevButton.addEventListener('click', () => {
            const newIndex = (this.currentTrackIndex - 1 + this.playlistItems.length) % this.playlistItems.length;
            this.setTrack(newIndex);
            this.sound.play();
        });
        
        // Next track
        this.nextButton.addEventListener('click', () => {
            const newIndex = (this.currentTrackIndex + 1) % this.playlistItems.length;
            this.setTrack(newIndex);
            this.sound.play();
        });
        
        // Playlist item click
        this.playlistContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.playlist-item');
            if (item) {
                const index = this.playlistItems.indexOf(item);
                if (index !== -1) {
                    this.setTrack(index);
                    this.sound.play();
                }
            }
        });
        
        // Auto-play next track when current track ends
        if (this.sound) {
            this.sound.on('end', () => {
                const newIndex = (this.currentTrackIndex + 1) % this.playlistItems.length;
                this.setTrack(newIndex);
                this.sound.play();
            });
        }
    }
}

        // Initialize all audio players when Howler is loaded
        loadHowler().then(() => {
            // Initialize single audio players
            document.querySelectorAll('[data-audio-player]').forEach(container => {
                new AudioPlayer(container);
            });
            
            // Initialize playlist audio players
            document.querySelectorAll('[data-audio-player-multiple]').forEach(container => {
                new PlaylistAudioPlayer(container);
            });
        }).catch(error => {
            console.error('Error loading Howler.js:', error);
        });
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
        const sourceElement = container.querySelector('[data-track-url]');
        this.audioSource = sourceElement ? sourceElement.getAttribute('data-track-url') : null;
        
        // State variables
        this.isDragging = false;
        this.isDraggingVolume = false;
        this.lastVolume = 1;
        this.isInitialized = false;
        this.progressUpdateFrame = null;
        
        this.initializeHowl();
        this.bindEvents();
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) seconds = 0;
        seconds = Math.floor(seconds);
        const minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    initializeHowl() {
        // Only initialize if we have a source
        if (!this.audioSource) return;
        
        try {
            this.sound = new Howl({
                src: [this.audioSource],
                html5: true,
                volume: 1,
                preload: true,
                onload: () => {
                    this.isInitialized = true;
                    this.enableControls();
                    this.updateVolumeBar(1);
                    
                    // Set initial duration
                    const duration = this.sound.duration();
                    if (this.durationDisplay) {
                        this.durationDisplay.textContent = this.formatTime(duration);
                    }
                    
                    // Reset progress bar
                    this.resetProgressBar();
                    
                    // Update progress immediately to show initial position
                    this.updateProgressDisplay();
                },
                onplay: () => {
                    // Start progress update animation loop
                    this.startProgressUpdate();
                    
                    // Update button states
                    this.updatePlayPauseButtons(true);
                },
                onpause: () => {
                    // Update button states
                    this.updatePlayPauseButtons(false);
                    
                    // Update progress one more time
                    this.updateProgressDisplay();
                },
                onseek: () => {
                    // Update UI when seeking completes
                    this.updateProgressDisplay();
                },
                onstop: () => {
                    // Reset UI when stopped
                    this.resetProgressBar();
                    this.updatePlayPauseButtons(false);
                }
            });
        } catch (error) {
            console.error('Error initializing Howl:', error);
        }
    }

    enableControls() {
        if (this.playButton) this.playButton.disabled = false;
        if (this.pauseButton) this.pauseButton.disabled = false;
        if (this.muteButton) this.muteButton.disabled = false;
        if (this.unmuteButton) this.unmuteButton.disabled = false;
    }

    updatePlayPauseButtons(isPlaying) {
        if (isPlaying) {
            this.playButton.classList.add('hidden');
            this.pauseButton.classList.remove('hidden');
        } else {
            this.pauseButton.classList.add('hidden');
            this.playButton.classList.remove('hidden');
        }
    }

    resetProgressBar() {
        if (this.progressBar) this.progressBar.style.width = '0%';
        if (this.progressHandle) this.progressHandle.style.left = '0%';
        if (this.currentTimeDisplay) this.currentTimeDisplay.textContent = this.formatTime(0);
    }

    updateVolume(percentage) {
        if (!this.sound) return;
        
        try {
            this.sound.volume(percentage);
            this.updateVolumeBar(percentage);
            this.lastVolume = percentage;
            
            // Update mute/unmute button states
            if (percentage === 0) {
                if (this.muteButton) this.muteButton.classList.add('hidden');
                if (this.unmuteButton) this.unmuteButton.classList.remove('hidden');
            } else {
                if (this.unmuteButton) this.unmuteButton.classList.add('hidden');
                if (this.muteButton) this.muteButton.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error updating volume:', error);
        }
    }

    updateVolumeBar(percentage) {
        if (this.volumeBar) this.volumeBar.style.width = `${percentage * 100}%`;
        if (this.volumeHandle) this.volumeHandle.style.left = `${percentage * 100}%`;
    }

    // New method to update progress display without animation loop
    updateProgressDisplay() {
        if (!this.sound || !this.isInitialized) return;
        
        try {
            let currentTime = 0;
            try {
                currentTime = this.sound.seek();
                // Handle case where seek() returns the Howl object instead of time
                if (typeof currentTime !== 'number') {
                    currentTime = 0;
                }
            } catch (e) {
                currentTime = 0;
            }
            
            let duration = 1;
            try {
                duration = this.sound.duration() || 1;
                if (isNaN(duration) || duration <= 0) duration = 1;
            } catch (e) {
                duration = 1;
            }
            
            const progress = Math.min(1, Math.max(0, currentTime / duration));
            
            if (!this.isDragging) {
                if (this.progressBar) this.progressBar.style.width = `${progress * 100}%`;
                if (this.progressHandle) this.progressHandle.style.left = `${progress * 100}%`;
                
                // Update current time display
                if (this.currentTimeDisplay) {
                    this.currentTimeDisplay.textContent = this.formatTime(currentTime);
                }
            }
        } catch (error) {
            console.error('Error updating progress display:', error);
        }
    }

    startProgressUpdate() {
        // Clear any existing animation frame
        if (this.progressUpdateFrame) {
            cancelAnimationFrame(this.progressUpdateFrame);
            this.progressUpdateFrame = null;
        }
        
        const updateLoop = () => {
            this.updateProgressDisplay();
            
            // Only continue if playing
            if (this.sound && this.sound.playing()) {
                this.progressUpdateFrame = requestAnimationFrame(updateLoop);
            } else {
                this.progressUpdateFrame = null;
            }
        };
        
        this.progressUpdateFrame = requestAnimationFrame(updateLoop);
    }

    bindEvents() {
        // Play control
        if (this.playButton) {
            this.playButton.addEventListener('click', () => {
                if (!this.sound || !this.isInitialized) return;
                this.sound.play();
            });
        }

        // Pause control
        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', () => {
                if (!this.sound || !this.isInitialized) return;
                this.sound.pause();
            });
        }

        // Mute control
        if (this.muteButton) {
            this.muteButton.addEventListener('click', () => {
                if (!this.sound || !this.isInitialized) return;
                this.lastVolume = this.sound.volume();
                this.sound.volume(0);
                this.updateVolumeBar(0);
                this.muteButton.classList.add('hidden');
                this.unmuteButton.classList.remove('hidden');
            });
        }

        // Unmute control
        if (this.unmuteButton) {
            this.unmuteButton.addEventListener('click', () => {
                if (!this.sound || !this.isInitialized) return;
                this.sound.volume(this.lastVolume);
                this.updateVolumeBar(this.lastVolume);
                this.unmuteButton.classList.add('hidden');
                this.muteButton.classList.remove('hidden');
            });
        }

        // Volume control click
        if (this.volumeContainer) {
            this.volumeContainer.addEventListener('click', (e) => {
                if (!this.sound || !this.isInitialized || this.isDraggingVolume) return;
                
                const rect = this.volumeContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                this.updateVolume(percentage);
            });
        }

        // Volume control drag
        if (this.volumeHandle) {
            this.volumeHandle.addEventListener('mousedown', (e) => {
                this.isDraggingVolume = true;
                e.preventDefault(); // Prevent text selection
            });
            
            // Add touch support
            this.volumeHandle.addEventListener('touchstart', (e) => {
                this.isDraggingVolume = true;
                e.preventDefault(); // Prevent scrolling
            });
        }

        // Progress bar click
        if (this.progressContainer) {
            this.progressContainer.addEventListener('click', (e) => {
                if (!this.sound || !this.isInitialized || this.isDragging) return;
                
                const rect = this.progressContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                
                // Update UI immediately for better feedback
                if (this.progressBar) this.progressBar.style.width = `${percentage * 100}%`;
                if (this.progressHandle) this.progressHandle.style.left = `${percentage * 100}%`;
                
                // Calculate and display time
                try {
                    const duration = this.sound.duration() || 0;
                    const seekTime = percentage * duration;
                    
                    if (this.currentTimeDisplay) {
                        this.currentTimeDisplay.textContent = this.formatTime(seekTime);
                    }
                    
                    // Then seek the audio
                    this.sound.seek(seekTime);
                } catch (error) {
                    console.error('Error seeking:', error);
                }
            });
        }

        // Progress bar drag
        if (this.progressHandle) {
            this.progressHandle.addEventListener('mousedown', (e) => {
                if (!this.sound || !this.isInitialized) return;
                this.isDragging = true;
                e.preventDefault(); // Prevent text selection
            });
            
            // Add touch support
            this.progressHandle.addEventListener('touchstart', (e) => {
                if (!this.sound || !this.isInitialized) return;
                this.isDragging = true;
                e.preventDefault(); // Prevent scrolling
            });
        }

        // Global mouse/touch move handler
        const handleMove = (e) => {
            const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            if (clientX === null) return;
            
            // Handle volume dragging
            if (this.isDraggingVolume && this.volumeContainer) {
                const rect = this.volumeContainer.getBoundingClientRect();
                let x = clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                
                // Update volume immediately, not just visual indicator
                this.updateVolume(percentage);
            }
            
            // Handle progress dragging
            if (this.isDragging && this.sound && this.progressContainer) {
                const rect = this.progressContainer.getBoundingClientRect();
                let x = clientX - rect.left;
                x = Math.max(0, Math.min(x, rect.width));
                const percentage = x / rect.width;
                
                if (this.progressBar) this.progressBar.style.width = `${percentage * 100}%`;
                if (this.progressHandle) this.progressHandle.style.left = `${percentage * 100}%`;
                
                // Update time display while dragging
                if (this.currentTimeDisplay && this.sound) {
                    try {
                        const duration = this.sound.duration() || 0;
                        const seekTime = percentage * duration;
                        this.currentTimeDisplay.textContent = this.formatTime(seekTime);
                    } catch (error) {
                        console.error('Error updating time during drag:', error);
                    }
                }
            }
        };
        
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });

        // Global mouse/touch up handler
        const handleEnd = () => {
            // Handle progress drag end
            if (this.isDragging && this.sound && this.isInitialized) {
                try {
                    const percentage = parseFloat(this.progressBar.style.width) / 100 || 0;
                    const duration = this.sound.duration() || 0;
                    const seekTime = percentage * duration;
                    this.sound.seek(seekTime);
                    
                    // Force an update of the display after seeking
                    setTimeout(() => this.updateProgressDisplay(), 50);
                } catch (error) {
                    console.error('Error seeking audio:', error);
                }
                this.isDragging = false;
            }
            
            // Just reset the dragging state for volume
            // We don't need to update the volume again since we did it in real-time
            this.isDraggingVolume = false;
        };
        
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
    }
}

class PlaylistAudioPlayer extends AudioPlayer {
    constructor(container) {
        super(container);
        
        // Stop and destroy the initial Howl instance since we'll create our own
        if (this.sound) {
            this.sound.unload();
            this.sound = null;
            this.isInitialized = false;
        }
        
        // Additional controls for playlist
        this.prevButton = container.querySelector('[data-control="prev"]');
        this.nextButton = container.querySelector('[data-control="next"]');
        this.playlistContainer = container.querySelector('[data-playlist-container]');
        this.playlistTitle = container.querySelector('[data-playlist-title]');
        
        // Get playlist items
        this.playlistItems = Array.from(this.playlistContainer?.querySelectorAll('.playlist-item') || []);
        this.currentTrackIndex = 0;
        
        if (this.playlistItems.length > 0) {
            this.initializePlaylist();
            this.bindPlaylistEvents();
        }
    }

    initializePlaylist() {
        // Set active class on first item
        if (this.playlistItems.length > 0) {
            this.playlistItems.forEach(item => item.classList.remove('active'));
            this.playlistItems[0].classList.add('active');
            // Set initial track
            this.setTrack(0, false);
        }
    }

    setTrack(index, autoplay = false) {
        if (index < 0 || index >= this.playlistItems.length) return false;
        
        // Update current track index
        this.currentTrackIndex = index;
        
        // Update playlist UI
        this.playlistItems.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        // Get current track item
        const currentItem = this.playlistItems[index];
        if (!currentItem) return false;
        
        // Update player title
        if (this.playlistTitle) {
            this.playlistTitle.textContent = currentItem.textContent.trim();
        }
        
        // Get the playing state before changing track
        const wasPlaying = this.sound && this.sound.playing();
        
        // Clean up previous track
        if (this.sound) {
            this.sound.unload();
            this.sound = null;
        }
        
        // Cancel any ongoing animation frame
        if (this.progressUpdateFrame) {
            cancelAnimationFrame(this.progressUpdateFrame);
            this.progressUpdateFrame = null;
        }
        
        // Reset UI
        this.resetProgressBar();
        this.isInitialized = false;
        
        // Initialize new track with URL from data attribute
        this.audioSource = currentItem.getAttribute('data-track-url');

        // Store current volume before creating new Howl instance
        const currentVolume = this.sound ? this.sound.volume() : (this.lastVolume || 1);

        // Initialize the new Howl instance
        this.initializeHowl();

        // After initialization, set the volume to match the previous volume
        if (this.sound) {
            // Apply the volume once the sound is loaded
            this.sound.once('load', () => {
                this.sound.volume(currentVolume);
                this.updateVolumeBar(currentVolume);
            });
        }

        // If autoplay is true or was previously playing, play the new track
        if (autoplay || wasPlaying) {
            // We need to wait for the track to load before playing
            const checkAndPlay = () => {
                if (this.isInitialized && this.sound) {
                    this.sound.play();
                    return true;
                }
                return false;
            };
            
            if (!checkAndPlay()) {
                const playInterval = setInterval(() => {
                    if (checkAndPlay()) {
                        clearInterval(playInterval);
                    }
                }, 100);
                
                // Safety timeout to prevent infinite interval
                setTimeout(() => clearInterval(playInterval), 5000);
            }
        } else {
            // Make sure the play/pause buttons are in the correct state
            this.updatePlayPauseButtons(false);
        }
        
        return true;
    }

    bindPlaylistEvents() {
        // Previous track
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => {
                const newIndex = (this.currentTrackIndex - 1 + this.playlistItems.length) % this.playlistItems.length;
                this.setTrack(newIndex, true);
            });
        }
        
        // Next track
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => {
                const newIndex = (this.currentTrackIndex + 1) % this.playlistItems.length;
                this.setTrack(newIndex, true);
            });
        }
        
        // Playlist item click
        if (this.playlistContainer) {
            this.playlistContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.playlist-item');
                if (item) {
                    const index = this.playlistItems.indexOf(item);
                    if (index !== -1) {
                        this.setTrack(index, true); // Always play when clicking directly
                    }
                }
            });
        }
    }
    
    // Override initializeHowl to add the end event binding
    initializeHowl() {
        // Store volume before creating new instance
        const currentVolume = this.sound ? this.sound.volume() : (this.lastVolume || 1);
        
        // Call parent's initializeHowl
        super.initializeHowl();
        
        // Add end event handler for auto-advancing playlist
        if (this.sound) {
            this.sound.on('end', () => {
                const newIndex = (this.currentTrackIndex + 1) % this.playlistItems.length;
                this.setTrack(newIndex, true); // Auto-play next track
            });
            
            // Apply volume with timeouts to ensure it works
            this.sound.once('load', () => {
                // Set volume immediately
                this.sound.volume(currentVolume);
                
                // Update UI immediately
                this.updateVolumeBar(currentVolume);
                
                // And also with a small delay to ensure UI is updated
                setTimeout(() => {
                    this.sound.volume(currentVolume);
                    this.updateVolumeBar(currentVolume);
                    this.lastVolume = currentVolume; // Also update lastVolume for consistency
                }, 10);
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
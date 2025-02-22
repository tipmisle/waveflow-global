// Function to dynamically load Howler.js
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
        
        // Audio source
        this.audioSource = container.querySelector('[data-audio-source]').textContent;
        
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
        this.sound.on('play', () => {
            this.updateProgress();
        });
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

// Initialize all audio players when Howler is loaded
loadHowler().then(() => {
    document.querySelectorAll('[data-audio-player]').forEach(container => {
        new AudioPlayer(container);
    });
}).catch(error => {
    console.error('Error loading Howler.js:', error);
});
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
        this.playButton = container.querySelector('[data-control="play"]');
        this.pauseButton = container.querySelector('[data-control="pause"]');
        this.muteButton = container.querySelector('[data-control="mute"]');
        this.unmuteButton = container.querySelector('[data-control="unmute"]');
        this.progressContainer = container.querySelector('[data-control="progress"]');
        this.progressBar = container.querySelector('[data-progress="bar"]');
        this.progressHandle = container.querySelector('[data-progress="handle"]');
        this.volumeContainer = container.querySelector('[data-control="volume"]');
        this.volumeBar = container.querySelector('[data-volume="bar"]');
        this.volumeHandle = container.querySelector('[data-volume="handle"]');
        this.audioSource = container.querySelector('[data-audio-source]').textContent;
        
        this.isDragging = false;
        this.isDraggingVolume = false;
        this.lastVolume = 1;
        this.initializeHowl();
        this.bindEvents();
    }

    initializeHowl() {
        this.sound = new Howl({
            src: [this.audioSource],
            html5: true,
            volume: 1,
            onload: () => {
                this.enableControls();
                this.updateVolumeBar(1);
            }
        });
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

    enableControls() {
        this.playButton.disabled = false;
        this.pauseButton.disabled = false;
        this.muteButton.disabled = false;
        this.unmuteButton.disabled = false;
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

        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingVolume) {
                const rect = this.volumeContainer.getBoundingClientRect();
                let x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                this.updateVolumeBar(percentage);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDraggingVolume) {
                const percentage = parseFloat(this.volumeBar.style.width) / 100;
                this.updateVolume(percentage);
                this.isDraggingVolume = false;
            }
        });

        // Progress bar click
        this.progressContainer.addEventListener('click', (e) => {
            if (!this.isDragging) {
                const rect = this.progressContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                const seekTime = percentage * this.sound.duration();
                this.sound.seek(seekTime);
            }
        });

        // Progress bar drag
        this.progressHandle.addEventListener('mousedown', () => {
            this.isDragging = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const rect = this.progressContainer.getBoundingClientRect();
                let x = e.clientX - rect.left;
                x = Math.max(0, Math.min(x, rect.width));
                const percentage = x / rect.width;
                this.progressBar.style.width = `${percentage * 100}%`;
                this.progressHandle.style.left = `${percentage * 100}%`;
            }
        });

        document.addEventListener('mouseup', () => {
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
            const progress = this.sound.seek() / this.sound.duration();
            this.progressBar.style.width = `${progress * 100}%`;
            this.progressHandle.style.left = `${progress * 100}%`;
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
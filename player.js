function loadHowler(){return new Promise((t,e)=>{let s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js",s.onload=t,s.onerror=e,document.head.appendChild(s)})}class AudioPlayer{constructor(t){this.container=t,this.playButton=t.querySelector('[data-control="play"]'),this.pauseButton=t.querySelector('[data-control="pause"]'),this.muteButton=t.querySelector('[data-control="mute"]'),this.unmuteButton=t.querySelector('[data-control="unmute"]'),this.progressContainer=t.querySelector('[data-control="progress"]'),this.progressBar=t.querySelector('[data-progress="bar"]'),this.progressHandle=t.querySelector('[data-progress="handle"]'),this.audioSource=t.querySelector("[data-audio-source]").textContent,this.isDragging=!1,this.initializeHowl(),this.bindEvents()}initializeHowl(){this.sound=new Howl({src:[this.audioSource],html5:!0,onload:()=>this.enableControls()})}enableControls(){this.playButton.disabled=!1,this.pauseButton.disabled=!1,this.muteButton.disabled=!1,this.unmuteButton.disabled=!1}bindEvents(){this.playButton.addEventListener("click",()=>{this.sound.play(),this.playButton.classList.add("hidden"),this.pauseButton.classList.remove("hidden")}),this.pauseButton.addEventListener("click",()=>{this.sound.pause(),this.pauseButton.classList.add("hidden"),this.playButton.classList.remove("hidden")}),this.muteButton.addEventListener("click",()=>{this.sound.mute(!0),this.muteButton.classList.add("hidden"),this.unmuteButton.classList.remove("hidden")}),this.unmuteButton.addEventListener("click",()=>{this.sound.mute(!1),this.unmuteButton.classList.add("hidden"),this.muteButton.classList.remove("hidden")}),this.progressContainer.addEventListener("click",t=>{if(!this.isDragging){let e=this.progressContainer.getBoundingClientRect(),s=t.clientX-e.left,i=s/e.width,n=i*this.sound.duration();this.sound.seek(n)}}),this.progressHandle.addEventListener("mousedown",()=>{this.isDragging=!0}),document.addEventListener("mousemove",t=>{if(this.isDragging){let e=this.progressContainer.getBoundingClientRect(),s=t.clientX-e.left;s=Math.max(0,Math.min(s,e.width));let i=s/e.width;this.progressBar.style.width=`${100*i}%`,this.progressHandle.style.left=`${100*i}%`}}),document.addEventListener("mouseup",()=>{if(this.isDragging){let t=parseFloat(this.progressBar.style.width)/100,e=t*this.sound.duration();this.sound.seek(e),this.isDragging=!1}}),this.sound.on("play",()=>{this.updateProgress()})}updateProgress(){if(this.sound.playing()&&!this.isDragging){let t=this.sound.seek()/this.sound.duration();this.progressBar.style.width=`${100*t}%`,this.progressHandle.style.left=`${100*t}%`,requestAnimationFrame(()=>this.updateProgress())}}}loadHowler().then(()=>{document.querySelectorAll("[data-audio-player]").forEach(t=>{new AudioPlayer(t)})}).catch(t=>{console.error("Error loading Howler.js:",t)});
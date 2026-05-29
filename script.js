document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const app = document.getElementById('app');
    const videoLeft = document.getElementById('video-left');
    const videoRight = document.getElementById('video-right');
    const videoMiddle = document.getElementById('video-middle');
    const imageLeft = document.getElementById('image-left');
    const imageRight = document.getElementById('image-right');
    const imageMiddle = document.getElementById('image-middle');
    
    const inputLeftVideo = document.getElementById('input-left-video');
    const inputRightVideo = document.getElementById('input-right-video');
    const inputMiddleVideo = document.getElementById('input-middle-video');
    const inputLeftImage = document.getElementById('input-left-image');
    const inputRightImage = document.getElementById('input-right-image');
    const inputMiddleImage = document.getElementById('input-middle-image');
    
    const btnModeVideo = document.getElementById('btn-mode-video');
    const btnModeImage = document.getElementById('btn-mode-image');
    const btnToggleOverlay = document.getElementById('btn-toggle-overlay');
    
    const masterPlayBtn = document.getElementById('master-play');
    const masterStopBtn = document.getElementById('master-stop');
    const masterSyncBtn = document.getElementById('master-sync');
    const masterSeek = document.getElementById('master-seek');
    const masterTimeline = document.querySelector('.timeline-wrapper');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalTimeDisplay = document.getElementById('total-time');
    
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    const viewportRight = document.getElementById('right-viewport');
    const viewportMiddle = document.getElementById('middle-viewport');

    const fpsDropdown = document.getElementById('fps-dropdown');
    const currentFPSDisplay = document.getElementById('current-fps');
    const fpsOptions = document.querySelectorAll('.option');
    const viewports = document.querySelectorAll('.viewport');
    const individualPlayBtns = document.querySelectorAll('.individual-play');
    const btnResetZoom = document.getElementById('btn-reset-zoom');
    
    const btnLayout2 = document.getElementById('btn-layout-2');
    const btnLayout3 = document.getElementById('btn-layout-3');
    const comparisonGrid = document.querySelector('.comparison-grid');

    let currentMode = 'video'; // 'video' or 'image'
    let currentLayout = 2; // 2 or 3
    
    // Independent Overlay States
    let overlayStates = {
        video: false,
        image: false
    };

    let isPlaying = false;
    let masterDuration = 0;
    let isUniversalMode = false;

    function setUniversalMode(active) {
        isUniversalMode = active;
        if (active && currentMode === 'video') {
            masterTimeline.classList.add('visible');
        } else {
            masterTimeline.classList.remove('visible');
        }
    }

    // --- Layout Logic ---
    function setLayout(layout) {
        currentLayout = layout;
        btnLayout2.classList.toggle('active', layout === 2);
        btnLayout3.classList.toggle('active', layout === 3);
        
        if (layout === 3) {
            comparisonGrid.classList.add('grid-3');
            viewportMiddle.style.display = 'flex';
        } else {
            comparisonGrid.classList.remove('grid-3');
            viewportMiddle.style.display = 'none';
        }
        applyTransform();
    }

    btnLayout2.addEventListener('click', () => setLayout(2));
    btnLayout3.addEventListener('click', () => setLayout(3));

    // --- Mode Switching & Overlay Logic ---

    function setMode(mode) {
        currentMode = mode;
        
        // Restore overlay state for this mode
        const isOverlayActive = overlayStates[currentMode];
        btnToggleOverlay.classList.toggle('active', isOverlayActive);
        
        updateAppClass();
        
        btnModeVideo.classList.toggle('active', mode === 'video');
        btnModeImage.classList.toggle('active', mode === 'image');
        
        resetZoom();
        
        if (mode === 'image' && isPlaying) {
            toggleMasterPlay();
        }

        updateTitles();

        // Re-apply transparency if overlay is active for this mode
        if (isOverlayActive) {
            viewportRight.style.opacity = opacitySlider.value;
        } else {
            viewportRight.style.opacity = 1;
        }
    }

    function updateAppClass() {
        const isOverlayActive = overlayStates[currentMode];
        app.className = `mode-${currentMode}${isOverlayActive ? ' mode-overlay' : ''}`;
    }

    function updateTitles() {
        const leftTitle = document.getElementById('title-left');
        const rightTitle = document.getElementById('title-right');
        const middleTitle = document.getElementById('title-middle');
        
        if (currentMode === 'video') {
            if (!videoLeft.src) leftTitle.textContent = 'LEFT VIDEO';
            if (!videoRight.src) rightTitle.textContent = 'RIGHT VIDEO';
            if (!videoMiddle.src) middleTitle.textContent = 'MIDDLE VIDEO';
        } else {
            if (!imageLeft.src) leftTitle.textContent = 'LEFT IMAGE';
            if (!imageRight.src) rightTitle.textContent = 'RIGHT IMAGE';
            if (!imageMiddle.src) middleTitle.textContent = 'MIDDLE IMAGE';
        }
    }

    btnModeVideo.addEventListener('click', () => setMode('video'));
    btnModeImage.addEventListener('click', () => setMode('image'));

    btnToggleOverlay.addEventListener('click', () => {
        overlayStates[currentMode] = !overlayStates[currentMode];
        const isOverlayActive = overlayStates[currentMode];
        
        btnToggleOverlay.classList.toggle('active', isOverlayActive);
        updateAppClass();
        
        if (isOverlayActive) {
            viewportRight.style.opacity = opacitySlider.value;
        } else {
            viewportRight.style.opacity = 1;
        }
        
        applyTransform();
    });

    // Transparency Slider Logic
    opacitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (overlayStates[currentMode]) {
            viewportRight.style.opacity = val;
        }
        opacityValue.textContent = Math.round(val * 100) + '%';
    });

    // --- Media Loading Logic ---

    function loadMedia(file, element, viewport, type) {
        if (!file || !file.type.startsWith(type + '/')) {
            alert(`Please select a valid ${type} file.`);
            return;
        }

        if (element.src) {
            URL.revokeObjectURL(element.src);
        }

        const url = URL.createObjectURL(file);
        element.src = url;
        
        const titleId = viewport.id === 'left-viewport' ? 'title-left' : (viewport.id === 'right-viewport' ? 'title-right' : 'title-middle');
        document.getElementById(titleId).textContent = file.name;

        document.querySelectorAll('.viewport').forEach(vp => vp.classList.remove('drag-over'));

        viewport.querySelectorAll('.media-container').forEach(c => c.classList.remove('active'));
        viewport.querySelector(`.${type}-container`).classList.add('active');
        viewport.classList.remove('drag-over');

        if (type === 'video') {
            element.onloadedmetadata = () => updateDuration();
        }
    }

    function removeMedia(viewportId) {
        const viewport = document.getElementById(viewportId);
        const video = viewport.querySelector('video');
        const img = viewport.querySelector('img');
        
        if (video && video.src) {
            URL.revokeObjectURL(video.src);
            video.src = '';
            video.removeAttribute('src');
            video.load();
        }
        
        if (img && img.src) {
            URL.revokeObjectURL(img.src);
            img.src = '';
            img.removeAttribute('src');
        }

        viewport.querySelectorAll('.media-container').forEach(c => c.classList.remove('active'));
        
        const titleId = viewportId === 'left-viewport' ? 'title-left' : (viewportId === 'right-viewport' ? 'title-right' : 'title-middle');
        const defaultTitle = viewportId === 'left-viewport' ? `LEFT ${currentMode.toUpperCase()}` : (viewportId === 'right-viewport' ? `RIGHT ${currentMode.toUpperCase()}` : `MIDDLE ${currentMode.toUpperCase()}`);
        document.getElementById(titleId).textContent = defaultTitle;

        updateDuration();
    }

    inputLeftVideo.addEventListener('change', (e) => loadMedia(e.target.files[0], videoLeft, document.getElementById('left-viewport'), 'video'));
    inputRightVideo.addEventListener('change', (e) => loadMedia(e.target.files[0], videoRight, document.getElementById('right-viewport'), 'video'));
    inputMiddleVideo.addEventListener('change', (e) => loadMedia(e.target.files[0], videoMiddle, document.getElementById('middle-viewport'), 'video'));
    inputLeftImage.addEventListener('change', (e) => loadMedia(e.target.files[0], imageLeft, document.getElementById('left-viewport'), 'image'));
    inputRightImage.addEventListener('change', (e) => loadMedia(e.target.files[0], imageRight, document.getElementById('right-viewport'), 'image'));
    inputMiddleImage.addEventListener('change', (e) => loadMedia(e.target.files[0], imageMiddle, document.getElementById('middle-viewport'), 'image'));

    document.querySelectorAll('.btn-remove, .btn-overlay-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const viewportId = btn.getAttribute('data-target');
            removeMedia(viewportId);
        });
    });

    // --- Drag and Drop ---

    viewports.forEach(viewport => {
        viewport.addEventListener('dragover', (e) => {
            e.preventDefault();
            viewport.classList.add('drag-over');
        });

        viewport.addEventListener('dragleave', (e) => {
            if (!viewport.contains(e.relatedTarget)) {
                viewport.classList.remove('drag-over');
            }
        });

        viewport.addEventListener('drop', (e) => {
            e.preventDefault();
            viewport.classList.remove('drag-over');
            
            document.querySelectorAll('.viewport').forEach(vp => vp.classList.remove('drag-over'));
            
            const file = e.dataTransfer.files[0];
            if (!file) return;

            const isOverlayActive = overlayStates[currentMode];

            if (file.type.startsWith('video/')) {
                if (isOverlayActive || currentMode === 'video') {
                    if (isOverlayActive && currentMode === 'video') {
                        if (!videoLeft.src) {
                            loadMedia(file, videoLeft, document.getElementById('left-viewport'), 'video');
                        } else {
                            loadMedia(file, videoRight, document.getElementById('right-viewport'), 'video');
                        }
                    } else {
                        setMode('video');
                        const videoEl = viewport.id === 'left-viewport' ? videoLeft : (viewport.id === 'right-viewport' ? videoRight : videoMiddle);
                        loadMedia(file, videoEl, viewport, 'video');
                    }
                } else {
                    setMode('video');
                    const videoEl = viewport.id === 'left-viewport' ? videoLeft : (viewport.id === 'right-viewport' ? videoRight : videoMiddle);
                    loadMedia(file, videoEl, viewport, 'video');
                }
            } else if (file.type.startsWith('image/')) {
                if (isOverlayActive && currentMode === 'image') {
                    if (!imageLeft.src) {
                        loadMedia(file, imageLeft, document.getElementById('left-viewport'), 'image');
                    } else {
                        loadMedia(file, imageRight, document.getElementById('right-viewport'), 'image');
                    }
                } else {
                    setMode('image');
                    const imageEl = viewport.id === 'left-viewport' ? imageLeft : (viewport.id === 'right-viewport' ? imageRight : imageMiddle);
                    loadMedia(file, imageEl, viewport, 'image');
                }
            }
        });
    });

    // --- FPS Dropdown ---
    let currentFPS = 24;

    fpsDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        fpsDropdown.classList.toggle('active');
    });

    fpsOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            currentFPS = parseFloat(opt.getAttribute('data-value'));
            currentFPSDisplay.textContent = opt.textContent;
            fpsOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            fpsDropdown.classList.remove('active');
        });
    });

    document.addEventListener('click', () => fpsDropdown.classList.remove('active'));

    // --- Playback Controls ---

    function toggleMasterPlay() {
        if (isPlaying) {
            videoLeft.pause();
            videoMiddle.pause();
            videoRight.pause();
            masterPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>Play All</span>';
        } else {
            if (videoLeft.src) videoLeft.play();
            if (videoMiddle.src) videoMiddle.play();
            if (videoRight.src) videoRight.play();
            setUniversalMode(true);
            masterPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg><span>Pause All</span>';
        }
        isPlaying = !isPlaying;
    }

    masterPlayBtn.addEventListener('click', toggleMasterPlay);

    masterStopBtn.addEventListener('click', () => {
        videoLeft.pause();
        videoMiddle.pause();
        videoRight.pause();
        videoLeft.currentTime = 0;
        if (videoMiddle.src) videoMiddle.currentTime = 0;
        videoRight.currentTime = 0;
        isPlaying = false;
        setUniversalMode(false);
        masterPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>Play All</span>';
        updateDuration();
    });

    function stepFrame(direction) {
        if (currentMode !== 'video') return;
        if (videoLeft.src || videoMiddle.src || videoRight.src) {
            // Unconditionally pause all videos to ensure we step frame-by-frame on a static screen
            if (videoLeft.src) videoLeft.pause();
            if (videoMiddle.src) videoMiddle.pause();
            if (videoRight.src) videoRight.pause();

            if (isPlaying) {
                isPlaying = false;
                masterPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>Play All</span>';
            }

            const step = 1 / currentFPS;
            if (videoLeft.src) videoLeft.currentTime += step * direction;
            if (videoMiddle.src) videoMiddle.currentTime += step * direction;
            if (videoRight.src) videoRight.currentTime += step * direction;

            const primaryTime = videoLeft.src ? videoLeft.currentTime : (videoMiddle.src ? videoMiddle.currentTime : videoRight.currentTime);
            masterSeek.value = primaryTime;
            currentTimeDisplay.textContent = formatTime(primaryTime);
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (currentMode === 'video') toggleMasterPlay();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            stepFrame(1);
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            stepFrame(-1);
        }
    });

    individualPlayBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = btn.getAttribute('data-target');
            const video = document.getElementById(targetId);
            if (video.paused) {
                video.play();
                setUniversalMode(false);
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            } else {
                video.pause();
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            }
        });
    });

    // --- Fullscreen Toggle Logic ---
    const fullscreenBtns = document.querySelectorAll('.btn-fullscreen');
    
    fullscreenBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = btn.closest('.video-container');
            if (!container) return;

            if (document.fullscreenElement === container) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        });
    });

    document.addEventListener('fullscreenchange', () => {
        fullscreenBtns.forEach(btn => {
            const container = btn.closest('.video-container');
            if (document.fullscreenElement === container) {
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/></svg>';
                btn.setAttribute('title', 'Exit Fullscreen');
            } else {
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
                btn.setAttribute('title', 'Enter Fullscreen');
            }
        });
    });

    // --- Double click on video container to toggle fullscreen ---
    document.querySelectorAll('.video-container').forEach(container => {
        container.addEventListener('dblclick', (e) => {
            // Ignore double clicks on interactive controls like buttons and inputs
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('input')) {
                return;
            }
            
            if (document.fullscreenElement === container) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        });
    });

    [videoLeft, videoMiddle, videoRight].forEach(video => {
        video.addEventListener('play', () => {
            const btn = document.querySelector(`.individual-play[data-target="${video.id}"]`);
            if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        });
        
        video.addEventListener('pause', () => {
            const btn = document.querySelector(`.individual-play[data-target="${video.id}"]`);
            if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        });

        video.addEventListener('timeupdate', () => {
            const seek = document.querySelector(`.individual-seek[data-target="${video.id}"]`);
            if (seek && !seek.dataset.isSeeking) seek.value = video.currentTime;
            if (isUniversalMode && currentMode === 'video' && video === videoLeft && !isSeekingMaster) {
                masterSeek.value = videoLeft.currentTime;
                currentTimeDisplay.textContent = formatTime(videoLeft.currentTime);
            }
        });
        
        video.addEventListener('loadedmetadata', () => {
            const seek = document.querySelector(`.individual-seek[data-target="${video.id}"]`);
            if (seek) seek.max = video.duration;
        });
    });

    // --- Master and Individual Seeking Control ---
    let isSeekingMaster = false;

    function pauseAllForSeeking() {
        if (videoLeft.src) videoLeft.pause();
        if (videoMiddle.src) videoMiddle.pause();
        if (videoRight.src) videoRight.pause();
        if (isPlaying) {
            isPlaying = false;
            masterPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>Play All</span>';
        }
    }

    masterSeek.addEventListener('mousedown', () => { isSeekingMaster = true; pauseAllForSeeking(); });
    masterSeek.addEventListener('touchstart', () => { isSeekingMaster = true; pauseAllForSeeking(); });
    masterSeek.addEventListener('mouseup', () => { isSeekingMaster = false; });
    masterSeek.addEventListener('touchend', () => { isSeekingMaster = false; });

    masterSeek.addEventListener('input', (e) => {
        const time = parseFloat(e.target.value);
        if (videoLeft.src) videoLeft.currentTime = time;
        if (videoMiddle.src) videoMiddle.currentTime = time;
        if (videoRight.src) videoRight.currentTime = time;
        currentTimeDisplay.textContent = formatTime(time);
    });

    const individualSeeks = document.querySelectorAll('.individual-seek');
    individualSeeks.forEach(seek => {
        const targetId = seek.getAttribute('data-target');
        const video = document.getElementById(targetId);
        
        seek.addEventListener('mousedown', () => {
            seek.dataset.isSeeking = 'true';
            if (video && video.src) video.pause();
        });
        seek.addEventListener('touchstart', () => {
            seek.dataset.isSeeking = 'true';
            if (video && video.src) video.pause();
        });
        seek.addEventListener('mouseup', () => {
            seek.dataset.isSeeking = '';
        });
        seek.addEventListener('touchend', () => {
            seek.dataset.isSeeking = '';
        });
        
        seek.addEventListener('input', (e) => {
            if (video && video.src) {
                video.currentTime = parseFloat(e.target.value);
            }
        });
    });

    masterSyncBtn.addEventListener('click', () => {
        if (videoLeft.src) {
            if (videoMiddle.src) videoMiddle.currentTime = videoLeft.currentTime;
            if (videoRight.src) videoRight.currentTime = videoLeft.currentTime;
            setUniversalMode(true);
        }
    });

    // --- Pan & Zoom ---
    let zoomLevel = 1;
    const ZOOM_SPEED = 0.1;
    let panX = 0, panY = 0;
    let isPanning = false, startX = 0, startY = 0;
    
    function applyTransform() {
        const type = currentMode === 'image' ? 'image' : 'video';
        const activeContainer = document.querySelector(`.${type}-container.active`);
        if (zoomLevel > 1 && activeContainer) {
            const rect = activeContainer.getBoundingClientRect();
            panX = Math.min(0, Math.max(rect.width * (1 - zoomLevel), panX));
            panY = Math.min(0, Math.max(rect.height * (1 - zoomLevel), panY));
        } else if (zoomLevel <= 1) {
            panX = 0; panY = 0;
        }
        
        const transformStr = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
        if (currentMode === 'image') {
            imageLeft.style.transform = transformStr;
            imageMiddle.style.transform = transformStr;
            imageRight.style.transform = transformStr;
        } else {
            videoLeft.style.transform = transformStr;
            videoMiddle.style.transform = transformStr;
            videoRight.style.transform = transformStr;
        }
        
        btnResetZoom.style.display = zoomLevel > 1 ? 'flex' : 'none';
    }
    
    function resetZoom() {
        zoomLevel = 1; panX = 0; panY = 0;
        applyTransform();
    }
    
    btnResetZoom.addEventListener('click', resetZoom);
    
    viewports.forEach(viewport => {
        viewport.addEventListener('wheel', (e) => {
            const type = currentMode === 'image' ? 'image' : 'video';
            const container = viewport.querySelector(`.${type}-container`);
            if (!container) return;
            // Check if either media type is loaded in this mode
            const isLoaded = (currentMode === 'video' && (videoLeft.src || videoMiddle.src || videoRight.src)) || 
                             (currentMode === 'image' && (imageLeft.src || imageMiddle.src || imageRight.src));
            if (!isLoaded) return;

            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
            const relX = (mouseX - panX) / zoomLevel, relY = (mouseY - panY) / zoomLevel;
            const delta = Math.sign(e.deltaY) * -1;
            zoomLevel = Math.max(1, Math.min(10, zoomLevel + delta * ZOOM_SPEED * zoomLevel));
            panX = mouseX - relX * zoomLevel;
            panY = mouseY - relY * zoomLevel;
            applyTransform();
        }, { passive: false });
        
        viewport.addEventListener('mousedown', (e) => {
            if (zoomLevel <= 1) return;
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            applyTransform();
        });
        
        window.addEventListener('mouseup', () => isPanning = false);
    });

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateDuration() {
        masterDuration = Math.max(videoLeft.duration || 0, videoMiddle.duration || 0, videoRight.duration || 0);
        masterSeek.max = masterDuration;
        totalTimeDisplay.textContent = formatTime(masterDuration);
    }
});

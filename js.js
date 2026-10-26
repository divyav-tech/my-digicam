const captureBtn = document.getElementById('captureBtn');
const flash = document.getElementById('flash');
const screenFlash = document.getElementById('screenFlash');
const photoSlot = document.getElementById('photoSlot');
const strings = document.querySelectorAll('.string');
const galleryEmpty = document.getElementById('galleryEmpty');
const video = document.getElementById('video');
const cameraMsg = document.getElementById('cameraMsg');

const filterButtons = document.querySelectorAll('.chip');
const mirrorBtn = document.getElementById('mirrorBtn');
const flashBtn = document.getElementById('flashBtn');

const actionOverlay = document.getElementById('actionOverlay');
const closeAction = document.getElementById('closeAction');
const actionPhotoArt = document.getElementById('actionPhotoArt');
const actionTimestamp = document.getElementById('actionTimestamp');
const downloadBtn = document.getElementById('downloadBtn');
const removeBtn = document.getElementById('removeBtn');

const STORAGE_KEY = 'cuteCamPhotos';

const FILTERS = {
    none: 'none',
    pink: 'saturate(1.3) sepia(0.25) hue-rotate(-20deg) brightness(1.05)',
    bw: 'grayscale(1) contrast(1.1)',
    vintage: 'sepia(0.6) contrast(0.95) saturate(1.2)'
};

let currentFilter = 'none';
let mirrored = true;
let flashOn = true;
let currentPhoto = null; // the card open in the overlay
let printTimer = null;

// ---------- camera ----------

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            cameraMsg.style.display = 'none';
        })
        .catch((error) => {
            console.log('Camera error:', error);
            cameraMsg.textContent = 'Camera is blocked 🥲 allow access and refresh';
        });
} else {
    cameraMsg.textContent = 'Camera not available here. Try localhost or https';
}

// ---------- buttons on the preview ----------

video.classList.add('mirrored');

filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        video.style.filter = FILTERS[currentFilter];
    });
});

mirrorBtn.addEventListener('click', () => {
    mirrored = !mirrored;
    video.classList.toggle('mirrored', mirrored);
    mirrorBtn.textContent = `↔ Mirror: ${mirrored ? 'on' : 'off'}`;
});

flashBtn.addEventListener('click', () => {
    flashOn = !flashOn;
    flashBtn.textContent = `⚡ Flash: ${flashOn ? 'on' : 'off'}`;
});

// ---------- storage ----------

function loadPhotos() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function savePhotos(photos) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
        return true;
    } catch (error) {
        console.log('Storage error:', error); // usually: storage is full
        return false;
    }
}

function formatTimestamp(date) {
    const datePart = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
}

function shortestString() {
    let shortest = strings[0];
    strings.forEach((s) => {
        if (s.offsetHeight < shortest.offsetHeight) shortest = s;
    });
    return shortest;
}

function renderHungPhoto(data) {
    const card = document.createElement('div');
    card.classList.add('hung-photo');
    card.style.setProperty('--rotation', `${data.rotation}deg`);

    const clip = document.createElement('div');
    clip.classList.add('clip');

    const img = document.createElement('img');
    img.src = data.src;

    const stamp = document.createElement('p');
    stamp.classList.add('photo-timestamp');
    stamp.textContent = data.timestamp;

    card.append(clip, img, stamp);

    card.addEventListener('click', () => {
        currentPhoto = { ...data, el: card };
        actionPhotoArt.src = data.src;
        actionTimestamp.textContent = data.timestamp;
        actionOverlay.classList.add('show');
    });

    galleryEmpty.style.display = 'none';
    shortestString().appendChild(card);
}

// ---------- taking a picture ----------

function printPhoto(photo) {
    photoSlot.innerHTML = '';
    clearTimeout(printTimer);

    const printed = document.createElement('div');
    printed.classList.add('printed-photo');
    const printedImg = document.createElement('img');
    printedImg.src = photo;
    printed.appendChild(printedImg);
    photoSlot.appendChild(printed);

    setTimeout(() => printed.classList.add('printed'), 50);
    printTimer = setTimeout(() => { photoSlot.innerHTML = ''; }, 1000);
}

function takePhoto() {
    if (!video.videoWidth) return; 

    if (flashOn) {
        flash.classList.add('active');
        screenFlash.classList.add('active');
        setTimeout(() => {
            flash.classList.remove('active');
            screenFlash.classList.remove('active');
        }, 400);
    }

    const scale = Math.min(1, 600 / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    ctx.filter = FILTERS[currentFilter];
    if (mirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg', 0.8);

    printPhoto(photo);

    const data = {
        id: `photo-${Date.now()}`,
        src: photo,
        timestamp: formatTimestamp(new Date()),
        rotation: (Math.random() * 8 - 4).toFixed(1) // -4deg to +4deg
    };

    renderHungPhoto(data);

    const photos = loadPhotos();
    photos.push(data);
    if (!savePhotos(photos)) {
        alert('Storage is full 🥲 Remove a few old photos to keep saving new ones.');
    }
}

captureBtn.addEventListener('click', takePhoto);


closeAction.addEventListener('click', () => {
    actionOverlay.classList.remove('show');
});

removeBtn.addEventListener('click', () => {
    if (!currentPhoto) return;

    const photos = loadPhotos().filter((p) => p.id !== currentPhoto.id);
    savePhotos(photos);

    currentPhoto.el.remove();
    currentPhoto = null;

    if (photos.length === 0) galleryEmpty.style.display = 'block';
    actionOverlay.classList.remove('show');
});

downloadBtn.addEventListener('click', () => {
    if (!currentPhoto) return;
    const { src, timestamp } = currentPhoto;

    const img = new Image();
    img.onload = () => {
        const W = 600;
        const pad = 30;
        const size = W - pad * 2;

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = pad + size + 80;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#fdf6e3';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, pad, pad, size, size);

        ctx.fillStyle = 'rgba(122, 74, 99, 0.7)';
        ctx.font = "20px 'Courier New'";
        ctx.textAlign = 'center';
        ctx.fillText(timestamp, W / 2, pad + size + 48, size);

        const link = document.createElement('a');
        link.download = 'cute-cam.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    img.src = src;
});

loadPhotos().forEach(renderHungPhoto);

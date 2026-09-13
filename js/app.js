// Dynamic image resolver logic (as required for fallback and Wiki lookup)
async function resolveImage(imgEl) {
  const entity = imgEl.dataset.entity;
  const query = imgEl.dataset.query || imgEl.alt || 'placeholder';
  const w = imgEl.dataset.w || 600, h = imgEl.dataset.h || 400;

  if (entity) {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entity)}`);
      if (r.ok) {
        const j = await r.json();
        const src = (j.originalimage && j.originalimage.source) || (j.thumbnail && j.thumbnail.source);
        if (src) { imgEl.src = src; return; }
      }
    } catch (e) {}
  }

  try {
    const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=1&mature=false`);
    const j = await r.json();
    const hit = j.results && j.results[0];
    if (hit && (hit.thumbnail || hit.url)) { imgEl.src = hit.thumbnail || hit.url; return; }
  } catch (e) {}

  imgEl.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=${w}&height=${h}&nologo=true`;
}

// Initial Sample Data for Senior Citizens
const defaultMedicines = [
  { id: 1, name: 'एमलोडिपाइन (Amlodipine)', dose: '5mg - 1 गोली', time: 'morning', timeLabel: '🌅 सुबह (नाश्ते के बाद)', taken: false },
  { id: 2, name: 'मेटाफॉर्मिन (Metformin)', dose: '500mg - 1 गोली', time: 'morning', timeLabel: '🌅 सुबह (नाश्ते के बाद)', taken: true },
  { id: 3, name: 'मल्टीविटामिन (Multivitamin)', dose: '1 कैप्सूल', time: 'afternoon', timeLabel: '☀️ दोपहर (खाने के बाद)', taken: false },
  { id: 4, name: 'एटोर्वास्टैटिन (Atorvastatin)', dose: '10mg - 1 गोली', time: 'evening', timeLabel: '🌙 रात (सोने से पहले)', taken: false }
];

const defaultVitals = [
  { id: 1, date: 'आज 08:30 AM', sys: 124, dia: 82, sugar: '110 mg/dL', sugarType: 'खाली पेट (Fasting)', status: 'सामान्य (Normal)' },
  { id: 2, date: 'कल 08:00 AM', sys: 130, dia: 85, sugar: '142 mg/dL', sugarType: 'खाना खाने के बाद (PP)', status: 'सामान्य (Normal)' },
  { id: 3, date: '18/10/2023', sys: 128, dia: 84, sugar: '108 mg/dL', sugarType: 'खाली पेट (Fasting)', status: 'सामान्य (Normal)' }
];

const playlist = [
  { title: 'गायत्री मंत्र और ध्यान संगीत', artist: 'शांति व मानसिक एकाग्रता हेतु', duration: '15 मिनट' },
  { title: 'हनुमान चालीसा (मधुर स्वर)', artist: 'सुबह की प्रार्थना', duration: '10 मिनट' },
  { title: 'संत कबीर के दोहे व भजन', artist: 'अनुराग व विचार प्रवाह', duration: '20 मिनट' },
  { title: 'शांतिदायक बाँसुरी संगीत (Flute)', artist: 'अच्छी नींद और विश्राम हेतु', duration: '30 मिनट' }
];

// App State Management using localStorage
class SaharaApp {
  constructor() {
    this.medicines = JSON.parse(localStorage.getItem('sahara_meds')) || defaultMedicines;
    this.vitals = JSON.parse(localStorage.getItem('sahara_vitals')) || defaultVitals;
    this.waterCount = parseInt(localStorage.getItem('sahara_water')) || 5;
    this.currentFontSize = parseInt(localStorage.getItem('sahara_fontsize')) || 17;

    this.currentSongIndex = 0;
    this.isPlaying = false;
    this.sosCountdownInterval = null;

    this.initDOM();
    this.bindEvents();
    this.renderAll();
  }

  initDOM() {
    // Current date display in Hindi locale
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = today.toLocaleDateString('hi-IN', options);
    
    document.getElementById('current-date-str').textContent = dateStr;
    document.getElementById('year-str').textContent = today.getFullYear();
    document.getElementById('booking-date').valueAsDate = today;

    // Font size restore
    document.documentElement.style.setProperty('--base-font-size', `${this.currentFontSize}px`);
  }

  bindEvents() {
    // Accessibility font scale buttons
    document.getElementById('btn-font-add').addEventListener('click', () => this.changeFontSize(1));
    document.getElementById('btn-font-sub').addEventListener('click', () => this.changeFontSize(-1));
    document.getElementById('btn-font-reset').addEventListener('click', () => this.changeFontSize(0));

    // Voice Read-Aloud Assistant (Web Speech API)
    document.getElementById('btn-voice-read').addEventListener('click', () => this.speakOverview());

    // Mobile Navbar toggle
    document.getElementById('mobile-toggle').addEventListener('click', () => {
      document.getElementById('nav-menu').classList.toggle('active');
    });

    // SOS Emergency triggers
    const sosButtons = [
      document.getElementById('quick-sos-btn'),
      document.getElementById('hero-sos-trigger'),
      document.getElementById('big-sos-button')
    ];
    sosButtons.forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.triggerSOSModal());
    });

    document.getElementById('cancel-sos-btn').addEventListener('click', () => this.cancelSOS());
    document.getElementById('confirm-sos-btn').addEventListener('click', () => {
      this.cancelSOS();
      window.location.href = 'tel:108';
    });

    // Medicine Filters & Actions
    document.querySelectorAll('.time-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.time-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.renderMedicines(e.target.dataset.time);
      });
    });

    // Add Medicine Modal
    document.getElementById('open-med-modal').addEventListener('click', () => {
      document.getElementById('med-modal').classList.add('active');
    });
    document.getElementById('close-med-modal').addEventListener('click', () => {
      document.getElementById('med-modal').classList.remove('active');
    });
    document.getElementById('add-med-form').addEventListener('submit', (e) => this.handleAddMedicine(e));

    // Refill ordering buttons
    document.querySelectorAll('.order-refill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const medName = e.target.dataset.med;
        this.showToast(`✅ ${medName} का रिफ़िल ऑर्डर निज़ांपेट फ़ार्मेसी को भेजा गया!`);
      });
    });

    // Water counter
    document.getElementById('water-plus').addEventListener('click', () => {
      this.waterCount++;
      this.updateWater();
    });
    document.getElementById('water-minus').addEventListener('click', () => {
      if (this.waterCount > 0) this.waterCount--;
      this.updateWater();
    });

    // Vitals form submit
    document.getElementById('vitals-form').addEventListener('submit', (e) => this.handleVitalsSubmit(e));

    // Service Booking Modal
    document.querySelectorAll('.book-service-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const service = e.target.dataset.service;
        document.getElementById('booking-service-name').value = service;
        document.getElementById('service-modal-title').textContent = `${service} बुकिंग`;
        document.getElementById('service-modal').classList.add('active');
      });
    });

    document.getElementById('close-service-modal').addEventListener('click', () => {
      document.getElementById('service-modal').classList.remove('active');
    });

    document.getElementById('service-booking-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const sName = document.getElementById('booking-service-name').value;
      document.getElementById('service-modal').classList.remove('active');
      this.showToast(`🎉 ${sName} हेतु आपका अनुरोध दर्ज हो गया है। प्रतिनिधि जल्द संपर्क करेंगे।`);
    });

    // Audio player controls
    document.getElementById('play-pause-btn').addEventListener('click', () => this.toggleAudioPlay());
    document.getElementById('next-song-btn').addEventListener('click', () => this.changeSong(1));
    document.getElementById('prev-song-btn').addEventListener('click', () => this.changeSong(-1));

    // Start Exercise Guidance
    document.querySelectorAll('.start-ex-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const exName = e.target.dataset.ex;
        this.speakText(`${exName} का अभ्यास शुरू कर रहे हैं। आरामदायक स्थिति में बैठें और गहरी सांस लें।`);
        this.showToast(`🧘 ${exName} सत्र शुरू हुआ!`);
      });
    });

    // Resolve static dynamic images asynchronously
    document.querySelectorAll('img[data-query]').forEach(resolveImage);
  }

  // ACCESSIBILITY & VOICE
  changeFontSize(direction) {
    if (direction === 0) {
      this.currentFontSize = 17;
    } else {
      this.currentFontSize = Math.min(Math.max(this.currentFontSize + (direction * 2), 14), 24);
    }
    document.documentElement.style.setProperty('--base-font-size', `${this.currentFontSize}px`);
    localStorage.setItem('sahara_fontsize', this.currentFontSize);
    this.showToast(`अक्षर आकार: ${this.currentFontSize}px`);
  }

  speakText(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9; // Slightly slower for senior citizens
      window.speechSynthesis.speak(utterance);
    } else {
      this.showToast("🔊 आपके ब्राउज़र में ऑडियो सुविधा उपलब्ध नहीं है।");
    }
  }

  speakOverview() {
    const pending = this.medicines.filter(m => !m.taken).length;
    const msg = `सहारा ऐप में आपका स्वागत है। आज आपकी ${pending} दवाइयाँ लेना शेष हैं। आपात स्थिति में लाल SOS बटन दबाएँ।`;
    this.speakText(msg);
  }

  // SOS LOGIC
  triggerSOSModal() {
    const modal = document.getElementById('sos-modal');
    const timerSpan = document.getElementById('sos-countdown');
    modal.classList.add('active');
    
    let count = 5;
    timerSpan.textContent = count;
    
    this.speakText("आपातकालीन अलार्म सक्रिय हो गया है। 5 सेकंड में कॉल की जा रही है।");

    clearInterval(this.sosCountdownInterval);
    this.sosCountdownInterval = setInterval(() => {
      count--;
      timerSpan.textContent = count;
      if (count <= 0) {
        clearInterval(this.sosCountdownInterval);
        window.location.href = 'tel:108';
      }
    }, 1000);
  }

  cancelSOS() {
    clearInterval(this.sosCountdownInterval);
    document.getElementById('sos-modal').classList.remove('active');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.showToast("🚨 SOS अलार्म रद्द कर दिया गया।");
  }

  // MEDICINES RENDERING
  renderMedicines(filter = 'all') {
    const container = document.getElementById('med-list-container');
    container.innerHTML = '';

    const filtered = this.medicines.filter(m => filter === 'all' || m.time === filter);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-3);">
          🎉 इस समय के लिए कोई दवा शेड्यूल नहीं है!
        </div>`;
      return;
    }

    filtered.forEach(med => {
      const item = document.createElement('div');
      item.className = `med-item ${med.taken ? 'taken' : ''}`;
      item.innerHTML = `
        <input type="checkbox" class="med-checkbox" ${med.taken ? 'checked' : ''} data-id="${med.id}">
        <div class="med-details">
          <div class="med-title">${med.name}</div>
          <div class="med-meta">
            <span>💊 ${med.dose}</span>
            <span class="med-badge">${med.timeLabel}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm delete-med-btn" data-id="${med.id}" title="हटाएँ">🗑️</button>
      `;
      container.appendChild(item);
    });

    // Checkbox toggle handlers
    container.querySelectorAll('.med-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const med = this.medicines.find(m => m.id === id);
        if (med) {
          med.taken = e.target.checked;
          this.saveMedicines();
          this.renderMedicines(filter);
          this.updatePendingCount();
          if (med.taken) this.showToast(`✓ ${med.name} लेने के रूप में दर्ज!`);
        }
      });
    });

    // Delete med handlers
    container.querySelectorAll('.delete-med-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.medicines = this.medicines.filter(m => m.id !== id);
        this.saveMedicines();
        this.renderMedicines(filter);
        this.updatePendingCount();
      });
    });

    this.updatePendingCount();
  }

  handleAddMedicine(e) {
    e.preventDefault();
    const name = document.getElementById('med-name').value;
    const dose = document.getElementById('med-dosage').value;
    const time = document.getElementById('med-time').value;

    const timeLabels = {
      morning: '🌅 सुबह (नाश्ते के बाद)',
      afternoon: '☀️ दोपहर (खाने के बाद)',
      evening: '🌙 रात (सोने से पहले)'
    };

    const newMed = {
      id: Date.now(),
      name,
      dose,
      time,
      timeLabel: timeLabels[time],
      taken: false
    };

    this.medicines.push(newMed);
    this.saveMedicines();
    this.renderMedicines('all');

    document.getElementById('add-med-form').reset();
    document.getElementById('med-modal').classList.remove('active');
    this.showToast(`💊 नई दवा '${name}' सफलतापूर्वक जोड़ी गई!`);
  }

  saveMedicines() {
    localStorage.setItem('sahara_meds', JSON.stringify(this.medicines));
  }

  updatePendingCount() {
    const pending = this.medicines.filter(m => !m.taken).length;
    document.getElementById('pending-pills-count').textContent = pending;
  }

  // VITALS LOGIC
  updateWater() {
    document.getElementById('water-count-display').textContent = this.waterCount;
    localStorage.setItem('sahara_water', this.waterCount);
  }

  handleVitalsSubmit(e) {
    e.preventDefault();
    const sys = document.getElementById('vital-sys').value;
    const dia = document.getElementById('vital-dia').value;
    const sugar = document.getElementById('vital-sugar').value;
    const sugarType = document.getElementById('sugar-type').value;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

    const newVital = {
      id: Date.now(),
      date: `आज ${timeStr}`,
      sys: parseInt(sys),
      dia: parseInt(dia),
      sugar: `${sugar} mg/dL`,
      sugarType,
      status: (sys <= 130 && dia <= 85) ? 'सामान्य (Normal)' : 'ध्यान दें (Check)'
    };

    this.vitals.unshift(newVital);
    localStorage.setItem('sahara_vitals', JSON.stringify(this.vitals));
    this.renderVitalsHistory();

    document.getElementById('vitals-form').reset();
    this.showToast('🩺 आज के स्वास्थ आंकड़े सुरक्षित कर लिए गए हैं!');
  }

  renderVitalsHistory() {
    const container = document.getElementById('vitals-history-list');
    container.innerHTML = '';

    if (this.vitals.length === 0) {
      container.innerHTML = `<div class="text-muted">कोई पिछला रिकॉर्ड नहीं है।</div>`;
      return;
    }

    this.vitals.forEach(v => {
      const item = document.createElement('div');
      item.className = 'vital-log-item';
      item.innerHTML = `
        <div>
          <strong>बीपी: ${v.sys}/${v.dia} mmHg | शुगर: ${v.sugar}</strong>
          <div class="text-sm text-muted">${v.date} (${v.sugarType})</div>
        </div>
        <span class="vital-tag">${v.status}</span>
      `;
      container.appendChild(item);
    });
  }

  // AUDIO PLAYER
  renderPlaylist() {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';

    playlist.forEach((song, idx) => {
      const item = document.createElement('div');
      item.className = `playlist-item ${idx === this.currentSongIndex ? 'active' : ''}`;
      item.innerHTML = `
        <div>
          <strong>${song.title}</strong>
          <div class="text-sm text-muted">${song.artist}</div>
        </div>
        <span class="text-sm">${song.duration}</span>
      `;
      item.addEventListener('click', () => {
        this.currentSongIndex = idx;
        this.updatePlayer();
        this.toggleAudioPlay(true);
      });
      container.appendChild(item);
    });
  }

  updatePlayer() {
    const song = playlist[this.currentSongIndex];
    document.getElementById('current-song-title').textContent = song.title;
    document.getElementById('current-song-artist').textContent = song.artist;
    this.renderPlaylist();
  }

  toggleAudioPlay(forcePlay = false) {
    if (forcePlay) this.isPlaying = true;
    else this.isPlaying = !this.isPlaying;

    const playBtn = document.getElementById('play-pause-btn');
    const disc = document.getElementById('disc-anim');

    if (this.isPlaying) {
      playBtn.textContent = '⏸️ रोकें';
      disc.classList.add('playing');
      const song = playlist[this.currentSongIndex];
      this.speakText(`अब चल रहा है: ${song.title}`);
    } else {
      playBtn.textContent = '▶️ चलाएं';
      disc.classList.remove('playing');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }

  changeSong(direction) {
    this.currentSongIndex = (this.currentSongIndex + direction + playlist.length) % playlist.length;
    this.updatePlayer();
    if (this.isPlaying) this.toggleAudioPlay(true);
  }

  // TOAST NOTIFICATIONS
  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  renderAll() {
    this.renderMedicines();
    this.updateWater();
    this.renderVitalsHistory();
    this.updatePlayer();
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.saharaApp = new SaharaApp();
});
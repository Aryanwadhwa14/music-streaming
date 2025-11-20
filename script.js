// ---------- DATA SETUP ----------

// Song library: title, artist, genre, audio file path
// Make sure the "audio" values match the actual .mp3 names in your /audio folder
const songs = [
  { id: 1, title: "Midnight Drive", artist: "Luna Waves", genre: "Lo-fi", audio: "audio/Jatta-ka-chora" },
  { id: 2, title: "Neon Skies", artist: "Pulse City", genre: "EDM", audio: "audio/mitwa.mp3" },
  { id: 3, title: "Coffee Shop Chill", artist: "LoKey", genre: "Lo-fi", audio: "audio/No-Entry.mp3" },
  { id: 4, title: "Sunrise Over You", artist: "Aurora Heart", genre: "Pop", audio: "audio/Uncha-Lamba.mp3" },
  { id: 5, title: "Binary Dreams", artist: "CodeRun", genre: "Electronic", audio: "audio/Yaar-batere.mp3" },
  { id: 6, title: "Blues in C", artist: "Old Town Trio", genre: "Blues", audio: "audio/blues-in-c.mp3" },
  { id: 7, title: "Rainy Window", artist: "Luna Waves", genre: "Lo-fi", audio: "audio/rainy-window.mp3" },
  { id: 8, title: "Fire & Ice", artist: "Pulse City", genre: "EDM", audio: "audio/fire-and-ice.mp3" },
];

// ---------- QUEUE IMPLEMENTATION (REQUEST QUEUE) ----------

class Queue {
  constructor() {
    this.items = {};
    this.frontIndex = 0;
    this.backIndex = 0;
  }

  enqueue(item) {
    this.items[this.backIndex] = item;
    this.backIndex++;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const item = this.items[this.frontIndex];
    delete this.items[this.frontIndex];
    this.frontIndex++;
    return item;
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.frontIndex];
  }

  size() {
    return this.backIndex - this.frontIndex;
  }

  isEmpty() {
    return this.size() === 0;
  }

  toArray() {
    const arr = [];
    for (let i = this.frontIndex; i < this.backIndex; i++) {
      arr.push(this.items[i]);
    }
    return arr;
  }

  clear() {
    this.items = {};
    this.frontIndex = 0;
    this.backIndex = 0;
  }
}

// ---------- STACK IMPLEMENTATION (RECENT PLAYS) ----------

const recentPlaysStack = {
  items: [],
  push(song) {
    this.items.push(song);
  },
  pop() {
    return this.items.pop();
  },
  peek() {
    return this.items[this.items.length - 1] || null;
  },
  size() {
    return this.items.length;
  },
  toArray() {
    return [...this.items].reverse(); // top of stack first
  },
  clear() {
    this.items = [];
  }
};

// ---------- HASH TABLE IMPLEMENTATION (ARTIST → PLAY COUNT) ----------

const artistPlayCount = new Map();

// ---------- GENRE FREQUENCY (FOR BAR PLOT) ----------

const genreFrequency = {}; // genre -> count

function recordGenrePlay(genre) {
  if (!genreFrequency[genre]) {
    genreFrequency[genre] = 0;
  }
  genreFrequency[genre]++;
}

// ---------- AUDIO PLAYER STATE ----------

const audio = new Audio();
let currentSong = null;
let isPlaying = false;

// ---------- DOM ELEMENTS ----------

const songSelect = document.getElementById("songSelect");

const songDetailsTitle = document.getElementById("songDetailsTitle");
const songDetailsArtist = document.getElementById("songDetailsArtist");
const songDetailsGenre = document.getElementById("songDetailsGenre");

const nowPlayingTitle = document.getElementById("nowPlayingTitle");
const nowPlayingArtist = document.getElementById("nowPlayingArtist");
const nowPlayingGenre = document.getElementById("nowPlayingGenre");
const playCountSpan = document.getElementById("playCount");

const queueList = document.getElementById("queueList");
const queueSizeSpan = document.getElementById("queueSize");

const stackList = document.getElementById("stackList");
const stackSizeSpan = document.getElementById("stackSize");

const artistStats = document.getElementById("artistStats");
const genreChart = document.getElementById("genreChart");
const genreLegend = document.getElementById("genreLegend");

const addToQueueBtn = document.getElementById("addToQueueBtn");
const playNowBtn = document.getElementById("playNowBtn");
const serveNextBtn = document.getElementById("serveNextBtn");
const clearQueueBtn = document.getElementById("clearQueueBtn");

const togglePlayBtn = document.getElementById("togglePlayBtn");
const stopBtn = document.getElementById("stopBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeLabel = document.getElementById("currentTime");
const durationLabel = document.getElementById("duration");

// ---------- STATE ----------

const requestQueue = new Queue();

// ---------- HELPERS ----------

function findSongById(id) {
  return songs.find((s) => s.id === Number(id));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ---------- UI UPDATE FUNCTIONS ----------

function populateSongSelect() {
  songs.forEach((song) => {
    const option = document.createElement("option");
    option.value = song.id;
    option.textContent = `${song.title} — ${song.artist} (${song.genre})`;
    songSelect.appendChild(option);
  });

  updateSelectedSongDetails();
}

function updateSelectedSongDetails() {
  const selectedId = songSelect.value;
  const song = findSongById(selectedId);
  if (!song) return;

  songDetailsTitle.textContent = song.title;
  songDetailsArtist.textContent = song.artist;
  songDetailsGenre.textContent = song.genre;
}

function renderQueue() {
  queueList.innerHTML = "";
  const items = requestQueue.toArray();

  items.forEach((song, index) => {
    const li = document.createElement("li");
    const position = index + 1;
    li.dataset.songId = song.id;

    li.innerHTML = `
      <span class="title">${position}. ${song.title}</span>
      <span class="meta">${song.artist} • ${song.genre}</span>
    `;

    if (currentSong && song.id === currentSong.id) {
      li.classList.add("active");
    }

    // Optional: click a song in queue to play it immediately
    li.addEventListener("click", () => {
      playSong(song);
    });

    queueList.appendChild(li);
  });

  queueSizeSpan.textContent = requestQueue.size();
}

function renderStack() {
  stackList.innerHTML = "";
  const items = recentPlaysStack.toArray();

  items.forEach((song, index) => {
    const li = document.createElement("li");
    li.dataset.songId = song.id;
    li.innerHTML = `
      <span class="title">${index + 1}. ${song.title}</span>
      <span class="meta">${song.artist} • ${song.genre}</span>
    `;

    if (currentSong && song.id === currentSong.id) {
      li.classList.add("active");
    }

    // Click recent song to replay
    li.addEventListener("click", () => {
      playSong(song);
    });

    stackList.appendChild(li);
  });

  stackSizeSpan.textContent = recentPlaysStack.size();
}

function renderArtistStats() {
  artistStats.innerHTML = "";

  const entries = Array.from(artistPlayCount.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No artist stats yet. Play some songs!";
    artistStats.appendChild(li);
    return;
  }

  entries.forEach(([artist, count]) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="title">${artist}</span>
      <span class="meta">${count} plays</span>
    `;
    artistStats.appendChild(li);
  });
}

function renderGenreChart() {
  genreChart.innerHTML = "";
  genreLegend.innerHTML = "";

  const genres = Object.keys(genreFrequency);
  if (genres.length === 0) {
    const span = document.createElement("span");
    span.textContent = "No data yet.";
    genreLegend.appendChild(span);
    return;
  }

  const maxCount = Math.max(...Object.values(genreFrequency));
  const maxHeight = 140; // px

  genres.forEach((genre) => {
    const count = genreFrequency[genre];

    const barWrapper = document.createElement("div");
    barWrapper.className = "genre-bar";

    const barInner = document.createElement("div");
    barInner.className = "genre-bar-inner";

    const height = (count / maxCount) * maxHeight;
    barInner.style.height = `${height}px`;

    const valueLabel = document.createElement("div");
    valueLabel.className = "genre-value";
    valueLabel.textContent = count;

    barWrapper.appendChild(barInner);
    barWrapper.appendChild(valueLabel);
    genreChart.appendChild(barWrapper);

    const legendItem = document.createElement("span");
    legendItem.textContent = genre;
    genreLegend.appendChild(legendItem);
  });
}

function updatePlayButton() {
  togglePlayBtn.textContent = isPlaying ? "⏸" : "▶";
}

// ---------- CORE LOGIC: PLAYING SONGS ----------

function playSong(song) {
  if (!song) return;

  currentSong = song;

  // Update "Now Playing" info
  nowPlayingTitle.textContent = song.title;
  nowPlayingArtist.textContent = song.artist;
  nowPlayingGenre.textContent = song.genre;

  // Update audio source and play
  if (song.audio) {
    audio.src = song.audio;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        isPlaying = true;
        updatePlayButton();
      })
      .catch((err) => {
        console.error("Error playing audio:", err);
        isPlaying = false;
        updatePlayButton();
      });
  } else {
    isPlaying = false;
    updatePlayButton();
  }

  // STACK: push song to recent plays
  recentPlaysStack.push(song);
  renderStack();

  // HASH TABLE: update artist play count
  const currentCount = artistPlayCount.get(song.artist) || 0;
  artistPlayCount.set(song.artist, currentCount + 1);
  playCountSpan.textContent = currentCount + 1;
  renderArtistStats();

  // GENRE FREQUENCY
  recordGenrePlay(song.genre);
  renderGenreChart();

  // Highlight in queue and stack
  renderQueue();
  renderStack();
}

// ---------- EVENT HANDLERS (UI) ----------

songSelect.addEventListener("change", updateSelectedSongDetails);

addToQueueBtn.addEventListener("click", () => {
  const selectedId = songSelect.value;
  const song = findSongById(selectedId);
  if (!song) return;

  requestQueue.enqueue(song);
  renderQueue();
});

playNowBtn.addEventListener("click", () => {
  const selectedId = songSelect.value;
  const song = findSongById(selectedId);
  if (!song) return;

  playSong(song);
});

serveNextBtn.addEventListener("click", () => {
  const nextSong = requestQueue.dequeue();
  if (!nextSong) {
    alert("Queue is empty! Add some song requests first.");
    return;
  }

  renderQueue();
  playSong(nextSong);
});

clearQueueBtn.addEventListener("click", () => {
  requestQueue.clear();
  renderQueue();
});

// Play / Pause toggle
togglePlayBtn.addEventListener("click", () => {
  if (!currentSong) {
    // If nothing is playing, play selected song
    const selectedId = songSelect.value;
    const song = findSongById(selectedId);
    if (song) {
      playSong(song);
    }
    return;
  }

  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio
      .play()
      .then(() => {
        isPlaying = true;
      })
      .catch((err) => console.error("Error resuming audio:", err));
  }

  updatePlayButton();
});

// Stop button
stopBtn.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  isPlaying = false;
  updatePlayButton();
});

// Progress bar scrubbing
progressBar.addEventListener("input", () => {
  if (!audio.duration) return;
  const percentage = progressBar.value / 100;
  audio.currentTime = percentage * audio.duration;
});

// ---------- EVENT HANDLERS (AUDIO) ----------

// Update progress bar and time labels as the audio plays
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const progress = (audio.currentTime / audio.duration) * 100;
  progressBar.value = isNaN(progress) ? 0 : progress;

  currentTimeLabel.textContent = formatTime(audio.currentTime);
});

// When metadata is loaded, set overall duration
audio.addEventListener("loadedmetadata", () => {
  durationLabel.textContent = formatTime(audio.duration);
});

// When song ends, automatically play next in queue if available
audio.addEventListener("ended", () => {
  isPlaying = false;
  updatePlayButton();

  const nextSong = requestQueue.dequeue();
  if (nextSong) {
    renderQueue();
    playSong(nextSong);
  }
});

// ---------- STARTUP ----------

window.addEventListener("DOMContentLoaded", () => {
  populateSongSelect();
  renderQueue();
  renderStack();
  renderArtistStats();
  renderGenreChart();
  updatePlayButton();
});

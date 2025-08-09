
// Global audio objects
let audioContext;
let isPlaying = false;
let synths = {};
let effects = {};
let sequences = {};
let layers = {
  pad: true,
  melody: false,
  drone: true,
  fx: true,
};

// Musical scales and progressions for night atmosphere
const nightChords = [
  ["A3", "C4", "E4", "G4"], // Am7
  ["F3", "A3", "C4", "E4"], // Fmaj7
  ["C3", "E3", "G3", "B3"], // Cmaj7
  ["G3", "B3", "D4", "F#4"], // G7
  ["D3", "F#3", "A3", "C4"], // Dm7
  ["E3", "G#3", "B3", "D4"], // E7
];

const melodyNotes = ["A4", "C5", "E5", "F5", "G5", "A5", "C6"];
const droneNotes = ["A1", "E2", "A2"];

async function initializeAudio() {
  await Tone.start();

  // Create effects chain
  effects.reverb = new Tone.Reverb(6).toDestination();
  effects.delay = new Tone.PingPongDelay("8n", 0.2).connect(
    effects.reverb
  );
  effects.filter = new Tone.Filter(800, "lowpass").connect(effects.delay);

  // Create synthesizers
  synths.pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sawtooth" },
    envelope: { attack: 8, decay: 0.1, sustain: 0.9, release: 12 },
    filter: { frequency: 1000, rolloff: -24, Q: 1 },
  }).connect(effects.filter);

  synths.melody = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 3, decay: 2, sustain: 0.3, release: 8 },
    filter: { frequency: 2000, rolloff: -12 },
  }).connect(effects.reverb);

  synths.drone = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 12, decay: 0, sustain: 1, release: 15 },
    filter: { frequency: 400, rolloff: -24 },
  }).connect(effects.filter);

  // Set initial volumes
  synths.pad.volume.value = -15;
  synths.melody.volume.value = -20;
  synths.drone.volume.value = -18;

  // updateVisualization();
}

function createPadSequence() {
  let chordIndex = 0;
  sequences.pad = new Tone.Loop((time) => {
    if (layers.pad) {
      const chord = nightChords[chordIndex % nightChords.length];
      synths.pad.triggerAttackRelease(chord, "2m", time);
      chordIndex++;
    }
  }, "4m");
  sequences.pad.start(0);
}

function createMelodySequence() {
  sequences.melody = new Tone.Loop((time) => {
    if (layers.melody) {
      const density =
        parseInt(document.getElementById("melodyDens").value) / 100;
      if (Math.random() < density * 0.4) {
        const note =
          melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
        const duration = Math.random() > 0.5 ? "2n" : "4n";
        synths.melody.triggerAttackRelease(note, duration, time);
      }
    }
  }, "1m");
  sequences.melody.start(0);
}

function createDroneSequence() {
  let droneIndex = 0;
  sequences.drone = new Tone.Loop((time) => {
    if (layers.drone) {
      synths.drone.triggerRelease(time);
      const note = droneNotes[droneIndex % droneNotes.length];
      synths.drone.triggerAttack(note, time + 0.1);
      droneIndex++;
    }
  }, "8m");
  sequences.drone.start(0);
}

async function startMusic() {
  if (isPlaying) return;

  await initializeAudio();

  isPlaying = true;
  // document.getElementById("playBtn").textContent = "⏸ 暫停";
  // document.getElementById("playBtn").classList.add("playing");

  // Create sequences
  createPadSequence();
  createMelodySequence();
  createDroneSequence();

  // Start transport
  Tone.Transport.bpm.value = 40;
  Tone.Transport.start();

  // Start drone immediately
  if (layers.drone) {
    synths.drone.triggerAttack("A1");
  }
}

function stopMusic() {
  if (!isPlaying) return;

  isPlaying = false;
  document.getElementById("playBtn").textContent = "▶ 開始音樂之旅";
  document.getElementById("playBtn").classList.remove("playing");

  Tone.Transport.stop();

  // Stop all sequences
  Object.values(sequences).forEach((seq) => {
    if (seq) seq.stop();
  });

  // Release all notes
  Object.values(synths).forEach((synth) => {
    if (synth.releaseAll) synth.releaseAll();
    if (synth.triggerRelease) synth.triggerRelease();
  });
}

function regenerateMusic() {
  if (isPlaying) {
    stopMusic();
    setTimeout(startMusic, 100);
  }
}

function updateVisualization() {
  const visualizer = document.getElementById("visualizer");
  visualizer.innerHTML = "";

  for (let i = 0; i < 50; i++) {
    const bar = document.createElement("div");
    bar.className = "frequency-bar";
    bar.style.left = i * 2 + 5 + "%";
    bar.style.animationDelay = i * 0.1 + "s";
    bar.style.animationDuration = 2 + Math.random() * 3 + "s";
    visualizer.appendChild(bar);
  }
}

function updateAudio() {
  if (!isPlaying) return;

  // Update volumes
  const padVol = parseInt(document.getElementById("padVol").value);
  const melodyVol = parseInt(document.getElementById("melodyVol").value);
  const droneVol = parseInt(document.getElementById("droneVol").value);

  synths.pad.volume.value = -30 + padVol * 0.2;
  synths.melody.volume.value = -35 + melodyVol * 0.25;
  synths.drone.volume.value = -35 + droneVol * 0.2;

  // Update filter
  const filterFreq = parseInt(document.getElementById("padFilt").value);
  effects.filter.frequency.value = 200 + filterFreq * 15;

  // Update reverb
  const reverbAmt =
    parseInt(document.getElementById("reverbAmt").value) / 100;
  effects.reverb.wet.value = reverbAmt * 0.8;

  // Update delay
  const delayAmt =
    parseInt(document.getElementById("delayAmt").value) / 100;
  effects.delay.wet.value = delayAmt * 0.4;
}

function toggleLayer(layerName) {
  layers[layerName] = !layers[layerName];
  const button = document.getElementById(layerName + "Toggle");
  button.classList.toggle("active");
  button.textContent = layers[layerName] ? "啟用" : "停用";
}

function loadPreset(presetName) {
  const presets = {
    solitude: {
      padVol: 80,
      padFilt: 30,
      melodyVol: 20,
      melodyDens: 15,
      droneVol: 70,
      droneDrft: 20,
      reverbAmt: 85,
      delayAmt: 25,
    },
    mystery: {
      padVol: 60,
      padFilt: 60,
      melodyVol: 40,
      melodyDens: 35,
      droneVol: 50,
      droneDrft: 50,
      reverbAmt: 90,
      delayAmt: 60,
    },
    contemplation: {
      padVol: 90,
      padFilt: 20,
      melodyVol: 30,
      melodyDens: 20,
      droneVol: 60,
      droneDrft: 15,
      reverbAmt: 75,
      delayAmt: 30,
    },
    distant: {
      padVol: 50,
      padFilt: 70,
      melodyVol: 15,
      melodyDens: 10,
      droneVol: 80,
      droneDrft: 40,
      reverbAmt: 95,
      delayAmt: 50,
    },
  };

  const preset = presets[presetName];
  if (!preset) return;

  Object.entries(preset).forEach(([key, value]) => {
    const element = document.getElementById(key);
    const display = document.getElementById(
      key
        .replace(/([A-Z])/g, "$1")
        .replace(
          /^./,
          (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
        )
    );

    if (element) {
      element.value = value;
      if (display) display.textContent = value;
    }
  });

  updateAudio();
}

// Event listeners
// document.getElementById("playBtn").addEventListener("click", () => {
//   isPlaying ? stopMusic() : startMusic();
// });

// document.getElementById("stopBtn").addEventListener("click", stopMusic);
// document
//   .getElementById("regenerateBtn")
//   .addEventListener("click", regenerateMusic);

// Layer toggles
["pad", "melody", "drone", "fx"].forEach((layer) => {
  const button = document.getElementById(layer + "Toggle");
  if (button) {
    button.addEventListener("click", () => toggleLayer(layer));
  }
});

// Slider updates
const sliderMappings = {
  padVol: "padVolume",
  padFilt: "padFilter",
  melodyVol: "melodyVolume",
  melodyDens: "melodyDensity",
  droneVol: "droneVolume",
  droneDrft: "droneDrift",
  reverbAmt: "reverbAmount",
  delayAmt: "delayAmount",
};

// Object.entries(sliderMappings).forEach(([sliderId, displayId]) => {
//   const slider = document.getElementById(sliderId);
//   const display = document.getElementById(displayId);

//   if (slider && display) {
//     slider.addEventListener("input", (e) => {
//       display.textContent = e.target.value;
//       updateAudio();
//     });
//   }
// });

// // Initialize visualization on load
// window.addEventListener("load", updateVisualization);

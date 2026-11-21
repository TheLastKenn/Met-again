const JOURNAL_QUESTIONS = [
  "Nárrame todo lo que te ha pasado.",
  "Ahora dime qué quisieras que ocurriera entre nosotros y qué preferirías que no ocurriera.",
  "Cuéntame y sé sincera, Lau... ¿Cómo te fue durante este tiempo?"
];

const MY_ANSWERS = [
  ["Color favorito", "Verde"],
  ["Comida favorita", "Lasaña"],
  ["Lugar favorito", "Juntos"],
  ["Canción favorita", "La canción de fondo"],
  ["Serie favorita", "Visión"],
  ["Película favorita", "Interstellar"],
  ["Número favorito", "8"],
  ["Flor favorita", "Rosa con espinas"],
  ["Jugo favorito", "Maracuyá"],
  ["Dulce favorito", "Cualquiera :)"],
  ["Juego favorito", "Cualquiera que disfrutemos"]
];

const MY_PERSONAL_NOTE = [
  "Hasta el momento no he hecho más que sanar, enfocarme en mí mismo y ser más sociable.",
  "Tengo más “amistades” y así, por ti.",
  "No he estado en otra relación ni algo por el estilo. Quisiera estarlo, ya sabrás con quién, pero como te dije antes: conozcámonos de nuevo.",
  "Sé que faltan detalles e información, y ponernos al día. Eso lo haremos cuando salgamos juntos.",
  "🥺"
];

const scenes = Array.from(document.querySelectorAll(".scene"));
const typedLine = document.getElementById("typed-line");
const continueButton = document.getElementById("continue-button");
const soundToggle = document.getElementById("sound-toggle");
const soundStatus = document.getElementById("sound-status");
const backgroundMusic = document.getElementById("background-music");
const curtainTransition = document.getElementById("curtain-transition");
const bookTransition = document.getElementById("book-transition");
const MUSIC_SOURCE = "JVKE - golden hour (official music video).mp3";
const SETTING_BY_SCENE = {
  "scene-intro": "window-rain",
  "scene-welcome": "window-sun",
  "scene-notebook": "book",
  "scene-favorites": "chalkboard",
  "scene-invitation": "phone",
  "scene-share": "garden",
  "scene-farewell": "garden"
};
let journalIndex = 0;
let currentTheme = "rain";
let audioContext;
let ambientGain;
let noiseSource;
let birdTimer;
let soundIsOn = false;
let musicRequested = false;
let isTransitioning = false;

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function typeLine(text) {
  const characters = Array.from(text);

  for (const character of characters) {
    typedLine.textContent += character;
    await wait(45);
  }

  await wait(Math.max(2600, characters.length * 70));

  while (typedLine.textContent.length > 0) {
    const remaining = Array.from(typedLine.textContent);
    remaining.pop();
    typedLine.textContent = remaining.join("");
    await wait(60);
  }
}

async function playIntroduction() {
  const lines = [
    "Hola...",
    "Cuánto tiempo...",
    "¿Me extrañaste?",
    "Te sigo amando como una abeja a una flor.",
    "Pero, ¿sabes? Deberíamos conocernos desde cero.",
    "Hagámoslo, ¿te parece?"
  ];

  for (const line of lines) {
    await typeLine(line);
    await wait(160);
  }

  typedLine.textContent = "Hagámoslo, ¿te parece?";
  continueButton.hidden = false;
}

function showScene(sceneId, theme) {
  const target = document.getElementById(sceneId);
  if (!target) {
    throw new Error(`No existe la escena "${sceneId}".`);
  }

  for (const scene of scenes) {
    const isActive = scene === target;
    scene.classList.toggle("is-active", isActive);
    scene.setAttribute("aria-hidden", String(!isActive));
  }

  currentTheme = theme || "sun";
  document.body.dataset.theme = currentTheme;
  document.body.dataset.setting = SETTING_BY_SCENE[sceneId];
  if (soundIsOn) {
    if (musicRequested && MUSIC_SOURCE) {
      void startMusic();
    } else {
      startAmbient(currentTheme);
    }
  }
  target.querySelector("h1, textarea, input, button")?.focus({ preventScroll: true });

  if (sceneId === "scene-favorites") {
    const meme = document.getElementById("cat-meme");
    meme.classList.remove("is-gone");
    window.setTimeout(() => meme.classList.add("is-gone"), 2600);
  }
}

async function transitionToScene(sceneId, theme) {
  if (isTransitioning) {
    return;
  }

  const outgoing = scenes.find((scene) => scene.classList.contains("is-active"));
  if (!outgoing || outgoing.id === sceneId) {
    showScene(sceneId, theme);
    return;
  }

  isTransitioning = true;
  outgoing.classList.add("is-leaving");
  try {
    await wait(420);
    showScene(sceneId, theme);
  } finally {
    outgoing.classList.remove("is-leaving");
    isTransitioning = false;
  }
}

function setStatus(element, message, type) {
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

async function sendAnswer(scene, question, answer) {
  const response = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scene,
      question,
      answer,
      sent_at: new Date().toLocaleString("es")
    })
  });

  if (!response.ok) {
    const details = await response.text();
    let message = `No se pudo enviar la respuesta (${response.status}).`;
    try {
      const parsed = JSON.parse(details);
      if (parsed.error) {
        message = parsed.error;
      }
    } catch {
      if (details) {
        message = details;
      }
    }
    throw new Error(message);
  }
}

function setFormBusy(form, busy) {
  for (const button of form.querySelectorAll("button")) {
    button.disabled = busy;
  }
}

function updateJournalQuestion() {
  document.getElementById("journal-step").textContent =
    `Pregunta ${journalIndex + 1} de ${JOURNAL_QUESTIONS.length}`;
  document.getElementById("journal-question").textContent = JOURNAL_QUESTIONS[journalIndex];
  document.getElementById("journal-answer").value = "";
  setStatus(document.getElementById("journal-status"), "", "");
}

async function nextJournalQuestion() {
  if (isTransitioning) {
    return;
  }

  journalIndex += 1;
  if (journalIndex >= JOURNAL_QUESTIONS.length) {
    isTransitioning = true;
    const notebookScene = document.getElementById("scene-notebook");
    notebookScene.classList.add("is-leaving");
    bookTransition.classList.add("is-closing");
    try {
      await wait(650);
      showScene("scene-favorites", "sun");
    } finally {
      bookTransition.classList.remove("is-closing");
      notebookScene.classList.remove("is-leaving");
      isTransitioning = false;
    }
    return;
  }
  updateJournalQuestion();
}

async function transitionToNotebook() {
  if (isTransitioning) {
    return;
  }

  isTransitioning = true;
  const welcomeScene = document.getElementById("scene-welcome");
  welcomeScene.classList.add("is-leaving");
  try {
    curtainTransition.classList.add("is-closing");
    await wait(650);
    journalIndex = 0;
    updateJournalQuestion();
    showScene("scene-notebook", "sun");
    curtainTransition.classList.remove("is-closing");
    curtainTransition.classList.add("is-opening");
    await wait(650);
    curtainTransition.classList.remove("is-opening");
  } finally {
    welcomeScene.classList.remove("is-leaving");
    isTransitioning = false;
  }
}

continueButton.addEventListener("click", async () => {
  musicRequested = true;
  if (soundIsOn) {
    await startMusic();
  }
  await transitionToScene("scene-welcome", "sun");
});

document.getElementById("journal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const answerField = document.getElementById("journal-answer");
  const status = document.getElementById("journal-status");
  const answer = answerField.value.trim();

  if (!answer) {
    setStatus(status, "Escribe una respuesta o elige omitir esta pregunta.", "error");
    answerField.focus();
    return;
  }

  setFormBusy(form, true);
  setStatus(status, "Enviando tu respuesta...", "");
  try {
    await sendAnswer("Preguntas", JOURNAL_QUESTIONS[journalIndex], answer);
    setStatus(status, "Respuesta enviada. Gracias por compartirla.", "success");
    await wait(650);
    await nextJournalQuestion();
  } catch (error) {
    setStatus(status, error.message, "error");
  } finally {
    setFormBusy(form, false);
  }
});

document.getElementById("skip-journal").addEventListener("click", nextJournalQuestion);

document.getElementById("favorites-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("favorites-status");
  const entries = Array.from(new FormData(form).entries())
    .map(([label, value]) => [label, String(value).trim()])
    .filter(([, value]) => value);

  if (entries.length === 0) {
    setStatus(status, "Escribe al menos una respuesta u omite esta parte.", "error");
    return;
  }

  const answer = entries.map(([label, value]) => `${label}: ${value}`).join("\n");
  setFormBusy(form, true);
  setStatus(status, "Enviando tus respuestas...", "");
  try {
    await sendAnswer("Tus favoritos", "Respuestas favoritas", answer);
    setStatus(status, "Respuestas enviadas. Gracias, Lau.", "success");
    await wait(650);
    await transitionToScene("scene-invitation", "sun");
  } catch (error) {
    setStatus(status, error.message, "error");
  } finally {
    setFormBusy(form, false);
  }
});

document.getElementById("skip-favorites").addEventListener("click", async () => {
  await transitionToScene("scene-invitation", "sun");
});

const meetingDate = document.getElementById("meeting-date");
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
meetingDate.min = today.toISOString().slice(0, 10);

document.getElementById("date-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("date-status");
  const selectedDate = new Date(`${meetingDate.value}T12:00:00`);
  const answer = selectedDate.toLocaleDateString("es", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  setFormBusy(form, true);
  setStatus(status, "Enviando el día elegido...", "");
  try {
    await sendAnswer("Invitación", "Día elegido para salir", answer);
    setStatus(status, "Día enviado. Gracias por elegirlo.", "success");
    await wait(650);
    await transitionToScene("scene-share", "sun");
  } catch (error) {
    setStatus(status, error.message, "error");
  } finally {
    setFormBusy(form, false);
  }
});

document.getElementById("skip-date").addEventListener("click", async () => {
  await transitionToScene("scene-share", "sun");
});

function showMyAnswers() {
  const panel = document.getElementById("my-answers");
  const list = document.getElementById("my-answers-list");
  const note = document.getElementById("my-answers-note");
  const personalNote = document.getElementById("my-personal-note");
  list.replaceChildren();
  personalNote.replaceChildren();

  const completedAnswers = MY_ANSWERS.filter(([, value]) => value.trim());
  if (completedAnswers.length === 0) {
    setStatus(note, "Todavía no he añadido mis respuestas. Puedes completarlas en script.js.", "");
  } else {
    setStatus(note, "", "");
    for (const [label, value] of completedAnswers) {
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      list.append(term, description);
    }

    for (const paragraph of MY_PERSONAL_NOTE) {
      const text = document.createElement("p");
      text.textContent = paragraph;
      personalNote.append(text);
    }
  }

  panel.hidden = false;
}

document.getElementById("share-yes").addEventListener("click", showMyAnswers);
document.getElementById("share-no").addEventListener("click", async () => {
  await transitionToScene("scene-farewell", "sun");
});
document.getElementById("finish-button").addEventListener("click", async () => {
  await transitionToScene("scene-farewell", "sun");
});

for (const button of document.querySelectorAll("[data-go]")) {
  button.addEventListener("click", async () => {
    const destination = button.dataset.go;
    if (destination === "scene-notebook") {
      await transitionToNotebook();
      return;
    }
    await transitionToScene(destination, destination === "scene-intro" ? "rain" : "sun");
    if (destination === "scene-intro") {
      typedLine.textContent = "";
      continueButton.hidden = true;
      playIntroduction();
    }
  });
}

function createNoise() {
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * 0.35;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const volume = audioContext.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = currentTheme === "rain" ? 900 : 450;
  volume.gain.value = currentTheme === "rain" ? 0.65 : 0.045;
  source.connect(filter);
  filter.connect(volume);
  volume.connect(ambientGain);
  source.start();
  noiseSource = source;
}

function stopAmbient() {
  if (noiseSource) {
    noiseSource.stop();
    noiseSource = null;
  }
  window.clearTimeout(birdTimer);
}

async function startMusic() {
  if (!soundIsOn || !musicRequested) {
    return false;
  }

  if (!MUSIC_SOURCE) {
    soundStatus.textContent = "Añade una pista que tengas permiso de compartir para activar la música.";
    soundStatus.hidden = false;
    return false;
  }

  if (backgroundMusic.getAttribute("src") !== MUSIC_SOURCE) {
    backgroundMusic.src = MUSIC_SOURCE;
  }
  backgroundMusic.loop = true;
  stopAmbient();

  try {
    if (backgroundMusic.paused) {
      await backgroundMusic.play();
    }
    soundStatus.hidden = true;
    return true;
  } catch (error) {
    soundStatus.textContent = window.location.protocol === "file:"
      ? "No se pudo reproducir desde esta forma de abrir la página. Iníciala con Live Server y vuelve a intentarlo."
      : `No se pudo reproducir la música: ${error instanceof Error ? error.message : String(error)}`;
    soundStatus.hidden = false;
    return false;
  }
}

function chirp() {
  if (!soundIsOn || currentTheme !== "sun" || !audioContext) {
    return;
  }

  const start = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1700 + Math.random() * 450, start);
  oscillator.frequency.exponentialRampToValueAtTime(2600, start + 0.12);
  oscillator.frequency.exponentialRampToValueAtTime(1500, start + 0.32);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(0.045, start + 0.04);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
  oscillator.connect(volume);
  volume.connect(ambientGain);
  oscillator.start(start);
  oscillator.stop(start + 0.36);
  birdTimer = window.setTimeout(chirp, 1700 + Math.random() * 2200);
}

function startAmbient(theme) {
  if (!audioContext || !soundIsOn) {
    return;
  }

  stopAmbient();
  createNoise();
  if (theme === "sun") {
    birdTimer = window.setTimeout(chirp, 500);
  }
}

soundToggle.addEventListener("click", async () => {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor && !(musicRequested && MUSIC_SOURCE)) {
    soundToggle.textContent = "Sonido no disponible";
    soundStatus.textContent = "Este navegador no permite reproducir los sonidos del ambiente.";
    soundStatus.hidden = false;
    return;
  }

  if (AudioContextConstructor && !audioContext) {
    audioContext = new AudioContextConstructor();
    ambientGain = audioContext.createGain();
    ambientGain.gain.value = 0.6;
    ambientGain.connect(audioContext.destination);
  }

  if (audioContext && audioContext.state === "suspended") {
    await audioContext.resume();
  }

  soundIsOn = !soundIsOn;
  soundToggle.setAttribute("aria-pressed", String(soundIsOn));
  soundToggle.textContent = soundIsOn ? "♫ Silenciar sonidos" : "♫ Activar sonidos";

  if (soundIsOn) {
    if (musicRequested) {
      const musicStarted = await startMusic();
      if (!musicStarted) {
        startAmbient(currentTheme);
      }
    } else {
      soundStatus.hidden = true;
      startAmbient(currentTheme);
    }
  } else {
    backgroundMusic.pause();
    stopAmbient();
    soundStatus.hidden = true;
  }
});

playIntroduction();

<script setup lang="ts">
interface Person {
  name: string
  descriptors: number[][]
  thumb: string
  createdAt: string
}

interface FaceInfo {
  confidence: number
  age: number
  gender: string
  genderProb: number
  expression: string
  name: string
  similarity: number
}

interface LogEntry {
  name: string
  time: string
}

interface Snapshot {
  id: number
  src: string
  time: string
}

const EMOJI: Record<string, string> = {
  neutral: '😐',
  happy: '😄',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😲',
}

const MODEL_URL =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

// Current authenticated account
const authUser = useAuthUser()

// Generate separate storage keys for each account
function getAccountStorageKey(key: string): string | null {
  const email = authUser.value?.email?.trim().toLowerCase()

  if (!email) return null

  return `${key}_${encodeURIComponent(email)}`
}

const REGISTRY_KEY = 'face_registry'
const LOG_KEY = 'face_log'
const SNAPSHOT_KEY = 'face_snapshots'

// Camera
const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

// Application state
const libLoaded = ref(false)
const modelsReady = ref(false)
const loadingModels = ref(true)
const running = ref(false)
const showLandmarks = ref(true)

const message = ref('Loading face-api library...')
const error = ref('')

const faces = ref<FaceInfo[]>([])
const fps = ref(0)

const newName = ref('')

// Saved data
const people = ref<Person[]>([])
const log = ref<LogEntry[]>([])
const snapshots = ref<Snapshot[]>([])

// Face recognition variables
let faceapi: any = null
let stream: MediaStream | null = null
let loopTimer: ReturnType<typeof setTimeout> | null = null
let matcher: any = null
let lastResults: any[] = []

const lastSeen: Record<string, number> = {}

/* ---------- Saved data ---------- */

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : fallback
  } catch (e) {
    console.error(`Could not read ${key}:`, e)
    return fallback
  }
}

function loadSaved() {
  const registryKey = getAccountStorageKey(REGISTRY_KEY)
  const logKey = getAccountStorageKey(LOG_KEY)
  const snapshotKey = getAccountStorageKey(SNAPSHOT_KEY)

  if (!registryKey || !logKey || !snapshotKey) {
    people.value = []
    log.value = []
    snapshots.value = []

    error.value = 'Please sign in to access your saved face data.'
    return
  }

  people.value = readStorage<Person[]>(registryKey, [])
  log.value = readStorage<LogEntry[]>(logKey, [])
  snapshots.value = readStorage<Snapshot[]>(snapshotKey, [])
}

function persist(): boolean {
  const registryKey = getAccountStorageKey(REGISTRY_KEY)
  const logKey = getAccountStorageKey(LOG_KEY)

  if (!registryKey || !logKey) {
    error.value = 'No authenticated account found.'
    return false
  }

  try {
    localStorage.setItem(
      registryKey,
      JSON.stringify(people.value)
    )

    localStorage.setItem(
      logKey,
      JSON.stringify(log.value)
    )

    return true
  } catch (e) {
    console.error('Error saving data:', e)
    error.value = 'Could not save data. Browser storage may be full.'
    return false
  }
}

function saveSnapshots(): boolean {
  const snapshotKey = getAccountStorageKey('face_snapshots')

  if (!snapshotKey) return false

  try {
    localStorage.setItem(
      snapshotKey,
      JSON.stringify(snapshots.value)
    )

    return true
  } catch (error) {
    console.error('Error saving snapshots:', error)
    return false
  }
}

/* ---------- Face matcher ---------- */

function rebuildMatcher() {
  if (!faceapi || !people.value.length) {
    matcher = null
    return
  }

  const labeled = people.value.map(
    (p) =>
      new faceapi.LabeledFaceDescriptors(
        p.name,
        p.descriptors.map(
          (d) => new Float32Array(d)
        )
      )
  )

  matcher = new faceapi.FaceMatcher(labeled, 0.5)
}

/* ---------- Library and models ---------- */

async function loadLibrary() {
  error.value = ''
  loadingModels.value = true

  try {
    if (!faceapi) {
      faceapi = await import('@vladmandic/face-api')
    }

    libLoaded.value = true
    message.value = 'Loading models...'

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    ])

    modelsReady.value = true

    rebuildMatcher()

    message.value = 'Ready. Click "Start camera".'
  } catch (e) {
    console.error('Model loading error:', e)

    modelsReady.value = false
    message.value = 'Library failed to load.'

    error.value =
      'Could not load the face-api library or its models. Check your internet connection and press Retry.'
  } finally {
    loadingModels.value = false
  }
}

onMounted(() => {
  loadSaved()
  loadLibrary()
})

/* ---------- Camera ---------- */

function cameraErrorMessage(e: unknown) {
  switch ((e as DOMException)?.name) {
    case 'NotAllowedError':
      return 'Camera permission was denied. Allow camera access in your browser settings.'

    case 'NotFoundError':
      return 'No camera was found on this device.'

    case 'NotReadableError':
      return 'The camera is being used by another app or tab.'

    case 'OverconstrainedError':
      return 'The camera does not support the requested settings.'

    default:
      return (
        'Could not start the camera: ' +
        ((e as Error)?.message || 'unknown error')
      )
  }
}

async function startCamera() {
  error.value = ''

  if (!modelsReady.value) {
    error.value = 'Please wait until the models finish loading.'
    return
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    error.value =
      'This browser cannot access the camera. Use localhost or HTTPS.'
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: 'user',
      },
      audio: false,
    })

    const video = videoEl.value

    if (!video) {
      throw new Error('Video element is unavailable.')
    }

    video.srcObject = stream

    await video.play()

    running.value = true
    message.value = 'Looking for faces...'

    loop()
  } catch (e) {
    error.value = cameraErrorMessage(e)
    stopCamera()
  }
}

function stopCamera() {
  running.value = false

  if (loopTimer) {
    clearTimeout(loopTimer)
    loopTimer = null
  }

  stream?.getTracks().forEach((track) => track.stop())
  stream = null

  if (videoEl.value) {
    videoEl.value.srcObject = null
  }

  const canvas = canvasEl.value

  canvas?.getContext('2d')?.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  )

  faces.value = []
  lastResults = []
  fps.value = 0

  message.value =
    'Camera stopped. Click "Start camera" to try again.'
}

onBeforeUnmount(() => {
  stopCamera()
})

/* ---------- Recognition log ---------- */

function addToLog(name: string) {
  const now = Date.now()

  // Log each person once every 10 seconds.
  if (now - (lastSeen[name] || 0) < 10000) {
    return
  }

  lastSeen[name] = now

  log.value = [
    {
      name,
      time: new Date().toISOString(),
    },
    ...log.value,
  ].slice(0, 30)

  persist()
}

/* ---------- Detection and recognition ---------- */

async function detect() {
  const video = videoEl.value
  const canvas = canvasEl.value

  if (!video || !canvas || video.paused || video.ended) {
    return
  }

  const results = await faceapi
    .detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5,
      })
    )
    .withFaceLandmarks()
    .withFaceExpressions()
    .withAgeAndGender()
    .withFaceDescriptors()

  lastResults = results

  const size = {
    width: video.videoWidth,
    height: video.videoHeight,
  }

  faceapi.matchDimensions(canvas, size)

  const resized = faceapi.resizeResults(results, size)

  const ctx = canvas.getContext('2d')

  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const infos: FaceInfo[] = []

  resized.forEach((r: any, i: number) => {
    const raw = results[i]

    const match = matcher
      ? matcher.findBestMatch(raw.descriptor)
      : null

    const known = match && match.label !== 'unknown'

    const name = known ? match.label : 'Unknown'

    new faceapi.draw.DrawBox(r.detection.box, {
      label: known ? name : 'Unknown',
      boxColor: known ? '#16a34a' : '#f59e0b',
    }).draw(canvas)

    if (showLandmarks.value) {
      faceapi.draw.drawFaceLandmarks(canvas, r)
    }

    const top = Object.entries(raw.expressions).sort(
      (a: any, b: any) => b[1] - a[1]
    )[0]

    infos.push({
      confidence: Math.round(raw.detection.score * 100),
      age: Math.round(raw.age),
      gender: raw.gender,
      genderProb: Math.round(raw.genderProbability * 100),
      expression: top?.[0] ?? 'neutral',
      name,
      similarity: match
        ? Math.round((1 - match.distance) * 100)
        : 0,
    })

    if (known) {
      addToLog(name)
    }
  })

  faces.value = infos

  const knownFaces = infos.filter(
    (f) => f.name !== 'Unknown'
  )

  message.value = knownFaces.length
    ? `Hello, ${knownFaces.map((f) => f.name).join(' & ')}!`
    : infos.length
      ? 'Face detected! (Not registered yet)'
      : 'No face detected. Look at the camera.'
}

async function loop() {
  if (!running.value) return

  const start = performance.now()

  try {
    await detect()
  } catch (e) {
    console.error('Detection error:', e)

    error.value =
      'Face detection failed while running. The camera was stopped.'

    stopCamera()
    return
  }

  if (!running.value) return

  fps.value = Math.round(
    1000 / Math.max(performance.now() - start, 1)
  )

  loopTimer = setTimeout(loop, 100)
}

/* ---------- Register faces ---------- */

function makeThumb(
  box: {
    x: number
    y: number
    width: number
    height: number
  }
) {
  const video = videoEl.value!

  const canvas = document.createElement('canvas')

  canvas.width = 80
  canvas.height = 80

  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.drawImage(
      video,
      Math.max(0, box.x),
      Math.max(0, box.y),
      box.width,
      box.height,
      0,
      0,
      80,
      80
    )
  }

  return canvas.toDataURL('image/jpeg', 0.7)
}

function registerFace() {
  error.value = ''

  const name = newName.value.trim()

  if (!name) {
    error.value = 'Type a name first.'
    return
  }

  if (!running.value) {
    error.value = 'Start the camera first.'
    return
  }

  if (lastResults.length === 0) {
    error.value = 'No face detected. Look at the camera and try again.'
    return
  }

  if (lastResults.length > 1) {
    error.value =
      'More than one face is visible. Only one person should be in view when registering.'
    return
  }

  const result = lastResults[0]

  const descriptor = Array.from(
    result.descriptor as Float32Array
  )

  const existing = people.value.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  )

  if (existing) {
    existing.descriptors.push(descriptor)
  } else {
    people.value.push({
      name,
      descriptors: [descriptor],
      thumb: makeThumb(result.detection.box),
      createdAt: new Date().toISOString(),
    })
  }

  if (!persist()) return

  rebuildMatcher()

  newName.value = ''

  message.value =
    `Registered "${name}". Look at the camera to be recognized.`
}

function removePerson(name: string) {
  const previous = people.value

  people.value = people.value.filter(
    (p) => p.name !== name
  )

  if (!persist()) {
    people.value = previous
    return
  }

  rebuildMatcher()
}

function clearLog() {
  const previous = log.value

  log.value = []

  if (!persist()) {
    log.value = previous
  }
}

/* ---------- Export data ---------- */

function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),

    people: people.value.map((p) => ({
      name: p.name,
      samples: p.descriptors.length,
      registeredAt: p.createdAt,
    })),

    recognitionLog: log.value,
  }

  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    )
  )

  const a = document.createElement('a')

  a.href = url
  a.download = 'face-data.json'
  a.click()

  URL.revokeObjectURL(url)
}

/* ---------- Date formatting ---------- */

const fmt = (iso: string) =>
  new Date(iso).toLocaleString()

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString()

/* ---------- Snapshots ---------- */

function takeSnapshot() {
  error.value = ''

  const video = videoEl.value
  const overlay = canvasEl.value

  if (!video || !overlay || !running.value) {
    error.value = 'Start the camera before taking a snapshot.'
    return
  }

  if (!video.videoWidth || !video.videoHeight) {
    error.value = 'Camera is not ready yet. Please try again.'
    return
  }

  const output = document.createElement('canvas')

  output.width = video.videoWidth
  output.height = video.videoHeight

  const ctx = output.getContext('2d')

  if (!ctx) {
    error.value = 'Could not capture the image.'
    return
  }

  ctx.drawImage(video, 0, 0)
  ctx.drawImage(overlay, 0, 0)

  const snapshot: Snapshot = {
    id: Date.now(),
    src: output.toDataURL('image/jpeg', 0.82),
    time: new Date().toISOString(),
  }

  snapshots.value.unshift(snapshot)

  if (!saveSnapshots()) {
    snapshots.value.shift()
    return
  }

  message.value = 'Snapshot captured and saved successfully!'
}

function removeSnapshot(id: number) {
  const previous = snapshots.value

  snapshots.value = snapshots.value.filter(
    (snapshot) => snapshot.id !== id
  )

  if (!saveSnapshots()) {
    snapshots.value = previous
  }
}

function clearSnapshots() {
  if (!snapshots.value.length) return

  const confirmed = window.confirm(
    'Are you sure you want to delete all snapshots?'
  )

  if (!confirmed) return

  const previous = snapshots.value

  snapshots.value = []

  if (!saveSnapshots()) {
    snapshots.value = previous
    return
  }

  message.value = 'All snapshots deleted.'
}
</script>

<template>
  <div class="layout">

    <!-- Main content -->
    <div class="wrap">

      <h1>Face Recognition</h1>

      <p class="sub">
        Powered by the
        <code>@vladmandic/face-api</code>
        library, running in your browser.
      </p>

      <!-- Status chips -->
      <div class="chips">

        <span class="chip" :class="{ on: libLoaded }">
          Library {{ libLoaded ? 'loaded' : 'not loaded' }}
        </span>

        <span class="chip" :class="{ on: modelsReady }">
          Models {{ modelsReady ? 'ready' : 'not ready' }}
        </span>

        <span class="chip" :class="{ on: running }">
          Camera {{ running ? 'on' : 'off' }}
        </span>

        <span class="chip" :class="{ on: people.length > 0 }">
          {{ people.length }} registered
        </span>

        <span v-if="running" class="chip on">
          {{ fps }} FPS
        </span>

      </div>

      <!-- Error message -->
      <div v-if="error" class="alert" role="alert">

        <span>⚠️ {{ error }}</span>

        <button
          v-if="!modelsReady"
          :disabled="loadingModels"
          @click="loadLibrary"
        >
          Retry
        </button>

      </div>

      <!-- Camera -->
      <div class="stage">

        <video
          ref="videoEl"
          muted
          playsinline
        />

        <canvas ref="canvasEl" />

        <div v-if="!running" class="placeholder">
          {{ loadingModels ? 'Loading...' : 'Camera is off' }}
        </div>

      </div>

      <!-- Camera controls -->
      <div class="controls">

        <button
          class="primary"
          :disabled="!modelsReady || running"
          @click="startCamera"
        >
          Start camera
        </button>

        <button
          :disabled="!running"
          @click="stopCamera"
        >
          Stop
        </button>

        <button
          :disabled="!running"
          @click="takeSnapshot"
        >
          📸 Snapshot
        </button>

        <label class="toggle">
          <input
            v-model="showLandmarks"
            type="checkbox"
          >
          Show landmarks
        </label>

      </div>

      <p class="status" :class="{ ok: faces.length }">
        {{ message }}
      </p>

      <!-- Register face -->
      <section class="panel">

        <h2>Register a face</h2>

        <p class="hint">
          Start the camera, make sure only one person is in view,
          type a name and click Register. Register the same name
          again to add more samples.
        </p>

        <div class="row">

          <input
            v-model="newName"
            type="text"
            placeholder="Enter name"
            maxlength="40"
            @keyup.enter="registerFace"
          >

          <button
            class="primary"
            :disabled="!running"
            @click="registerFace"
          >
            Register face
          </button>

        </div>

      </section>

      <!-- Recognition results -->
      <section v-if="faces.length" class="panel">

        <h2>Results</h2>

        <div
          v-for="(f, i) in faces"
          :key="i"
          class="face"
        >

          <div class="emoji">
            {{ EMOJI[f.expression] || '🙂' }}
          </div>

          <div>

            <strong>
              {{
                f.name === 'Unknown'
                  ? `Face ${i + 1} (Unknown)`
                  : f.name
              }}
            </strong>

            <ul>

              <li v-if="f.name !== 'Unknown'">
                Match: <b>{{ f.similarity }}%</b>
              </li>

              <li>
                Detection confidence:
                <b>{{ f.confidence }}%</b>
              </li>

              <li>
                Estimated age:
                <b>~{{ f.age }} years</b>
              </li>

              <li>
                Gender:
                <b>{{ f.gender }}</b>
                ({{ f.genderProb }}%)
              </li>

              <li>
                Expression:
                <b>{{ f.expression }}</b>
              </li>

            </ul>

          </div>

        </div>

      </section>

      <!-- Registered people -->
      <section class="panel">

        <div class="head">

          <h2>
            Registered people ({{ people.length }})
          </h2>

          <button
            :disabled="!people.length && !log.length"
            @click="exportData"
          >
            Export data (JSON)
          </button>

        </div>

        <p v-if="!people.length" class="hint">
          No one registered yet.
        </p>

        <div
          v-for="p in people"
          :key="p.name"
          class="person"
        >

          <img
            :src="p.thumb"
            :alt="p.name"
          >

          <div class="info">

            <strong>{{ p.name }}</strong>

            <small>
              {{ p.descriptors.length }} sample(s)
              · registered {{ fmt(p.createdAt) }}
            </small>

          </div>

          <button @click="removePerson(p.name)">
            Delete
          </button>

        </div>

      </section>

      <!-- Privacy -->
      <p class="privacy">
        🔒 Face templates, thumbnails, snapshots and recognition
        logs are stored in this browser. They are not cloud-synced.
        Register only people who have agreed to participate.
      </p>

    </div>

    <!-- Right side -->
    <aside class="side-panel">

      <!-- Snapshots -->
      <section class="panel">

        <div class="head">

          <h2>
            Snapshots ({{ snapshots.length }})
          </h2>

          <button
            :disabled="!snapshots.length"
            @click="clearSnapshots"
          >
            Clear all
          </button>

        </div>

        <div v-if="!snapshots.length" class="empty">

          <span class="empty-icon">📸</span>

          <p>No snapshots yet.</p>

          <p>Start your camera and take a picture!</p>

        </div>

        <div v-else class="snaps">

          <figure
            v-for="(s, i) in snapshots"
            :key="s.id"
            class="slot"
          >

            <img
              :src="s.src"
              :alt="`Snapshot ${i + 1}`"
              class="snapimg"
            >

            <figcaption>

              <span>
                {{ i === 0 ? 'Latest · ' : '' }}
                {{ fmtTime(s.time) }}
              </span>

              <span class="acts">

                <a
                  :href="s.src"
                  :download="`face-snapshot-${s.id}.jpg`"
                  class="dl"
                >
                  Download
                </a>

                <button
                  class="mini"
                  title="Remove snapshot"
                  @click="removeSnapshot(s.id)"
                >
                  ✕
                </button>

              </span>

            </figcaption>

          </figure>

        </div>

        <p class="hint small">
          Your captured snapshots are saved in this browser.
          Visit the Snapshots page to view your complete gallery.
        </p>

        <NuxtLink
          to="/snapshots"
          class="gallery-link"
        >
          Open Full Gallery →
        </NuxtLink>

      </section>

      <!-- Recognition log -->
      <section class="panel">

        <div class="head">

          <h2>Recognition log</h2>

          <button
            :disabled="!log.length"
            @click="clearLog"
          >
            Clear log
          </button>

        </div>

        <p v-if="!log.length" class="hint">
          Recognized people will appear here with the time.
        </p>

        <ul v-else class="log">

          <li
            v-for="(l, i) in log"
            :key="i"
          >
            <b>{{ l.name }}</b>
            recognized · {{ fmt(l.time) }}
          </li>

        </ul>

      </section>

    </aside>

  </div>
</template>

<style scoped>
/* Main layout */

.layout {
  display: grid;
  grid-template-columns: minmax(0, 720px) minmax(300px, 1fr);
  gap: 24px;
  align-items: start;
}

.wrap {
  min-width: 0;
  color: #e8fff5;
}

.side-panel {
  position: sticky;
  top: 78px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
}

.side-panel .panel:first-child {
  margin-top: 0;
}

/* Headings */

h1 {
  margin: 0;
  color: #fff;
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #34e89e;
}

.sub {
  color: #86b9a3;
  margin: 4px 0 14px;
}

code {
  background: #0c2a1e;
  color: #86efac;
  padding: 1px 6px;
  border-radius: 6px;
}

.hint {
  color: #86b9a3;
  margin: 0 0 10px;
  line-height: 1.5;
}

/* Status chips */

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.chip {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  background: #14221b;
  color: #86b9a3;
  border: 1px solid #1f3a2d;
}

.chip.on {
  background: #064e3b;
  color: #6ee7b7;
  border-color: #0b8a52;
}

/* Error */

.alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #3b0d0d;
  color: #fca5a5;
  border: 1px solid #7f1d1d;
}

/* Camera stage */

.stage {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 4 / 3;
  background: #000;
  border: 1px solid #0b8a52;
  border-radius: 12px;
  overflow: hidden;
}

.stage video,
.stage canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #6b8f7e;
}

/* Buttons */

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 16px 0 8px;
}

button {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #0f7a4b;
  background: #0a2e20;
  color: #e8fff5;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #0f3d2a;
}

button.primary {
  background: #00a859;
  border-color: #00a859;
  color: #fff;
}

button.primary:hover:not(:disabled) {
  background: #00c26a;
}

button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 6px;
  cursor: pointer;
}

/* Status message */

.status {
  font-weight: 600;
}

.status.ok {
  color: #34e89e;
}

/* Panels */

.panel {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #0b8a52;
  border-radius: 12px;
  background: #06180f;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

/* Registration */

.row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

input[type='text'] {
  flex: 1;
  min-width: 180px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #0f7a4b;
  background: #04120d;
  color: #e8fff5;
}

input[type='text']::placeholder {
  color: #5f8574;
}

/* Recognition results */

.face {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 10px;
  background: #0a2016;
  border: 1px solid #0f3d2a;
}

.emoji {
  font-size: 40px;
}

.face ul {
  margin: 4px 0 0;
  padding-left: 18px;
  line-height: 1.6;
  color: #cfe9dd;
}

/* Registered people */

.person {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid #0f3d2a;
}

.person img {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
}

.info {
  display: grid;
  flex: 1;
  min-width: 0;
}

.info small {
  color: #86b9a3;
}

/* Snapshots */

.snaps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.slot {
  min-width: 0;
  margin: 0;
  display: grid;
  gap: 6px;
  align-content: start;
}

.slot .snapimg {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border: 1px solid #0b8a52;
  border-radius: 8px;
}

.slot figcaption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #86b9a3;
}

.acts {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dl {
  color: #34e89e;
  text-decoration: none;
}

.dl:hover {
  color: #6ee7b7;
  text-decoration: underline;
}

.mini {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.empty {
  display: grid;
  place-items: center;
  text-align: center;
  min-height: 180px;
  padding: 16px;
  border: 2px dashed #14543a;
  border-radius: 12px;
  color: #86b9a3;
  line-height: 1.8;
}

.empty p {
  margin: 0;
}

.empty-icon {
  font-size: 35px;
}

.small {
  font-size: 12px;
  margin: 10px 0 0;
}

.gallery-link {
  display: inline-block;
  margin-top: 14px;
  color: #34e89e;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.gallery-link:hover {
  color: #6ee7b7;
}

/* Recognition log */

.log {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
  color: #cfe9dd;
  max-height: 260px;
  overflow-y: auto;
}

/* Privacy */

.privacy {
  margin-top: 20px;
  font-size: 13px;
  color: #86b9a3;
  line-height: 1.5;
}

/* Links */

a {
  color: #34e89e;
}

/* Responsive */

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-panel {
    position: static;
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 500px) {
  .snaps {
    grid-template-columns: 1fr;
  }
}
</style>

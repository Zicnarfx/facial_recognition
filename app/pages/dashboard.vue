
<script setup lang="ts">
const user = useAuthUser()

if (!user.value) await navigateTo('/login')

const greeting = ref('Welcome')
const today = ref('')
const peopleCount = ref(0)
const logCount = ref(0)

const firstName = computed(() =>
  user.value?.name.split(' ')[0] ?? ''
)

onMounted(() => {
  const d = new Date()
  const h = d.getHours()

  greeting.value =
    h < 12 ? 'Good morning' :
    h < 18 ? 'Good afternoon' : 'Good evening'

  today.value = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  try {
    peopleCount.value = JSON.parse(
      localStorage.getItem('face_registry') || '[]'
    ).length

    logCount.value = JSON.parse(
      localStorage.getItem('face_log') || '[]'
    ).length
  } catch {
    /* ignore unreadable storage */
  }
})

const steps = [
  { n: 1, title: 'Capture', text: 'The camera captures a live image or video frame.' },
  { n: 2, title: 'Detect', text: 'The system finds where a face is located in the frame.' },
  { n: 3, title: 'Analyze', text: 'Key facial landmarks are mapped.' },
  { n: 4, title: 'Match', text: 'The face is compared with saved profiles.' },
]

const uses = [
  { icon: '📱', title: 'Device unlock', text: 'Unlock phones and laptops with your face.' },
  { icon: '🛂', title: 'Security & access', text: 'Control entry to buildings and offices.' },
  { icon: '🕒', title: 'Attendance', text: 'Record attendance in schools and workplaces.' },
  { icon: '🖼️', title: 'Photo organizing', text: 'Group photos by the people who appear in them.' },
]
</script>

<template>
  <div v-if="user" class="dash">

    <!-- Welcome Banner -->
    <section class="hero">
      <div class="hero-content">
        <p class="date">{{ today }}</p>
        <h1>{{ greeting }}, {{ firstName }}!</h1>
        <p class="lead">
          Welcome to Facial Recognition, your workspace for
          detecting and recognizing faces with your camera.
          Choose a tool below to get started.
        </p>

        <NuxtLink to="/face" class="hero-button">
          <AppIcon name="face" />
          Start Face Recognition
          <AppIcon name="arrow" />
        </NuxtLink>
      </div>

      <div class="hero-visual">
        <div class="face-circle">
          <AppIcon name="face" />
        </div>
        <span>AI FACE RECOGNITION</span>
      </div>
    </section>

    <!-- Statistics -->
    <section class="stats">
      <article class="stat-card">
        <div class="stat-icon">
          <AppIcon name="users" />
        </div>
        <div>
          <p>Registered Faces</p>
          <h2>{{ peopleCount }}</h2>
          <span>Saved profiles</span>
        </div>
      </article>

      <article class="stat-card">
        <div class="stat-icon">
          <AppIcon name="face" />
        </div>
        <div>
          <p>Recognition Logs</p>
          <h2>{{ logCount }}</h2>
          <span>Total recognitions</span>
        </div>
      </article>
    </section>

    <!-- Main Tools -->
    <section class="section">
      <div class="section-heading">
        <div>
          <span class="subtitle">GET STARTED</span>
          <h2>Your Tools</h2>
        </div>
        <span class="section-description">Manage your recognition system</span>
      </div>

      <div class="tools">
        <article class="tool-card recognition">
          <div class="tool-top">
            <div class="tool-icon">
              <AppIcon name="face" />
            </div>
            <span class="tool-tag">AI FEATURE</span>
          </div>

          <h3>Face Recognition</h3>
          <p>
            Start your camera, detect faces, and recognize
            registered individuals in real time.
          </p>

          <NuxtLink to="/face" class="link">
            Open Recognition
            <AppIcon name="arrow" />
          </NuxtLink>
        </article>

        <article class="tool-card saved">
          <div class="tool-top">
            <div class="tool-icon">
              <AppIcon name="users" />
            </div>
            <span class="tool-tag">DATABASE</span>
          </div>

          <h3>Saved Faces</h3>
          <p>
            Manage your registered face profiles and view
            your saved recognition information.
          </p>

          <div class="saved-count">
            <strong>{{ peopleCount }}</strong>
            <span>Registered {{ peopleCount === 1 ? 'person' : 'people' }}</span>
          </div>

          <NuxtLink to="/face" class="link">
            Manage Faces
            <AppIcon name="arrow" />
          </NuxtLink>
        </article>
      </div>
    </section>

    <!-- How It Works -->
    <section class="section">
      <div class="section-heading">
        <div>
          <span class="subtitle">PROCESS OVERVIEW</span>
          <h2>How It Works</h2>
        </div>
      </div>

      <div class="steps">
        <article
          v-for="s in steps"
          :key="s.n"
          class="step-card"
        >
          <div class="step-number">{{ s.n }}</div>
          <div>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Applications -->
    <section class="section">
      <div class="section-heading">
        <div>
          <span class="subtitle">REAL-WORLD APPLICATIONS</span>
          <h2>Where It Is Used</h2>
        </div>
      </div>

      <div class="uses">
        <article
          v-for="u in uses"
          :key="u.title"
          class="use-card"
        >
          <div class="use-icon">{{ u.icon }}</div>
          <h3>{{ u.title }}</h3>
          <p>{{ u.text }}</p>
        </article>
      </div>
    </section>

    <!-- Privacy Notice -->
    <div class="note">
      <AppIcon name="face" />
      <p>
        <strong>Privacy Notice:</strong>
        Age and gender are estimates and can be inaccurate.
        Facial recognition should always be used with people's
        consent and care for their privacy.
      </p>
    </div>

  </div>
</template>

<style scoped>
.dash {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 30px;
}

p {
  margin: 0;
  line-height: 1.6;
}

/* Welcome Banner */

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
  padding: 30px;
  border: 1px solid #19c37d;
  border-radius: 10px;
  background: linear-gradient(
    100deg,
    #04583a 0%,
    #02834d 55%,
    #00a859 100%
  );
  box-shadow: 0 0 22px rgba(0, 168, 90, .25);
}

.hero-content {
  max-width: 650px;
}

.date {
  font-size: 13px;
  color: #d1fae5;
  margin-bottom: 5px;
}

h1 {
  margin: 0 0 10px;
  font-size: 32px;
  color: #fff;
}

.lead {
  max-width: 540px;
  font-size: 14px;
  color: #ecfdf5;
}

.hero-button {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 20px;
  padding: 11px 17px;
  border-radius: 7px;
  background: #fff;
  color: #04583a;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: .25s;
}

.hero-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,.2);
}

.hero-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #d1fae5;
  font-size: 10px;
  letter-spacing: 2px;
}

.face-circle {
  width: 140px;
  height: 140px;
  display: grid;
  place-items: center;
  border: 2px solid rgba(236,253,245,.6);
  border-radius: 50%;
  background: rgba(255,255,255,.1);
  color: white;
  font-size: 80px;
  transition: .3s;
}

.face-circle:hover {
  transform: scale(1.07);
  background: rgba(255,255,255,.18);
}

/* Statistics */

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 22px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 20px;
  border: 1px solid #0b8a52;
  border-radius: 10px;
  background: #06180f;
  transition: .25s;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: #34e89e;
}

.stat-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid #0f7a4b;
  border-radius: 10px;
  background: #0a2e20;
  color: #34e89e;
  font-size: 25px;
}

.stat-card p {
  font-size: 13px;
  color: #cfe9dd;
}

.stat-card h2 {
  margin: 2px 0;
  color: #34e89e;
  font-size: 27px;
}

.stat-card span {
  font-size: 11px;
  color: #8eb6a0;
}

/* Sections */

.section {
  margin-top: 30px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.subtitle {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #34e89e;
}

.section-heading h2 {
  margin: 4px 0 0;
  font-size: 21px;
  color: #34e89e;
}

.section-description {
  color: #cfe9dd;
  font-size: 12px;
}

/* Tools */

.tools {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 17px;
}

.tool-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 225px;
  padding: 22px;
  border: 1px solid #0b8a52;
  border-radius: 10px;
  background: #06180f;
  transition: .25s;
}

.tool-card:hover {
  transform: translateY(-5px);
  border-color: #34e89e;
  box-shadow: 0 8px 20px rgba(0,168,90,.12);
}

.tool-top {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 17px;
}

.tool-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid #0f7a4b;
  border-radius: 10px;
  background: #0a2e20;
  color: #34e89e;
  font-size: 25px;
}

.tool-tag {
  padding: 5px 9px;
  border-radius: 20px;
  background: #0a2e20;
  color: #34e89e;
  font-size: 10px;
  font-weight: 700;
}

.tool-card h3 {
  margin: 0 0 7px;
  color: white;
  font-size: 17px;
}

.tool-card p {
  margin-bottom: 15px;
  font-size: 13px;
  color: #cfe9dd;
}

.saved-count {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 14px;
}

.saved-count strong {
  color: #34e89e;
  font-size: 24px;
}

.saved-count span {
  color: #cfe9dd;
  font-size: 12px;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  font-size: 13px;
  font-weight: 600;
  color: #34e89e;
  text-decoration: none;
}

.link:hover {
  gap: 12px;
}

/* Steps */

.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 13px;
}

.step-card {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 17px;
  border: 1px solid #0b8a52;
  border-radius: 10px;
  background: #06180f;
  transition: .25s;
}

.step-card:hover {
  transform: translateY(-4px);
  border-color: #34e89e;
}

.step-number {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid #0f7a4b;
  border-radius: 50%;
  background: #0a2e20;
  color: #34e89e;
  font-size: 16px;
  font-weight: 700;
}

.step-card h3 {
  margin: 0 0 6px;
  color: white;
  font-size: 14px;
}

.step-card p {
  font-size: 12px;
  color: #cfe9dd;
}

/* Applications */

.uses {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 13px;
}

.use-card {
  padding: 18px;
  border: 1px solid #0b8a52;
  border-radius: 10px;
  background: #06180f;
  transition: .25s;
}

.use-card:hover {
  transform: translateY(-4px);
  border-color: #34e89e;
  background: #0a2e20;
}

.use-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  margin-bottom: 13px;
  border: 1px solid #0f7a4b;
  border-radius: 50%;
  background: #0a2e20;
  font-size: 20px;
}

.use-card h3 {
  margin: 0 0 7px;
  color: white;
  font-size: 14px;
}

.use-card p {
  font-size: 12px;
  color: #cfe9dd;
}

/* Privacy */

.note {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  padding: 14px 17px;
  border: 1px solid #854d0e;
  border-radius: 10px;
  background: rgba(250, 204, 21, .07);
  color: #fde68a;
  font-size: 13px;
}

.note :deep(svg) {
  flex-shrink: 0;
  font-size: 23px;
}

/* Responsive */

@media (max-width: 860px) {
  .steps,
  .uses {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 22px;
  }

  .hero-visual {
    display: none;
  }

  h1 {
    font-size: 26px;
  }

  .stats,
  .tools,
  .steps,
  .uses {
    grid-template-columns: 1fr;
  }

  .section-description {
    display: none;
  }

  .stat-card {
    padding: 16px;
  }
}
</style>

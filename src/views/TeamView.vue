<template>
  <AppShell>
    <div class="team-page container-fluid">
      <div class="team-shell">
        <header class="hero-card">
          <div class="hero-copy">
            <span class="eyebrow">r/teamnotes</span>
            <h1>A modern web project collaboration. Built like a Reddit thread, owned like a product team.</h1>
          </div>
          <div class="hero-meta row g-3">
            <div class="col-6 col-md-3" v-for="stat in heroStats" :key="stat.label">
              <div class="hero-stat">
                <strong>{{ stat.value }}</strong>
                <span>{{ stat.label }}</span>
              </div>
            </div>
          </div>
        </header>

        <section class="content-grid row g-4">
          <div class="col-12 col-xl-8">
            <section class="team-card">
              <div class="section-head">
                <div>
                  <span class="section-kicker">Contributors</span>
                  <h2>Team roster</h2>
                </div>
                <p>Tap a portrait to jump to that member’s profile route.</p>
              </div>

              <div class="row g-3">
                <div v-for="member in members" :key="member.username" class="col-12 col-md-6">
                  <article class="member-card">
                    <router-link :to="`/profile/${member.username}`" class="portrait-link" :aria-label="`Open ${member.displayName} profile`">
                      <div class="portrait" :style="{ '--accent': member.accentColor }">
                        <span>{{ member.initials }}</span>
                      </div>
                    </router-link>

                    <div class="member-copy">
                      <div class="member-title">
                        <div>
                          <h3>{{ member.displayName }}</h3>
                          <p>u/{{ member.username }}</p>
                        </div>
                        <span class="student-id">{{ member.studentId }}</span>
                      </div>

                      <p class="member-bio">{{ member.bio }}</p>

                      <div class="ownership">
                        <span v-for="area in member.ownership" :key="area">{{ area }}</span>
                      </div>

                      <router-link :to="`/profile/${member.username}`" class="profile-link">
                        Open profile
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                      </router-link>
                    </div>
                  </article>
                </div>
              </div>
            </section>
          </div>

          <div class="col-12 col-xl-4">
            <section class="team-card team-card--rail">
              <div class="section-head">
                <div>
                  <span class="section-kicker">Ownership Map</span>
                  <h2>Page coverage</h2>
                </div>
              </div>

              <div class="coverage-list">
                <article v-for="member in members" :key="`${member.username}-coverage`" class="coverage-item">
                  <router-link :to="`/profile/${member.username}`" class="coverage-head">
                    <div class="coverage-avatar" :style="{ '--accent': member.accentColor }">{{ member.initials }}</div>
                    <div>
                      <strong>{{ member.displayName }}</strong>
                      <span>{{ member.studentId }}</span>
                    </div>
                  </router-link>
                  <ul>
                    <li v-for="area in member.ownership" :key="`${member.username}-${area}`">{{ area }}</li>
                  </ul>
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  </AppShell>
</template>

<script setup>
import AppShell from '../components/AppShell.vue'
import { teamMembers as members } from '../data/teamProfiles.js'

const heroStats = [
  { label: 'Contributors', value: String(members.length) },
  { label: 'Pages Owned', value: String(members.reduce((total, member) => total + member.ownership.length, 0)) },
  { label: 'Realtime Owners', value: '1' },
  { label: 'Profile Routes', value: '5' },
]
</script>

<style scoped>
.team-page { padding: 22px 16px 56px; }
.team-shell { width: min(1160px, 100%); margin: 0 auto; display: grid; gap: 20px; }
.hero-card,
.team-card {
  border: 1px solid rgba(16, 24, 40, 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 69, 0, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 247, 248, 0.98));
}
.hero-card { padding: 28px; display: grid; gap: 24px; }
.eyebrow,
.section-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--reddit-orange);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hero-copy h1 {
  max-width: 760px;
  margin: 0;
  font-size: clamp(2rem, 3vw, 3.4rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
}
.hero-stat {
  height: 100%;
  padding: 16px;
  border: 1px solid rgba(16, 24, 40, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}
.hero-stat strong {
  display: block;
  margin-bottom: 4px;
  font-size: 1.5rem;
  line-height: 1;
}
.hero-stat span {
  color: var(--reddit-text-meta);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.team-card { padding: 22px; }
.team-card--rail { height: 100%; }
.section-head {
  margin-bottom: 18px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.section-head h2 {
  margin: 0;
  font-size: 1.45rem;
  letter-spacing: -0.03em;
}
.section-head p {
  margin: 0;
  color: var(--reddit-text-meta);
  font-size: 13px;
}
.member-card {
  height: 100%;
  padding: 22px;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 20px;
  border: 1px solid rgba(16, 24, 40, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.84);
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}
.member-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 69, 0, 0.25);
  background: rgba(255, 255, 255, 0.98);
}
.portrait-link {
  text-decoration: none;
  align-self: start;
}
.portrait {
  width: 88px;
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  border-radius: 22px;
  border: 1px solid rgba(16, 24, 40, 0.08);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, white), color-mix(in srgb, var(--accent) 65%, white 35%)),
    rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
.portrait span {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}
.member-copy {
  min-width: 0;
  padding-right: 4px;
}
.member-title {
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}
.member-title h3 {
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.1;
}
.member-title p {
  margin: 2px 0 0;
  color: var(--reddit-text-meta);
  font-size: 12px;
}
.student-id {
  align-self: start;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--reddit-surface-inset);
  color: var(--reddit-text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
}
.member-bio {
  margin: 0 0 14px;
  color: var(--reddit-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.ownership {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ownership span {
  padding: 7px 10px;
  border: 1px solid rgba(16, 24, 40, 0.08);
  border-radius: 999px;
  background: rgba(246, 247, 248, 0.9);
  color: var(--reddit-text);
  font-size: 12px;
  font-weight: 600;
}
.profile-link,
.coverage-head {
  text-decoration: none;
}
.profile-link {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--reddit-blue);
  font-size: 13px;
  font-weight: 700;
}
.coverage-list {
  display: grid;
  gap: 12px;
}
.coverage-item {
  padding: 14px;
  border: 1px solid rgba(16, 24, 40, 0.07);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}
.coverage-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: inherit;
}
.coverage-avatar {
  width: 52px;
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 80%, white 20%);
  color: white;
  font-weight: 800;
}
.coverage-head strong,
.coverage-head span {
  display: block;
}
.coverage-head span {
  color: var(--reddit-text-meta);
  font-size: 12px;
}
.coverage-item ul {
  margin: 0;
  padding-left: 18px;
  color: var(--reddit-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}
@media (max-width: 767px) {
  .team-page { padding-inline: 10px; }
  .hero-card,
  .team-card { padding: 18px; border-radius: 20px; }
  .member-card { grid-template-columns: 1fr; }
  .member-title { grid-template-columns: 1fr; }
  .portrait { width: 72px; border-radius: 18px; }
}
</style>

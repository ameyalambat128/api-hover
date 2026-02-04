import styles from "./page.module.css"

const links = {
  chrome: "https://example.com/chrome",
  github: "https://github.com/ameyalambat128/api-hover",
  twitter: "https://x.com/placeholder",
  email: "mailto:hello@example.com"
}

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.noise} aria-hidden="true" />

      <header className={styles.nav}>
        <div className={styles.wordmark}>API Hover</div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#flow">Flow</a>
          <a href="#demo">Demo</a>
        </div>
        <a className={styles.navCta} href={links.chrome}>
          Get the extension
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.pill}>Private beta</span>
            <h1>See the API calls behind every click.</h1>
            <p>
              API Hover links UI interactions to network calls in real time.
              Hover any element and get a precise, contextual trace of what fired,
              when, and how long it took.
            </p>
            <div className={styles.ctaRow}>
              <a className={styles.primaryCta} href={links.chrome}>
                Get the extension
              </a>
              <a className={styles.secondaryCta} href={links.github}>
                View on GitHub
              </a>
            </div>
            <div className={styles.heroMeta}>
              <div>
                <span>Capture</span>
                <strong>fetch + XHR</strong>
              </div>
              <div>
                <span>Correlate</span>
                <strong>click, submit, enter</strong>
              </div>
              <div>
                <span>Persist</span>
                <strong>session-only</strong>
              </div>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.visualFrame}>
              <div className={styles.visualHeader}>
                <span>API Hover</span>
                <span className={styles.visualStatus}>live</span>
              </div>
              <div className={styles.visualTarget}>
                <div className={styles.targetLabel}>Hovered element</div>
                <div className={styles.targetTitle}>"Issues" tab</div>
                <div className={styles.targetMeta}>aria-label=Issues</div>
              </div>
              <div className={styles.visualRequests}>
                <div className={styles.requestRow}>
                  <span className={styles.method}>GET</span>
                  <span className={styles.url}>/repos/.../issues</span>
                  <span className={styles.status}>200 · 214ms</span>
                </div>
                <div className={styles.requestRow}>
                  <span className={styles.method}>POST</span>
                  <span className={styles.url}>/graphql</span>
                  <span className={styles.status}>200 · 96ms</span>
                </div>
                <div className={styles.requestRow}>
                  <span className={styles.method}>GET</span>
                  <span className={styles.url}>/notifications</span>
                  <span className={styles.status}>304 · 41ms</span>
                </div>
              </div>
            </div>
            <div className={styles.glow} aria-hidden="true" />
          </div>
        </section>

        <section id="features" className={styles.features}>
          <div className={styles.sectionHeader}>
            <span>Features</span>
            <h2>Stay in the flow while the network explains itself.</h2>
          </div>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <h3>Hover-first visibility</h3>
              <p>
                Tooltips surface the last calls tied to the element you care
                about. No panels. No hunting.
              </p>
            </div>
            <div className={styles.featureCard}>
              <h3>Interaction correlation</h3>
              <p>
                Clicks, submits, and Enter key actions are matched to requests
                within a tight window for accurate context.
              </p>
            </div>
            <div className={styles.featureCard}>
              <h3>Session-only memory</h3>
              <p>
                Everything stays in session. Refresh when you want a clean slate.
                No persistence.
              </p>
            </div>
          </div>
        </section>

        <section id="flow" className={styles.flow}>
          <div className={styles.sectionHeader}>
            <span>How it works</span>
            <h2>Interact. Capture. Hover.</h2>
          </div>
          <div className={styles.flowSteps}>
            <div>
              <div className={styles.stepIndex}>01</div>
              <h3>Interact</h3>
              <p>Click, submit, or press Enter to mark intent.</p>
            </div>
            <div>
              <div className={styles.stepIndex}>02</div>
              <h3>Capture</h3>
              <p>Fetch/XHR wrappers emit request events in real time.</p>
            </div>
            <div>
              <div className={styles.stepIndex}>03</div>
              <h3>Hover</h3>
              <p>See the linked calls instantly in a minimal tooltip.</p>
            </div>
          </div>
        </section>

        <section id="demo" className={styles.demo}>
          <div className={styles.sectionHeader}>
            <span>Example</span>
            <h2>Minimal UI. Maximum signal.</h2>
          </div>
          <div className={styles.demoGrid}>
            <div className={styles.demoCopy}>
              <p>
                API Hover is designed for fast context. It stays out of the way
                until you need it, then appears precisely where you look.
              </p>
              <div className={styles.demoList}>
                <div>
                  <span>Inspect mode</span>
                  <strong>Toggle per tab</strong>
                </div>
                <div>
                  <span>Link window</span>
                  <strong>Adjustable in popup</strong>
                </div>
                <div>
                  <span>History</span>
                  <strong>Clear in one click</strong>
                </div>
              </div>
            </div>
            <div className={styles.demoPanel}>
              <div className={styles.demoHeader}>Hovered element</div>
              <div className={styles.demoMeta}>button · data-testid=save</div>
              <div className={styles.demoRows}>
                <div>
                  <span>POST</span>
                  <span>/api/save</span>
                  <span>201 · 132ms</span>
                </div>
                <div>
                  <span>GET</span>
                  <span>/api/changes</span>
                  <span>200 · 42ms</span>
                </div>
              </div>
              <div className={styles.demoEmpty}>No recorded calls yet.</div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>API Hover</div>
        <div className={styles.footerLinks}>
          <a href={links.github}>GitHub</a>
          <a href={links.twitter}>X / Twitter</a>
          <a href={links.email}>Email</a>
        </div>
      </footer>
    </div>
  )
}

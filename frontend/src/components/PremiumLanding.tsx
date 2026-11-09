import { Link } from "react-router-dom";
import MeadowRiseFooter from "./ui/meadow-rise-footer";
import "./premium-landing.css";

const features = [
  ["01", "Artifact Registration", "Create a SHA-256 fingerprint for an uploaded dataset or model artifact."],
  ["02", "Integrity Verification", "Recompute the fingerprint of a supplied file and compare it with registered evidence."],
  ["03", "Blockchain-Anchored Evidence", "Anchor compact fingerprint evidence on Ethereum Sepolia; raw files remain off-chain."],
  ["04", "Provenance Lineage", "Visualize the relationships between datasets, preparation, training runs, and model versions."],
  ["05", "AI Integrity Analysis", "Run configured, deterministic consistency and provenance checks against recorded evidence."],
] as const;

const steps = [
  ["01", "Register an artifact", "Upload a dataset or model artifact and generate its SHA-256 fingerprint."],
  ["02", "Anchor evidence", "Register the fingerprint and relevant registration evidence on Ethereum Sepolia."],
  ["03", "Trace provenance", "Explore recorded dataset, preprocessing, training, and model relationships."],
  ["04", "Verify integrity", "Recompute a supplied file’s fingerprint and compare it with registered evidence."],
] as const;

export default function PremiumLanding() {
  return (
    <main className="premium-landing" id="home">
      <header className="premium-nav">
        <Link to="/" className="premium-brand" aria-label="ProvenanceAI home">
          <span className="premium-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>PROVENANCEAI<small>VERIFIABLE AI TRUST</small></span>
        </Link>
        <nav aria-label="Landing page navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#architecture">Architecture</a>
        </nav>
        <Link className="premium-nav-cta" to="/app">Open Platform <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="premium-hero" aria-labelledby="landing-title">
        <MeadowRiseFooter sceneOnly className="premium-hero-meadow" heading="" subheading="" cta={null} newsletter={false} columns={[]} socials={[]} legal={[]} botanicals={false} preset="meadow" seed={3} mist={0.58} drift={0.75} interactive scrollParallax height="720px" heroHeight="720px" />
        <div className="premium-hero-copy">
          <p className="premium-eyebrow"><span /> VERIFIABLE AI TRUST PLATFORM</p>
          <h1 id="landing-title">Proof <em>beyond</em> trust.</h1>
          <p className="premium-lede">Verify the integrity and origin of AI datasets and models. Create tamper-evident provenance records, trace artifact lineage, and independently verify whether an artifact matches its registered fingerprint.</p>
          <div className="premium-actions">
            <Link to="/app" className="premium-button primary">Open Platform <span aria-hidden="true">↗</span></Link>
            <a href="#how-it-works" className="premium-button secondary">Explore How It Works <span aria-hidden="true">↓</span></a>
          </div>
          <ul className="premium-badges" aria-label="Platform capabilities">
            <li>SHA-256 Fingerprinting</li><li>Ethereum Sepolia</li><li>AI Artifact Provenance</li>
          </ul>
        </div>
      </section>

      <section className="premium-problem" aria-labelledby="problem-title">
        <p className="premium-eyebrow">01 <span /> THE TRUST GAP</p>
        <div><h2 id="problem-title">AI moves fast. Evidence should <em>travel</em> with it.</h2><p>AI datasets and models pass through collection, preprocessing, training, and distribution. Their history and integrity can become difficult to independently verify. ProvenanceAI registers artifact fingerprints and lets anyone compare a supplied file against its recorded evidence.</p></div>
      </section>

      <section className="premium-workflow" id="how-it-works" aria-labelledby="workflow-title">
        <p className="premium-eyebrow">02 <span /> HOW IT WORKS</p>
        <div className="premium-section-heading"><h2 id="workflow-title">From artifact to <em>evidence.</em></h2><p>Four focused steps turn an opaque file into a clear, independently checkable integrity record.</p></div>
        <ol className="premium-steps">
          {steps.map(([number, title, copy]) => <li key={number}><span>{number}</span><div className="step-symbol" aria-hidden="true">{number === "01" ? "↑" : number === "02" ? "◇" : number === "03" ? "⌁" : "✓"}</div><h3>{title}</h3><p>{copy}</p></li>)}
        </ol>
      </section>

      <section className="premium-features" id="features" aria-labelledby="features-title">
        <div><p className="premium-eyebrow">03 <span /> CORE FEATURES</p><h2 id="features-title">Built for clarity,<br /><em>not ceremony.</em></h2><p>Every part of the platform supports a simple question: does this file match the evidence that was registered for it?</p><Link to="/app" className="premium-text-link">Explore the workspace <span>→</span></Link></div>
        <div className="premium-feature-grid">{features.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p><i aria-hidden="true">↗</i></article>)}</div>
      </section>

      <section className="premium-audience" aria-labelledby="audience-title"><p className="premium-eyebrow">04 <span /> WHO IT IS FOR</p><h2 id="audience-title">For teams who need a history they can <em>inspect.</em></h2><div>{["AI researchers", "Machine learning teams", "Dataset creators", "Model developers", "Organizations with auditable artifact histories"].map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div></section>

      <section className="premium-architecture" id="architecture" aria-labelledby="architecture-title"><div><p className="premium-eyebrow">05 <span /> ARCHITECTURE</p><h2 id="architecture-title">Proof on-chain.<br /><em>Files off-chain.</em></h2><p>Raw datasets and models never go to the blockchain. The frontend sends opaque file bytes to the Node.js / Express backend, which computes SHA-256 and interacts with a Solidity contract on Ethereum Sepolia.</p></div><div className="architecture-diagram"><div><span>REACT</span><b>Frontend</b></div><i>→</i><div><span>NODE.JS / EXPRESS</span><b>SHA-256 fingerprinting</b></div><i>→</i><div><span>SOLIDITY</span><b>Ethereum Sepolia evidence</b></div><small>Off-chain artifact files · Ethereum Sepolia test network</small></div></section>

      <MeadowRiseFooter name="PROVENANCEAI" brandHref="#home" heading={"Trust what you can *verify.*"} subheading="Explore a more transparent approach to AI artifact integrity and provenance." cta={{ label: "Open ProvenanceAI", href: "/app" }} newsletter={false} socialTitle="" socials={[]} columns={[{ title: "Explore", links: [{ label: "Home", href: "#home" }, { label: "How It Works", href: "#how-it-works" }, { label: "Features", href: "#features" }] }, { title: "Platform", links: [{ label: "Open Platform", href: "/app" }, { label: "Architecture", href: "#architecture" }] }]} legal={[]} tagline="A verifiable chain of trust for AI artifacts." preset="meadow" mist={0.58} drift={0.75} interactive scrollParallax botanicals height="780px" heroHeight="430px" />
    </main>
  );
}

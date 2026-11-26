"use client";
import {
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  Music,
  Footprints,
  Quote,
  Drama,
  Shirt,
  Paintbrush,
  Camera,
  Code2,
  Lightbulb,
  Briefcase,
  Mic,
  Sparkles,
  Menu,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { api, downloadPDF, err } from "@/lib/client";
import { AudienceSettings } from "./PublicTraffic";
import {
  categories,
  descriptions,
  defaults,
  labels,
  staticGallery,
  dateLabel,
  type Settings,
  type Gallery,
  type Values,
} from "@/lib/shared";
const icons = [
  Music,
  Footprints,
  Quote,
  Drama,
  Shirt,
  Paintbrush,
  Camera,
  Code2,
  Lightbulb,
  Briefcase,
  Mic,
  Sparkles,
];
const steps = ["Ton identité", "Tes études", "Ton talent", "Vérification"];
const team = [
  ["1", "DJEMU DJEMU Danny", "Président des étudiants"],
  ["0", "BEYA Odia", "Secrétaire générale de la Coordination estudiantine"],
  ["2", "MUTWALE KASHAMA Idriss", "Vice-président des étudiants"],
];
function Reveal({
  children,
  id,
  cls = "",
}: {
  children: ReactNode;
  id: string;
  cls?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      className={"section " + cls}
      initial={false}
      whileInView={reduce ? {} : { y: [12, 0], opacity: [0.8, 1] }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.55 }}
    >
      {children}
    </motion.section>
  );
}
function Head({
  tag,
  title,
  desc,
  pink = false,
}: {
  tag: string;
  title: ReactNode;
  desc: string;
  pink?: boolean;
}) {
  return (
    <div className="section-head">
      <div>
        <p className={"eyebrow " + (pink ? "pink" : "yellow")}>{tag}</p>
        <h2>{title}</h2>
      </div>
      <p>{desc}</p>
    </div>
  );
}
function Brand({ admin = false }: { admin?: boolean }) {
  return (
    <a className="brand" href={admin ? "/" : "#accueil"}>
      <img src="/static/logo.webp" alt="ISS-KIN" />
      <span>
        EXPO<span className="yellow">TALENT</span>
        <small>{admin ? "ESPACE COORDINATION" : "ISS-KIN / KINSHASA"}</small>
      </span>
    </a>
  );
}
export default function PublicSite() {
  const [cfg, setCfg] = useState<Settings>(defaults),
    [gallery, setGallery] = useState<Gallery[]>([]),
    [ready, setReady] = useState(false),
    [configError, setConfigError] = useState(""),
    [menu, setMenu] = useState(false),
    [now, setNow] = useState(0),
    [policy, setPolicy] = useState<"rules" | "privacy" | null>(null),
    [light, setLight] = useState<Gallery | null>(null);
  const [step, setStep] = useState(0),
    [v, setV] = useState<Values>({ type: "Individuelle", participants: 1 }),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState<{
      ref: string;
      name: string;
      pdf: string;
      emailSent: boolean;
    } | null>(null);
  const [ref, setRef] = useState(""),
    [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [track, setTrack] = useState(""),
    [trackPdf, setTrackPdf] = useState(""),
    [tracking, setTracking] = useState(false);
  const honey = useRef<HTMLInputElement>(null);
  const { scrollY } = useScroll(),
    reduce = useReducedMotion(),
    y = useTransform(scrollY, [0, 700], [0, 100]);
  useEffect(() => {
    api<{ settings: Settings; gallery: Gallery[] }>("config")
      .then((r) => {
        setCfg(r.settings);
        setGallery(r.gallery);
        setReady(true);
      })
      .catch((e) => setConfigError(err(e)));
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPolicy(null);
        setLight(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const update = (k: string, val: string | boolean | number) =>
    setV((old) => ({
      ...old,
      [k]: val,
      ...(k === "type" && val === "Individuelle"
        ? { groupe: "", participants: 1 }
        : {}),
    }));
  function field(
    k: string,
    kind = "text",
    required = true,
    opts?: string[],
    wide = false,
  ) {
    const val = String(v[k] ?? "");
    return (
      <label className={wide ? "wide" : undefined} key={k}>
        {labels[k]}
        {required ? " *" : " (facultatif)"}
        {opts?.length ? (
          <select
            required={required}
            value={val}
            onChange={(e) => update(k, e.target.value)}
          >
            <option value="">Choisir…</option>
            {opts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : kind === "textarea" ? (
          <textarea
            required={required}
            value={val}
            maxLength={2000}
            onChange={(e) => update(k, e.target.value)}
          />
        ) : (
          <input
            type={kind}
            required={required}
            value={val}
            min={kind === "number" ? 2 : undefined}
            max={kind === "number" ? 100 : undefined}
            maxLength={kind === "url" ? 500 : 150}
            onChange={(e) => update(k, e.target.value)}
          />
        )}
      </label>
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({ ...v, website: honey.current?.value || "" }),
      );
      if (file) fd.append("attachment", file);
      const r = await api<{
        ref: string;
        name: string;
        pdf: string;
        emailSent: boolean;
      }>("register", fd);
      setSuccess(r);
      setRef(r.ref);
      setEmail(String(v.email));
      setFile(null);
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(false);
    }
  }
  async function doTrack(e: FormEvent) {
    e.preventDefault();
    setTracking(true);
    setTrackPdf("");
    try {
      const r = await api<{ message: string }>("track/request", { ref, email });
      setTrack(r.message);
      setSent(true);
    } catch (e) {
      setTrack(err(e));
    } finally {
      setTracking(false);
    }
  }
  async function verify() {
    setTracking(true);
    try {
      const r = await api<{ ref: string; status: string; pdf: string }>(
        "track/verify",
        { ref, email, code },
      );
      setTrack(`${r.ref} — ${r.status}`);
      setTrackPdf(r.pdf);
      setSent(false);
    } catch (e) {
      setTrack(err(e));
    } finally {
      setTracking(false);
    }
  }
  const seconds = Math.max(
    0,
    Math.floor((new Date(cfg.date).getTime() - now) / 1000),
  );
  const countdown = !cfg.date
    ? "Coming Soon"
    : !now
      ? "Coming Soon"
      : seconds === 0
        ? "Date de l’événement atteinte"
        : `${Math.floor(seconds / 86400)}j ${Math.floor(seconds / 3600) % 24}h ${Math.floor(seconds / 60) % 60}m ${seconds % 60}s`;
  return (
    <>
      <div className="loader" aria-hidden="true">
        <img src="/static/logo.webp" alt="" />
        <span>EXPO TALENT</span>
      </div>
      <header className="nav">
        <Brand />
        <button
          className="menu"
          aria-label="Ouvrir le menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Menu />
        </button>
        <nav className={menu ? "open" : ""} onClick={() => setMenu(false)}>
          <a href="#apropos">À propos</a>
          <a href="#talents">Talents</a>
          <a href="#programme">Programme</a>
          <a href="#galerie">Galerie</a>
          <a href="#suivi">Suivi</a>
          <a href="#inscription" className="btn small">
            S’inscrire ↗
          </a>
        </nav>
      </header>
      <main>
        <section className="hero" id="accueil">
          <motion.div className="hero-glow" style={{ y: reduce ? 0 : y }} />
          <div className="hero-content">
            <div className="eyebrow">
              <span className="dot" /> COORDINATION ESTUDIANTINE — ISS-KIN
            </div>
            <div className="hero-grid">
              <div>
                <p className="hero-kicker">LA SCÈNE EST À TOI.</p>
                <h1>
                  EXPO
                  <br />
                  <em>
                    TALENT<span>.</span>
                  </em>
                </h1>
                <p className="slogan">
                  Révélons aujourd’hui les talents
                  <br />
                  qui façonneront demain !
                </p>
                <p className="intro">
                  Tu as un talent ? Une passion ? Une créativité qui mérite
                  d’être découverte ? EXPO TALENT est ta scène. Viens exprimer
                  ton potentiel et montrer ce dont tu es capable.
                </p>
                <div className="actions">
                  <a className="btn" href="#inscription">
                    Je m’inscris maintenant <ArrowUpRight size={18} />
                  </a>
                  <a className="btn outline" href="#apropos">
                    Découvrir l’événement ↓
                  </a>
                </div>
              </div>
              <div className="hero-side">
                <div className="poster-frame">
                  <img
                    src="/static/affiche.webp"
                    alt="Affiche officielle EXPO TALENT"
                    fetchPriority="high"
                  />
                </div>
                <div className="date-card">
                  <span className="eyebrow">● PROCHAINE ÉDITION</span>
                  <strong>{countdown}</strong>
                  <small>
                    {cfg.date
                      ? dateLabel(cfg.date)
                      : "La date officielle sera annoncée prochainement."}
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            <span>KINSHASA, RDC</span>
            <span>CRÉATIVITÉ • EXCELLENCE • INNOVATION</span>
            <span>01 / 07</span>
          </div>
        </section>
        <div className="ticker">
          {["CRÉER", "OSER", "INNOVER", "INSPIRER", "BRILLER"].map((t) => (
            <span key={t}>✳ {t}</span>
          ))}
        </div>
        <Reveal id="apropos" cls="split">
          <div className="campus-card">
            <img
              src="/static/campus-vie.webp"
              alt="Rassemblement des étudiants sur le campus ISS-KIN"
              loading="lazy"
            />
            <div className="image-label">
              ISS-KIN <span>Une jeunesse en mouvement.</span>
            </div>
          </div>
          <div>
            <p className="eyebrow pink">01 / L’INITIATIVE</p>
            <h2>
              Le talent n’a
              <br />
              pas de <em>limites.</em>
            </h2>
            <p className="lead">
              EXPO TALENT est une initiative de la Coordination estudiantine de
              l’Institut Supérieur de Statistique de Kinshasa, dédiée à la
              créativité, l’innovation, l’expression artistique et
              l’épanouissement des étudiants.
            </p>
            <div className="chips">
              {[
                "Créativité",
                "Excellence",
                "Innovation",
                "Leadership",
                "Diversité",
                "Esprit estudiantin",
              ].map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal id="talents" cls="category-section">
          <Head
            tag="02 / TROUVE TA SCÈNE"
            title={
              <>
                Quel est <em>ton talent ?</em>
              </>
            }
            desc="De la scène à la technologie, chaque passion mérite sa place. Choisis ta catégorie et lance-toi."
          />
          <div className="category-grid">
            {cfg.categories.map((c, i) => {
              const Icon = icons[i % icons.length];
              return (
                <article className="category" key={c}>
                  <div className="symbol">
                    <Icon />
                  </div>
                  <h3>{c}</h3>
                  <p>
                    {descriptions[categories.indexOf(c)] ||
                      "Partage ton savoir-faire et révèle ton potentiel."}
                  </p>
                  <a
                    className="link"
                    href="#inscription"
                    onClick={() => update("categorie", c)}
                  >
                    Participer ↗
                  </a>
                </article>
              );
            })}
          </div>
        </Reveal>
        <Reveal id="programme">
          <Head
            tag="03 / L’AGENDA"
            pink
            title={
              <>
                Le <em>programme.</em>
              </>
            }
            desc="Les dates et annonces officielles seront publiées ici."
          />
          <div className="program-grid">
            {[
              ["DATE OFFICIELLE", dateLabel(cfg.date)],
              ["CLÔTURE DES INSCRIPTIONS", dateLabel(cfg.deadline)],
              ["LIEU", cfg.venue],
              ["AUDITIONS", cfg.auditions],
              ["RÉPÉTITIONS", cfg.repetitions],
              ["PRESTATIONS", cfg.program],
            ].map(([k, x]) => (
              <article key={k}>
                <small>{k}</small>
                <h3>{x || "À venir"}</h3>
              </article>
            ))}
          </div>
          <div className="panel">
            {cfg.announcements || "Communiqués officiels : à venir."}
          </div>
        </Reveal>
        <Reveal id="inscription" cls="registration">
          <div className="reg-intro">
            <p className="eyebrow yellow">04 / À TOI DE JOUER</p>
            <h2>
              Prêt à<br />
              <em>briller ?</em>
            </h2>
            <p>
              Quatre étapes pour rejoindre l’aventure. Prépare ton matricule et
              une adresse e-mail accessible.
            </p>
            <div className="steps-aside">
              {steps.map((s, i) => (
                <div key={s} className={i === step ? "active" : ""}>
                  0{i + 1} — {s}
                </div>
              ))}
            </div>
            <p className="muted">
              Tes informations sont réservées aux membres habilités de la
              coordination.
            </p>
          </div>
          <div className="panel form-panel">
            {success ? (
              <div aria-live="polite">
                <motion.div
                  className="success-icon"
                  initial={{ scale: 0.3 }}
                  animate={{ scale: 1 }}
                >
                  <Check size={48} />
                </motion.div>
                <h3>Félicitations, {success.name} !</h3>
                <p>
                  Ton inscription à EXPO TALENT a bien été enregistrée. Tu viens
                  de franchir la première étape vers la révélation de ton
                  talent.
                </p>
                <p className="ref">{success.ref}</p>
                <p>
                  {success.emailSent
                    ? "E-mail de confirmation accepté par le service d’envoi."
                    : "Inscription enregistrée. L’e-mail n’a pas pu être envoyé ; la coordination peut réessayer."}
                </p>
                <div className="actions">
                  <button
                    className="btn"
                    onClick={() => downloadPDF(success.pdf, success.ref)}
                  >
                    Télécharger mon récépissé PDF ↓
                  </button>
                  <a className="btn outline" href="#suivi">
                    Suivre mon inscription
                  </a>
                </div>
              </div>
            ) : !ready ? (
              <p role="status">
                {configError || "Chargement des inscriptions…"}
              </p>
            ) : !cfg.open ? (
              <p>Les inscriptions sont fermées pour le moment.</p>
            ) : (
              <form onSubmit={submit}>
                <div className="progress">
                  <span>ÉTAPE {step + 1} / 4</span>
                  <span>{(step + 1) * 25}%</span>
                  <div>
                    <i style={{ width: (step + 1) * 25 + "%" }} />
                  </div>
                </div>
                <h3>{steps[step]}</h3>
                <div className="fields">
                  {step === 0 && (
                    <>
                      {field("nom")}
                      {field("postnom")}
                      {field("prenom")}
                      {field("sexe", "text", false, [
                        "Féminin",
                        "Masculin",
                        "Autre",
                        "Ne souhaite pas préciser",
                      ])}
                      {field("email", "email")}
                      {field("telephone", "tel")}
                    </>
                  )}
                  {step === 1 && (
                    <>
                      {field("matricule")}
                      {field("filiere", "text", true, cfg.filieres)}
                      {field("departement", "text", true, cfg.departements)}
                      {field("promotion", "text", true, cfg.promotions)}
                      {field("vacation", "text", false, cfg.vacations)}
                    </>
                  )}
                  {step === 2 && (
                    <>
                      {field("categorie", "text", true, cfg.categories)}
                      {field("intitule")}
                      {field("description", "textarea", true, undefined, true)}
                      {field("type", "text", true, [
                        "Individuelle",
                        "En groupe",
                      ])}
                      {v.type === "En groupe" && (
                        <>
                          {field("groupe")}
                          {field("participants", "number")}
                        </>
                      )}
                      {field("besoins", "textarea", false, undefined, true)}
                      {field("motivation", "textarea", true, undefined, true)}
                      {field("video", "url", false, undefined, true)}
                      <label className="wide">
                        Photo ou document (facultatif, 3 Mo max)
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f && f.size > 3 * 1024 * 1024) {
                              setError("Fichier limité à 3 Mo.");
                              e.target.value = "";
                              return;
                            }
                            setFile(f || null);
                            setError("");
                          }}
                        />
                        {file && (
                          <>
                            <small>{file.name}</small>
                            <button
                              type="button"
                              className="link"
                              onClick={() => setFile(null)}
                            >
                              Retirer la pièce jointe
                            </button>
                          </>
                        )}
                      </label>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <div className="wide recap">
                        {Object.entries(v)
                          .filter(
                            ([k, x]) =>
                              x &&
                              labels[k] &&
                              ![
                                "certifie",
                                "reglement",
                                "consentement",
                              ].includes(k),
                          )
                          .map(([k, x]) => (
                            <div key={k}>
                              <small>{labels[k]}</small>
                              {String(x)}
                            </div>
                          ))}
                        {file && (
                          <div>
                            <small>Pièce jointe</small>
                            {file.name}
                          </div>
                        )}
                      </div>
                      {[
                        [
                          "certifie",
                          "Je certifie l’exactitude des informations fournies.",
                        ],
                        [
                          "reglement",
                          "J’accepte le règlement de participation.",
                        ],
                        [
                          "consentement",
                          "J’accepte le traitement de mes données personnelles dans le cadre de cet événement.",
                        ],
                      ].map(([k, t]) => (
                        <label className="wide check" key={k}>
                          <input
                            type="checkbox"
                            required
                            checked={v[k] === true}
                            onChange={(e) => update(k, e.target.checked)}
                          />
                          {t}
                        </label>
                      ))}
                      <button
                        type="button"
                        className="link"
                        onClick={() => setPolicy("rules")}
                      >
                        Lire le règlement ↗
                      </button>
                      <button
                        type="button"
                        className="link"
                        onClick={() => setPolicy("privacy")}
                      >
                        Lire la confidentialité ↗
                      </button>
                    </>
                  )}
                </div>
                <div className="honeypot" aria-hidden="true">
                  <label>
                    Site web
                    <input ref={honey} tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <p className="error" role="alert">
                  {error}
                </p>
                <div className="form-actions">
                  {step > 0 && (
                    <button
                      type="button"
                      className="btn outline"
                      onClick={() => {
                        setStep((s) => s - 1);
                        setError("");
                      }}
                    >
                      ← Précédent
                    </button>
                  )}
                  <button className="btn ml-auto" disabled={busy}>
                    {busy
                      ? "Enregistrement…"
                      : step === 3
                        ? "Confirmer mon inscription ↗"
                        : "Continuer →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Reveal>
        <Reveal id="suivi">
          <Head
            tag="05 / RESTE INFORMÉ"
            pink
            title={
              <>
                Suivre mon <em>inscription.</em>
              </>
            }
            desc="Un code envoyé par e-mail protège l’accès à ton statut."
          />
          <form className="panel track-form" onSubmit={doTrack}>
            <label>
              Numéro d’inscription
              <input
                required
                value={ref}
                onChange={(e) => {
                  setRef(e.target.value);
                  setSent(false);
                  setTrackPdf("");
                }}
                placeholder="EXPO-2026-…"
              />
            </label>
            <label>
              Adresse e-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                  setTrackPdf("");
                }}
                placeholder="ton@email.com"
              />
            </label>
            <button className="btn" disabled={tracking}>
              Recevoir un code
            </button>
            {sent && (
              <>
                <label>
                  Code à 6 chiffres
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                </label>
                <button
                  type="button"
                  className="btn outline"
                  disabled={tracking || !/^\d{6}$/.test(code)}
                  onClick={verify}
                >
                  Vérifier mon statut
                </button>
              </>
            )}
            <p role="status">{track}</p>
            {trackPdf && (
              <button
                type="button"
                className="btn outline"
                onClick={() => downloadPDF(trackPdf, ref)}
              >
                Télécharger le récépissé ↓
              </button>
            )}
          </form>
        </Reveal>
        <Reveal id="coordination">
          <Head
            tag="06 / LES VISAGES DU PROJET"
            title={
              <>
                La <em>coordination.</em>
              </>
            }
            desc="Les responsables figurant sur l’affiche officielle."
          />
          <div className="team-grid">
            {team.map(([n, name, role]) => (
              <article className="team" key={n}>
                <img
                  src={"/static/portrait-" + n + ".webp"}
                  alt="Portrait extrait de l’affiche officielle"
                  loading="lazy"
                />
                <div>
                  <span>{role.toUpperCase()}</span>
                  <h3>{name}</h3>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
        <Reveal id="galerie">
          <Head
            tag="07 / EN IMAGES"
            pink
            title={
              <>
                Notre <em>univers.</em>
              </>
            }
            desc="Le campus, la vie estudiantine et les visuels officiels."
          />
          <div className="gallery-grid">
            {[...staticGallery, ...gallery].map((g) =>
              g.kind === "video" ? (
                <a
                  key={g.id}
                  className="gallery-item video-tile"
                  href={g.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶ {g.caption}
                </a>
              ) : (
                <button
                  key={g.id}
                  className="gallery-item"
                  onClick={() => setLight(g)}
                >
                  <img src={g.path} alt={g.caption} loading="lazy" />
                  <span>{g.caption} ↗</span>
                </button>
              ),
            )}
          </div>
        </Reveal>
        <Reveal id="contact" cls="faq">
          <div>
            <p className="eyebrow yellow">QUESTIONS & CONTACT</p>
            <h2>
              On est <em>là.</em>
            </h2>
            <div className="actions">
              {cfg.email && (
                <a className="btn outline" href={"mailto:" + cfg.email}>
                  E-mail ↗
                </a>
              )}
              {cfg.whatsapp && (
                <a
                  className="btn"
                  href={"https://wa.me/" + cfg.whatsapp.replace(/\D/g, "")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp ↗
                </a>
              )}
              {cfg.social && (
                <a
                  className="btn outline"
                  href={cfg.social}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Réseaux sociaux ↗
                </a>
              )}
              {!cfg.email &&
                !cfg.whatsapp &&
                !cfg.social &&
                "Coordonnées officielles à venir."}
            </div>
          </div>
          <div>
            {[
              [
                "Qui peut participer ?",
                "Les étudiants de l’ISS-KIN, selon les modalités communiquées par la coordination.",
              ],
              [
                "Comment s’inscrire ?",
                "Complète les quatre étapes du formulaire et conserve ton numéro d’inscription.",
              ],
              [
                "Peut-on participer en groupe ?",
                "Oui, sélectionne la participation en groupe et renseigne son nom et le nombre de participants.",
              ],
              [
                "Comment savoir si ma candidature est acceptée ?",
                "Utilise le suivi sécurisé ou consulte les notifications reçues par e-mail.",
              ],
              ["Où se déroulera l’événement ?", cfg.venue || "À venir."],
              [
                "Comment contacter la coordination ?",
                "Les coordonnées officielles seront affichées dès leur publication.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </main>
      <footer>
        <Brand />
        <p>Institut Supérieur de Statistique de Kinshasa • RDC</p>
        <div>
          <button className="link" onClick={() => setPolicy("rules")}>
            Règlement
          </button>{" "}
          ·{" "}
          <button className="link" onClick={() => setPolicy("privacy")}>
            Confidentialité
          </button>{" "}
          · <a href="/espace-coordination">Espace Coordination</a>
        </div>
        <p className="developer-credit">
          Conçu avec{" "}
          <span className="developer-heart" aria-label="amour">♥</span>
          {" "}par{" "}
          <a
            href="https://wa.me/243818897032"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contacter Winner Luyeye sur WhatsApp"
          >
            Winner Luyeye
          </a>
        </p>
      </footer>
      {(light || policy) && (
        <div
          className="lightbox-overlay"
          role="presentation"
          onClick={() => {
            setLight(null);
            setPolicy(null);
          }}
        >
          <div
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-label={light?.caption || "Information"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              autoFocus
              onClick={() => {
                setLight(null);
                setPolicy(null);
              }}
              aria-label="Fermer"
            >
              ×
            </button>
            {light ? (
              <>
                <img src={light.path} alt={light.caption} />
                <p>{light.caption}</p>
              </>
            ) : (
              <>
                <h2>{policy === "rules" ? "Règlement" : "Confidentialité"}</h2>
                <p className="whitespace-pre-wrap">
                  {(policy && cfg[policy]) || "À venir"}
                  {policy === "privacy" &&
                    "\n\nConservation : " + (cfg.retention || "À définir")}
                </p>
                {policy === "privacy" && <AudienceSettings />}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

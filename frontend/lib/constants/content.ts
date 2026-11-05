/**
 * All landing-page copy lives here so it can be reviewed and edited without touching JSX.
 * Numbers marked as "sample" or "target" are illustrative, never measured results.
 */
import {
  BookOpenCheck,
  Boxes,
  Braces,
  Brain,
  FileSearch,
  FileText,
  Fingerprint,
  GraduationCap,
  Languages,
  Layers,
  ScanSearch,
  Scale,
  ScrollText,
  ShieldCheck,
  SplitSquareHorizontal,
  Telescope,
  Type,
  Upload,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export const SITE = {
  name: "Parallax",
  tagline: "See your work from every angle.",
  oneLiner:
    "Parallax compares academic documents lexically, semantically, conceptually, and structurally across Bangla, English, and mixed text, and shows reviewers the evidence.",
  university: "Daffodil International University",
  course: "SE 331 · Software Engineering Design Capstone",
  section: "Section 42 (E1)",
  supervisor: { name: "Partho Chanda", title: "Lecturer" },
  team: ["Khandaker Samin Yeasar", "Nusrat Jahan"],
  github: "https://github.com/KhandakerSamin/Parallax",
} as const;

export const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "perspectives", label: "Perspectives" },
  { id: "research", label: "Research" },
  { id: "faq", label: "FAQ" },
] as const;

/* ------------------------------------------------------------------ */
/* Perspectives                                                        */
/* ------------------------------------------------------------------ */
export type PerspectiveKey = "lexical" | "semantic" | "concept" | "structural";

export type Perspective = {
  key: PerspectiveKey;
  name: string;
  icon: LucideIcon;
  /** CSS variable for the strong colour. */
  color: string;
  /** CSS variable for the tinted background. */
  soft: string;
  measures: string;
  method: string;
};

export const PERSPECTIVES: readonly Perspective[] = [
  {
    key: "lexical",
    name: "Lexical",
    icon: Type,
    color: "var(--lexical)",
    soft: "var(--lexical-soft)",
    measures: "Shared words and phrases: the surface overlap a reader notices first.",
    method: "TF-IDF vectors compared with cosine similarity.",
  },
  {
    key: "semantic",
    name: "Semantic",
    icon: Brain,
    color: "var(--semantic)",
    soft: "var(--semantic-soft)",
    measures: "Shared meaning, even when the wording or the language is different.",
    method: "Multilingual sentence embeddings over overlapping chunks.",
  },
  {
    key: "concept",
    name: "Concept",
    icon: Fingerprint,
    color: "var(--concept)",
    soft: "var(--concept-soft)",
    measures: "The same project idea: domain, problem, users, inputs, methods, outputs, platform.",
    method: "A structured project fingerprint compared field by field.",
  },
  {
    key: "structural",
    name: "Structural",
    icon: Boxes,
    color: "var(--structural)",
    soft: "var(--structural-soft)",
    measures: "The same system design, built from the same components wired the same way.",
    method: "An architecture fingerprint of components and their connections.",
  },
] as const;

/** Illustrative per-perspective scores used by the hero card and the playground. */
export const SAMPLE_SCORES: Record<PerspectiveKey, number> = {
  lexical: 0.41,
  semantic: 0.78,
  concept: 0.7,
  structural: 0.65,
};

export const DEFAULT_WEIGHTS: Record<PerspectiveKey, number> = {
  lexical: 0.2,
  semantic: 0.35,
  concept: 0.25,
  structural: 0.2,
};

export const WEIGHT_PRESETS = [
  { name: "Default", weights: DEFAULT_WEIGHTS },
  {
    name: "Semantic-heavy",
    weights: { lexical: 0.1, semantic: 0.4, concept: 0.3, structural: 0.2 },
  },
] as const;

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
export const HERO = {
  eyebrow: "Bangla · English · Banglish — academic similarity, explained",
  titleStart: "See your work from every ",
  titleEmphasis: "angle.",
  primaryCta: "Analyze a document",
  secondaryCta: "See how it works",
  trust: "Built for DIU · Results show potential similarity, not verdicts.",
  report: {
    label: "Similarity report",
    sampleTag: "Sample result",
    overall: 0.72,
    scores: { lexical: 0.41, semantic: 0.86, concept: 0.78, structural: 0.69 },
    match: {
      title: "Smart Attendance System using Face Recognition",
      year: "2023",
      type: "Project Report",
    },
  },
} as const;

/* ------------------------------------------------------------------ */
/* Corpus                                                              */
/* ------------------------------------------------------------------ */
export const CORPUS_STATS = [
  { value: 642, suffix: "", label: "Project reports" },
  { value: 356, suffix: "", label: "Thesis reports" },
  { value: 22, suffix: "", label: "Internship reports" },
  { value: 2000, suffix: "+", label: "Target corpus" },
] as const;

export const CORPUS_SOURCE = "DIU DSpace · Software Engineering community";

/* ------------------------------------------------------------------ */
/* Problem                                                             */
/* ------------------------------------------------------------------ */
export const PROBLEM = {
  title: "Word matching misses what matters.",
  intro:
    "Most similarity tools count shared words. Academic reuse rarely looks like that: the idea is kept and the words are changed or translated.",
  cards: [
    {
      icon: ScanSearch,
      title: "Surface-level matching",
      body: "String overlap flags shared phrasing but misses a paraphrased proposal that reuses the same idea.",
    },
    {
      icon: Languages,
      title: "Language gap",
      body: "A Bangla report and its English rewrite share almost no words, so word-based tools see two unrelated documents.",
    },
    {
      icon: Telescope,
      title: "Knowledge vacuum",
      body: "Students and supervisors can't easily see what earlier DIU projects already explored before a new one starts.",
    },
    {
      icon: FileSearch,
      title: "No evidence",
      body: "A single percentage gives a reviewer nothing to inspect: no matched sections and no reason for the score.",
    },
  ],
  before: { score: "34%", caption: "One number, no context" },
  after: {
    caption: "Four perspectives with section-level evidence",
    items: [
      "Problem statement matches",
      "Same method: MobileNetV2",
      "Same architecture: 4 of 5 components",
    ],
  },
} as const;

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */
export type Step = { icon: LucideIcon; title: string; summary: string; details: readonly string[] };

export const STEPS: readonly Step[] = [
  {
    icon: Upload,
    title: "Upload",
    summary:
      "Add a proposal, abstract, thesis or project report as a PDF or plain text, with its metadata.",
    details: ["Digital PDF or pasted text", "Title, type, year, department"],
  },
  {
    icon: ScrollText,
    title: "Extract & clean",
    summary: "Text is pulled from the file. Headers, footers and page numbers are stripped out.",
    details: ["Unicode normalisation for Bangla", "Boilerplate removed"],
  },
  {
    icon: Layers,
    title: "Detect sections & language",
    summary:
      "Each part is labelled (Abstract, Problem, Methodology, Architecture…) along with its language.",
    details: ["Bangla, English or mixed", "Section-aware comparison"],
  },
  {
    icon: Braces,
    title: "Chunk & embed",
    summary:
      "Text is split into overlapping chunks of about 300 words, and each chunk gets a multilingual embedding.",
    details: ["Never one vector per document", "Overlap keeps context across chunk edges"],
  },
  {
    icon: Scale,
    title: "Retrieve & score",
    summary:
      "The top 20 nearest chunks point to candidate documents, which are scored from four perspectives and combined into a hybrid score.",
    details: ["Optional cross-encoder re-rank to the top 5", "Deterministic and reproducible"],
  },
  {
    icon: FileText,
    title: "Explain & report",
    summary:
      "Each match is shown with section-level evidence and a “why similar” summary, downloadable as a PDF.",
    details: ["Highlighted passages side by side", "Reviewer records the decision"],
  },
];

/* ------------------------------------------------------------------ */
/* Explainability                                                      */
/* ------------------------------------------------------------------ */
export type Segment = { text: string; mark?: boolean; lang?: "bn" };
export type EvidenceTab = {
  id: string;
  label: string;
  yours: readonly Segment[];
  matched: readonly Segment[];
};

export const EXPLAIN = {
  title: "Not just a number. The evidence.",
  intro:
    "Every match opens into a side-by-side view. Shared passages are highlighted section by section, so a reviewer can check the reasoning behind the score.",
  yoursLabel: "Your document",
  matchedLabel: "Matched: 2022 Thesis",
  sampleNote: "Sample texts written for illustration.",
  tabs: [
    {
      id: "problem",
      label: "Problem Statement",
      yours: [
        { text: "In large classrooms, " },
        { text: "taking attendance by hand wastes lecture time", mark: true },
        { text: " and " },
        { text: "proxy attendance is easy to get away with", mark: true },
        { text: "." },
      ],
      matched: [
        { text: "বড় ক্লাসরুমে ", lang: "bn" },
        { text: "হাতে হাজিরা নেওয়া সময়সাপেক্ষ", lang: "bn", mark: true },
        { text: ", এবং ", lang: "bn" },
        { text: "proxy attendance সহজেই করা যায়", lang: "bn", mark: true },
        { text: "।", lang: "bn" },
      ],
    },
    {
      id: "methodology",
      label: "Methodology",
      yours: [
        { text: "We " },
        { text: "detect faces from a live webcam feed", mark: true },
        { text: ", " },
        { text: "extract embeddings with a pretrained MobileNetV2", mark: true },
        { text: " model, and " },
        { text: "match them against enrolled students", mark: true },
        { text: "." },
      ],
      matched: [
        { text: "A " },
        { text: "pretrained MobileNetV2 network extracts face embeddings", mark: true },
        { text: " " },
        { text: "from webcam frames", mark: true },
        { text: ", which are then " },
        { text: "compared with the enrolled student database", mark: true },
        { text: " to mark presence." },
      ],
    },
    {
      id: "architecture",
      label: "Architecture",
      yours: [
        { text: "A " },
        { text: "React web client calls a REST API", mark: true },
        { text: "; a " },
        { text: "Python ML service", mark: true },
        { text: " handles recognition, results are " },
        { text: "stored in PostgreSQL", mark: true },
        { text: ", and an " },
        { text: "admin dashboard", mark: true },
        { text: " shows reports." },
      ],
      matched: [
        { text: "সিস্টেমে একটি ", lang: "bn" },
        { text: "web client ও একটি REST API", lang: "bn", mark: true },
        { text: " রয়েছে; একটি আলাদা ", lang: "bn" },
        { text: "ML service", lang: "bn", mark: true },
        { text: " শনাক্তকরণ করে, ফলাফল ", lang: "bn" },
        { text: "database-এ সংরক্ষিত হয়", lang: "bn", mark: true },
        { text: " এবং ", lang: "bn" },
        { text: "dashboard-এ রিপোর্ট", lang: "bn", mark: true },
        { text: " দেখা যায়।", lang: "bn" },
      ],
    },
  ] as readonly EvidenceTab[],
  why: {
    title: "Why are these similar?",
    groups: [
      { label: "Shared problem", chips: ["Manual attendance", "Proxy attendance"] },
      { label: "Method", chips: ["Face recognition", "MobileNetV2 embeddings"] },
      { label: "Inputs", chips: ["Webcam frames", "Enrolled student photos"] },
      { label: "Outputs", chips: ["Attendance records", "Reports"] },
      {
        label: "Architecture",
        chips: ["Web Client", "REST API", "ML Service", "Database", "Dashboard"],
      },
    ],
  },
} as const;

/* ------------------------------------------------------------------ */
/* Multilingual                                                        */
/* ------------------------------------------------------------------ */
export const MULTILINGUAL = {
  title: "Built for Bangla and mixed text.",
  body: "DIU reports are written in English, in Bangla, and often in a mix of the two. Parallax uses multilingual embeddings, so the same idea lands in the same neighbourhood whatever language it was written in.",
  points: [
    "Bangla Unicode normalisation before comparison",
    "Mixed-language and Banglish passages handled together",
    "Cross-lingual matches surfaced as evidence, not hidden",
  ],
  phrases: [
    {
      id: "en",
      label: "English",
      text: "Automated attendance using face recognition",
      lang: undefined,
    },
    { id: "bn", label: "Bangla", text: "ফেস রিকগনিশন ব্যবহার করে স্বয়ংক্রিয় হাজিরা", lang: "bn" },
    {
      id: "banglish",
      label: "Banglish",
      text: "face recognition diye automatic attendance",
      lang: undefined,
    },
  ],
  outlier: { label: "Unrelated", text: "Online grocery delivery platform" },
  caption: "Illustration of a shared embedding space, not real model output.",
} as const;

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */
export const ROLES = [
  {
    icon: GraduationCap,
    role: "Student",
    color: "var(--semantic)",
    points: ["Check a proposal before submitting", "Discover related prior work at DIU"],
  },
  {
    icon: BookOpenCheck,
    role: "Reviewer / Supervisor",
    color: "var(--concept)",
    points: [
      "Inspect matches and compare sections",
      "Record a decision: acceptable, needs revision, or needs investigation",
    ],
  },
  {
    icon: SplitSquareHorizontal,
    role: "Researcher",
    color: "var(--lexical)",
    points: ["Annotate document pairs", "Compare models and view evaluation metrics"],
  },
  {
    icon: UserCog,
    role: "Admin",
    color: "var(--structural)",
    points: ["Manage corpus, models and weights", "Manage users and review audit logs"],
  },
] as const;

/* ------------------------------------------------------------------ */
/* Research                                                            */
/* ------------------------------------------------------------------ */
export const RESEARCH = {
  title: "Measured against human judgment.",
  intro:
    "Every model is evaluated on document pairs labelled by human annotators. We publish what we measure, and nothing before it is measured.",
  status: "Evaluation in progress: results forthcoming",
  models: [
    { name: "TF-IDF", note: "Lexical baseline" },
    { name: "paraphrase-multilingual-MiniLM-L12-v2", note: "Compact multilingual embeddings" },
    { name: "LaBSE", note: "Language-agnostic sentence embeddings" },
    { name: "Bangla-specific model", note: "Monolingual Bangla embeddings" },
    { name: "Hybrid Parallax", note: "Four perspectives, weighted" },
  ],
  metrics: ["Precision", "Recall", "F1", "Recall@K", "Spearman ρ"],
  scale: [
    { value: 0, label: "Unrelated" },
    { value: 1, label: "Related" },
    { value: 2, label: "Strongly similar" },
    { value: 3, label: "Potential conceptual reuse" },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Responsible by design                                               */
/* ------------------------------------------------------------------ */
export const RESPONSIBLE = {
  title: "Responsible by design.",
  icon: ShieldCheck,
  principles: [
    {
      title: "Potential similarity only",
      body: "Parallax reports how similar two documents are. It never delivers a plagiarism verdict.",
    },
    { title: "Humans decide", body: "Final academic judgment always stays with human reviewers." },
    {
      title: "Deterministic scoring",
      body: "Scores are reproducible. Language models never decide the score.",
    },
    {
      title: "Role-based access",
      body: "People only see the documents and results their role allows.",
    },
    {
      title: "Author anonymisation",
      body: "Author identities can be hidden while a match is being reviewed.",
    },
    {
      title: "Attribution & permission",
      body: "Corpus documents are used with attribution and permission.",
    },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */
export const FAQ = [
  {
    q: "Is this a plagiarism checker?",
    a: "No. Parallax measures potential similarity between academic documents and shows the evidence. Deciding whether something is misconduct stays with human reviewers.",
  },
  {
    q: "Does a high score mean I copied?",
    a: "No. Scores are not “percent copied”. A high score means two documents are close from one or more perspectives. That can mean shared ideas, a common template, or work that builds on earlier work. Use the evidence view to see why.",
  },
  {
    q: "Which languages are supported?",
    a: "English, Bangla, and mixed Bangla-English text, including Banglish written in Latin script.",
  },
  {
    q: "What file types can I upload?",
    a: "Digital (text-based) PDFs and plain text. Scanned PDFs that need OCR are not supported yet.",
  },
  {
    q: "Who can see my document?",
    a: "Access is role-based. Your uploads are visible to you and to reviewers assigned to them, and author details can be anonymised during review.",
  },
  {
    q: "How is the score calculated?",
    a: "Four perspective scores (lexical, semantic, concept, structural) are combined with weights into one hybrid score. The default weights are 0.20 / 0.35 / 0.25 / 0.20. They are experimental and are tuned against human judgments.",
  },
  {
    q: "Can reviewers override results?",
    a: "Yes. Reviewers inspect each match and record their own decision: acceptable, needs revision, or needs investigation. The score informs that decision but never replaces it.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Feature highlights (auth brand panel)                               */
/* ------------------------------------------------------------------ */
export const AUTH_HIGHLIGHTS = [
  { icon: Layers, text: "Four perspectives: lexical, semantic, concept and structural." },
  { icon: Languages, text: "Compares Bangla, English and mixed text side by side." },
  { icon: Users, text: "Built for students, reviewers, researchers and admins at DIU." },
  { icon: ShieldCheck, text: "Reports potential similarity. People make the decisions." },
] as const;

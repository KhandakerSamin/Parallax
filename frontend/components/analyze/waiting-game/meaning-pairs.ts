/**
 * Sentence pairs for "Same Meaning?". Roughly half are the same idea in two languages;
 * the rest are near misses that share most words but not the meaning.
 * Before release, have a native Bangla speaker check every sentence.
 */
export type MeaningPair = {
  en: string;
  bn: string;
  same: boolean;
  /** For a different pair: one line on what changed. */
  why?: string;
};

export const MEANING_PAIRS: readonly MeaningPair[] = [
  { en: "The library opens at nine.", bn: "গ্রন্থাগার নয়টায় খোলে।", same: true },
  { en: "She finished her thesis last year.", bn: "তিনি গত বছর তার থিসিস শেষ করেছেন।", same: true },
  { en: "The exam was postponed.", bn: "পরীক্ষা পিছিয়ে দেওয়া হয়েছে।", same: true },
  { en: "Practice makes perfect.", bn: "অনুশীলনে দক্ষতা বাড়ে।", same: true },
  { en: "The bus was late again.", bn: "বাস আবার দেরিতে এসেছে।", same: true },
  { en: "Water boils at one hundred degrees.", bn: "পানি একশো ডিগ্রিতে ফোটে।", same: true },
  {
    en: "Our class starts after lunch.",
    bn: "দুপুরের খাবারের পর আমাদের ক্লাস শুরু হয়।",
    same: true,
  },
  {
    en: "Please submit the report by Friday.",
    bn: "অনুগ্রহ করে শুক্রবারের মধ্যে প্রতিবেদন জমা দিন।",
    same: true,
  },
  {
    en: "The teacher explained the problem again.",
    bn: "শিক্ষক সমস্যাটি আবার ব্যাখ্যা করলেন।",
    same: true,
  },
  {
    en: "Reading every day improves your vocabulary.",
    bn: "প্রতিদিন পড়লে শব্দভান্ডার বাড়ে।",
    same: true,
  },
  {
    en: "The meeting has been moved to Monday.",
    bn: "সভাটি সোমবারে সরিয়ে নেওয়া হয়েছে।",
    same: true,
  },
  {
    en: "We tested the app on old phones.",
    bn: "আমরা পুরোনো ফোনে অ্যাপটি পরীক্ষা করেছি।",
    same: true,
  },
  {
    en: "It will rain tomorrow.",
    bn: "আজ খুব রোদ উঠেছে।",
    same: false,
    why: "The English is about rain tomorrow; the Bangla says it is very sunny today.",
  },
  {
    en: "Our team built a mobile app.",
    bn: "আমাদের দল একটি ওয়েবসাইট বিক্রি করেছে।",
    same: false,
    why: "Close, but the app was built, not sold, and it isn't a website.",
  },
  {
    en: "He reads before sleeping.",
    bn: "সে ঘুমানোর আগে গান শোনে।",
    same: false,
    why: "Close, but he reads in English and listens to music (গান শোনে) in Bangla.",
  },
  {
    en: "The library opens at nine.",
    bn: "গ্রন্থাগার নয়টায় বন্ধ হয়।",
    same: false,
    why: "Close, but one opens at nine and the other closes (বন্ধ হয়).",
  },
  {
    en: "She passed the exam.",
    bn: "তিনি পরীক্ষায় অকৃতকার্য হয়েছেন।",
    same: false,
    why: "Same setting, but passed and failed (অকৃতকার্য) are opposites.",
  },
  {
    en: "The bus was early today.",
    bn: "বাস আজ দেরিতে এসেছে।",
    same: false,
    why: "Early in English, late (দেরিতে) in Bangla.",
  },
  {
    en: "Please submit the report by Friday.",
    bn: "অনুগ্রহ করে শুক্রবারের পরে প্রতিবেদন জমা দিন।",
    same: false,
    why: "By Friday is a deadline; after Friday (পরে) is the opposite.",
  },
  {
    en: "The teacher praised the project.",
    bn: "শিক্ষক প্রকল্পটির সমালোচনা করলেন।",
    same: false,
    why: "Praised in English, criticised (সমালোচনা) in Bangla.",
  },
  {
    en: "We tested the app on old phones.",
    bn: "আমরা নতুন ফোনে অ্যাপটি পরীক্ষা করেছি।",
    same: false,
    why: "Old phones in English, new (নতুন) phones in Bangla.",
  },
  {
    en: "The meeting has been moved to Monday.",
    bn: "সভাটি সোমবার বাতিল করা হয়েছে।",
    same: false,
    why: "Moved to Monday versus cancelled (বাতিল) on Monday.",
  },
];

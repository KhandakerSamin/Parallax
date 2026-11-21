/**
 * English ↔ Bangla word pairs for Parallax Pairs. Edit freely.
 * Before release, have a native Bangla speaker check the list. Avoid transliterated
 * words (e.g. কম্পিউটার): spelling alone would give the match away.
 */
export type WordPair = { en: string; bn: string };

export const WORD_PAIRS: readonly WordPair[] = [
  { en: "Knowledge", bn: "জ্ঞান" },
  { en: "Research", bn: "গবেষণা" },
  { en: "Library", bn: "গ্রন্থাগার" },
  { en: "Teacher", bn: "শিক্ষক" },
  { en: "Student", bn: "শিক্ষার্থী" },
  { en: "Book", bn: "বই" },
  { en: "Question", bn: "প্রশ্ন" },
  { en: "Answer", bn: "উত্তর" },
  { en: "Idea", bn: "ধারণা" },
  { en: "Language", bn: "ভাষা" },
  { en: "Lesson", bn: "পাঠ" },
  { en: "Exam", bn: "পরীক্ষা" },
  { en: "Pen", bn: "কলম" },
  { en: "Paper", bn: "কাগজ" },
  { en: "Wisdom", bn: "প্রজ্ঞা" },
  { en: "Hope", bn: "আশা" },
  { en: "Courage", bn: "সাহস" },
  { en: "Kindness", bn: "দয়া" },
  { en: "Friend", bn: "বন্ধু" },
  { en: "River", bn: "নদী" },
  { en: "Sky", bn: "আকাশ" },
  { en: "Star", bn: "তারা" },
  { en: "Moon", bn: "চাঁদ" },
  { en: "Sun", bn: "সূর্য" },
  { en: "Flower", bn: "ফুল" },
  { en: "Tree", bn: "গাছ" },
  { en: "Rain", bn: "বৃষ্টি" },
  { en: "Light", bn: "আলো" },
  { en: "Time", bn: "সময়" },
  { en: "Dream", bn: "স্বপ্ন" },
  { en: "Journey", bn: "যাত্রা" },
  { en: "Bridge", bn: "সেতু" },
  { en: "Music", bn: "সংগীত" },
  { en: "Freedom", bn: "স্বাধীনতা" },
  { en: "Future", bn: "ভবিষ্যৎ" },
  { en: "Success", bn: "সাফল্য" },
  { en: "Victory", bn: "বিজয়" },
  { en: "Home", bn: "বাড়ি" },
];

/** Shown under the board every couple of matches. */
export const FACTS: readonly string[] = [
  "Parallax matches meaning like this, even when the words look nothing alike.",
  "LaBSE puts a Bangla sentence and its English translation close together.",
  "A high similarity score is a reason to look closer, not a verdict.",
  "Reviewers read the evidence and decide; the score only points to where to look.",
  "The semantic perspective compares meaning, so a translation can still show potential similarity.",
  "DIU cover pages and template text are ignored before any comparison.",
];

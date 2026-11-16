# Demo guide

A 10-minute walkthrough of Parallax for the class presentation. Everything below runs on the live site,
https://parallax-diu.vercel.app. Say it once at the start and once at the end: **Parallax shows potential
similarity for a person to review. It never decides that something is plagiarism.**

## Before the demo

1. Run `RUN-ME.bat` once (database update, API and website deploy), then `MAKE-ADMIN.bat` to make your own
   account a super admin. Both are in `Desktop/Parallax-finish-deploy/`.
2. Open https://parallax-ai-diu.azurewebsites.net/health and check it reports 1,919 reports. The first request
   after a quiet period can take a minute while the model loads; open it 5 minutes before class.
3. Prepare three browser windows (use a private window for each, so the sign-ins do not mix):
   - **Student**: a DIU account with the student role
   - **Reviewer**: a DIU account with the reviewer role (sign up and pick "Reviewer")
   - **Admin**: your own account, after `MAKE-ADMIN.bat`
4. Have one real DIU report PDF ready (any final report). A full PDF takes 2–3 minutes, so start that upload
   first and talk while it runs.

## The walkthrough

| Time | Show | Say |
|---|---|---|
| 0:00 | Homepage | The problem: reports are reworded or translated, so word-matching checkers miss reuse. |
| 1:00 | Student: **Analyze → upload the PDF** | It goes straight to the AI service with a signed ticket and runs as a background job. |
| 1:30 | Student: **Analyze → paste the English text** below | Copy-paste: the **lexical** score is high and the matching sentences are shown side by side. |
| 3:00 | Student: **paste the Bangla text** below | **0% lexical, 100% semantic**: the Bangla translation finds its English source. This is the core idea. |
| 4:30 | The PDF report, once done | Four perspectives per source: lexical, semantic, concept (shared key terms), structure (same heading order). |
| 6:00 | Reviewer: **Reviews** | The queue lists pending reports first. Open one, read the evidence, mark it *cleared* or *needs follow-up* with a note. |
| 7:30 | Student: the same report | The student now sees the reviewer's decision. |
| 8:00 | Admin: **Administration** | Usage numbers, find a person, change a role, deactivate an account. |
| 9:00 | Wrap up | 1,925 DIU reports, four perspectives, Bangla-English, human review. Next: the labelled evaluation. |

## Text to paste

**English (copied text).** From the "Background" of *Restaurant Management System* (DSpace item 8053). The
same sentences also appear in another student's *Food Parlour* report (8051), so two sources come up.

> The system for managing the restaurant business is the restaurant management system. The major goal of creating this system is to assist restaurant managers in running their businesses and to assist customers with online ordering and table reservations. Because many restaurants find it difficult to run their operations, such as client ordering and table reservations, the project is evolving. It is difficult for waiters to preserve accurate customer information while employing manual customer ordering, and customer information may be lost. Benefits & Beneficiaries Restaurant Management System approaches differ based on the type of operation, but all restaurants have one thing in common: they exist to make money. Restaurant management software assists managers in increasing earnings, lowering costs, and providing a superior customer experience. Increased efficiency and reduced mismanagement are two

**Bangla (translated text).** A Bangla translation of the "Data Balance" section of *Enhancing the Prediction
of IL-4 Inducing Peptides* (item 14111). Expected: the IL-4 report is the top source, lexical 0%, semantic about
100%, in under 30 seconds.

> মেশিন লার্নিংয়ে ডেটা ভারসাম্যহীনতা একটি সাধারণ সমস্যা, যার ফলে প্রশিক্ষণ ডেটায় কিছু শ্রেণি উল্লেখযোগ্যভাবে উপেক্ষিত হয় এবং মডেলগুলো সংখ্যাগরিষ্ঠ শ্রেণির দিকে পক্ষপাতদুষ্ট হয়ে পড়ে। সংগ্রহে ৭৪৪টি পেপটাইড রয়েছে যেগুলো IL-4 তৈরি করে না এবং ৯৮৫টি পেপটাইড সিকোয়েন্স রয়েছে যেগুলো IL-4 তৈরি করে, যা একটি উল্লেখযোগ্য ভারসাম্যহীনতা সৃষ্টি করে। এই ভারসাম্যহীনতা দূর করতে আমরা পক্ষপাত কমানোর জন্য ADASYN পদ্ধতি ব্যবহার করি। বণ্টন পরীক্ষা করে ADASYN ওভারস্যাম্পলিং কৌশল সংখ্যালঘু শ্রেণির জন্য কৃত্রিম নমুনা তৈরি করে।

## If something goes wrong

- **"The AI service is starting"** or a long wait on the first try: the service was asleep. Wait a minute and retry.
- **The PDF takes longer than 3 minutes**: keep presenting with the pasted texts; the report appears on the
  dashboard when it finishes.
- **No Reviews or Administration menu**: sign out and in again after `MAKE-ADMIN.bat`.

## Likely questions

- *Is a high score plagiarism?* No. It is potential similarity. Reports on the same project idea can share
  terms and headings; the reviewer reads the evidence and decides.
- *Why does a corpus report match itself at 100%?* Because it is in the library. A new submission is not.
- *How accurate is it?* See [evaluation.md](evaluation.md): in the planted-reuse test the copied source is found
  and its share is estimated closely, and lightly edited copies that word matching misses are still caught by
  the semantic perspective.

---
title: Parallax AI
emoji: 🔍
colorFrom: indigo
colorTo: green
sdk: docker
app_port: 7860
pinned: false
short_description: Multi-perspective similarity for Bangla-English reports
---

# Parallax AI service

The similarity engine behind [Parallax](https://parallax-diu.vercel.app), an SE 331 capstone
project at Daffodil International University.

It compares a report with 307 public DIU Software Engineering reports from four perspectives:
lexical, semantic (LaBSE, including Bangla-English translation), concept and structural. It shows
**potential similarity** with evidence for a person to review, never a verdict.

Analysis needs a ticket from the Parallax backend; `GET /health` is open.
Source: https://github.com/KhandakerSamin/Parallax

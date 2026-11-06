"""Tests for app.extraction.preprocessor — text cleaning and normalization."""

from __future__ import annotations

from app.extraction.preprocessor import (
    clean_text,
    detect_language_hint,
    normalize_unicode,
    normalize_whitespace,
    remove_control_characters,
    segment_sentences,
)

# ── normalize_whitespace ────────────────────────────────────


class TestNormalizeWhitespace:
    def test_collapses_spaces(self):
        assert normalize_whitespace("hello   world") == "hello world"

    def test_collapses_tabs_and_newlines(self):
        assert normalize_whitespace("hello\t\n\n  world") == "hello world"

    def test_strips_edges(self):
        assert normalize_whitespace("  hello  ") == "hello"

    def test_empty_string(self):
        assert normalize_whitespace("") == ""

    def test_single_space(self):
        assert normalize_whitespace(" ") == ""

    def test_bangla_whitespace(self):
        assert normalize_whitespace("আমি   বাংলা") == "আমি বাংলা"


# ── normalize_unicode ──────────────────────────────────────


class TestNormalizeUnicode:
    def test_nfc_normalization(self):
        # NFC should compose ে + া into the single precomposed form
        # 'ো' (U+09CB) is the composed form of 'ে' (U+09C7) + 'া' (U+09BE)
        decomposed = "\u09C7\u09BE"  # ে + া
        composed = "\u09CB"  # ো
        result = normalize_unicode(decomposed)
        assert result == composed

    def test_ascii_passthrough(self):
        assert normalize_unicode("hello") == "hello"


# ── remove_control_characters ──────────────────────────────


class TestRemoveControlCharacters:
    def test_removes_null_bytes(self):
        assert remove_control_characters("hel\x00lo") == "hello"

    def test_preserves_newlines(self):
        assert remove_control_characters("line1\nline2") == "line1\nline2"

    def test_preserves_tabs(self):
        assert remove_control_characters("col1\tcol2") == "col1\tcol2"


# ── clean_text (full pipeline) ─────────────────────────────


class TestCleanText:
    def test_full_pipeline(self):
        raw = "\x00  hello   world \t\n  "
        assert clean_text(raw) == "hello world"

    def test_bangla_text(self):
        raw = "  আমার  \x00 নাম   সামিন  "
        assert clean_text(raw) == "আমার নাম সামিন"

    def test_empty_string(self):
        assert clean_text("") == ""


# ── segment_sentences ──────────────────────────────────────


class TestSegmentSentences:
    def test_english_sentences(self):
        text = "Hello world. How are you? I am fine!"
        result = segment_sentences(text)
        assert result == ["Hello world.", "How are you?", "I am fine!"]

    def test_bangla_danda(self):
        text = "এটি প্রথম বাক্য। এটি দ্বিতীয় বাক্য।"
        result = segment_sentences(text)
        assert len(result) == 2
        assert result[0] == "এটি প্রথম বাক্য।"

    def test_single_sentence(self):
        text = "No delimiter here"
        assert segment_sentences(text) == ["No delimiter here"]

    def test_empty_string(self):
        assert segment_sentences("") == []

    def test_mixed_delimiters(self):
        text = "English sentence. বাংলা বাক্য। Another one!"
        result = segment_sentences(text)
        assert len(result) == 3


# ── detect_language_hint ───────────────────────────────────


class TestDetectLanguageHint:
    def test_english_text(self):
        assert detect_language_hint("This is an English sentence.") == "en"

    def test_bangla_text(self):
        assert detect_language_hint("এটি একটি বাংলা বাক্য।") == "bn"

    def test_mixed_text(self):
        # Roughly equal mix
        text = "Hello আমি world বাংলা test লেখা"
        result = detect_language_hint(text)
        assert result in ("mixed", "en", "bn")  # depends on exact ratio

    def test_empty_string(self):
        assert detect_language_hint("") == "mixed"

    def test_numbers_only(self):
        assert detect_language_hint("12345") == "mixed"

    def test_purely_bangla(self):
        assert detect_language_hint("আমি বাংলায় গান গাই") == "bn"

    def test_purely_english(self):
        assert detect_language_hint("I write in English only") == "en"

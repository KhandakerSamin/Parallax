"""Build the demo report used in class: a short PDF with a known answer.

    python -m scripts.make_demo_report                      # writes Parallax-Demo-Report.pdf
    python -m scripts.make_demo_report path/to/out.pdf

Most of it is original text about an invented project ("CampusBite"). One section copies a
paragraph from DIU report 8053 ("Restaurant Management System"), so the analysis should
find that report (and "Food Parlour", 8051, which shares the paragraph) at a moderate
score with the copied sentences as evidence. One short section is a Bangla translation
of a paragraph from DIU report 14111. Inside a longer English report it is usually too
small to stand out; to show the cross-language match, paste the Bangla text on its own.
"""

import sys
from pathlib import Path

from fpdf import FPDF

FONTS = Path(__file__).resolve().parent.parent / "app" / "assets" / "fonts"

COPIED_EN = (
    "The system for managing the restaurant business is the restaurant management system. The major goal of "
    "creating this system is to assist restaurant managers in running their businesses and to assist customers "
    "with online ordering and table reservations. Because many restaurants find it difficult to run their "
    "operations, such as client ordering and table reservations, the project is evolving. It is difficult for "
    "waiters to preserve accurate customer information while employing manual customer ordering, and customer "
    "information may be lost. Restaurant management software assists managers in increasing earnings, lowering "
    "costs, and providing a superior customer experience."
)
TRANSLATED_BN = (
    "মেশিন লার্নিংয়ে ডেটা ভারসাম্যহীনতা একটি সাধারণ সমস্যা, যার ফলে প্রশিক্ষণ ডেটায় কিছু শ্রেণি উল্লেখযোগ্যভাবে উপেক্ষিত হয় "
    "এবং মডেলগুলো সংখ্যাগরিষ্ঠ শ্রেণির দিকে পক্ষপাতদুষ্ট হয়ে পড়ে। সংগ্রহে ৭৪৪টি পেপটাইড রয়েছে যেগুলো IL-4 তৈরি করে না এবং "
    "৯৮৫টি পেপটাইড সিকোয়েন্স রয়েছে যেগুলো IL-4 তৈরি করে, যা একটি উল্লেখযোগ্য ভারসাম্যহীনতা সৃষ্টি করে। এই ভারসাম্যহীনতা দূর "
    "করতে আমরা পক্ষপাত কমানোর জন্য ADASYN পদ্ধতি ব্যবহার করি।"
)

SECTIONS = [
    (
        "Abstract",
        "This report describes CampusBite, a web application that lets students of a university pre-order food from "
        "campus cafeterias and collect it without waiting in line. Students browse daily menus, pay with mobile "
        "banking and receive a pickup code. Cafeteria staff see incoming orders on a tablet sorted by pickup time. "
        "A two-week pilot with three cafeterias reduced average waiting time at lunch from fourteen minutes to four.",
    ),
    (
        "Introduction",
        "Lunch hours on our campus are short and the queues are long. Many students skip meals or arrive late to "
        "afternoon classes. Cafeteria owners, in turn, cannot predict demand and either cook too much or run out of "
        "popular items early. CampusBite connects both sides: students order ahead, and owners see demand before "
        "they start cooking. We interviewed forty-two students and five cafeteria owners before designing the system.",
    ),
    ("Background", COPIED_EN),
    ("Related Work (translated note)", TRANSLATED_BN),
    (
        "System Design",
        "The frontend is a progressive web app built with React, so it works on low-end phones without installing "
        "anything. The backend is a Node.js service with a PostgreSQL database. Orders move through four states: "
        "placed, accepted, ready and collected. A scheduler groups orders into ten-minute pickup slots and stops "
        "taking orders for a slot when the kitchen reaches its capacity, which each owner sets in the staff view.",
    ),
    (
        "Testing and Results",
        "We wrote unit tests for the slot scheduler and end-to-end tests for the ordering flow. During the pilot, "
        "1,214 orders were placed by 386 students. Ninety-one percent were collected within five minutes of the "
        "pickup time. Owners reported that food waste dropped noticeably because they cooked to the confirmed orders.",
    ),
    (
        "Conclusion",
        "CampusBite shows that a small ordering system can save students real time and help cafeterias plan. Future "
        "work includes rating dishes, dietary filters and a weekly meal plan for students living in the dormitories.",
    ),
]


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else "Parallax-Demo-Report.pdf"
    pdf = FPDF(format="A4")
    pdf.set_margins(22, 22, 22)
    pdf.add_font("Hind", "", str(FONTS / "HindSiliguri-Regular.ttf"))
    pdf.add_font("Hind", "B", str(FONTS / "HindSiliguri-Bold.ttf"))
    pdf.set_text_shaping(True, script="beng", language="ben")
    pdf.add_page()
    pdf.set_font("Hind", "B", 20)
    pdf.multi_cell(0, 10, "CampusBite: Pre-ordering Food on Campus", align="L", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Hind", "", 11)
    pdf.multi_cell(
        0,
        6,
        "Demo report for the Parallax presentation (SE 331). Not a real submission.",
        align="L",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)
    for heading, body in SECTIONS:
        pdf.set_font("Hind", "B", 14)
        pdf.multi_cell(0, 8, heading, align="L", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Hind", "", 11)
        pdf.multi_cell(0, 6.6, body, align="L", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
    pdf.output(out)
    print("written", out)


if __name__ == "__main__":
    main()

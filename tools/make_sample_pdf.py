#!/usr/bin/env python3
"""
Generate a placeholder sample PDF (and a bonuses .zip) used to TEST the
download / delivery flow on thank-you.html.

Dependency-free: builds a valid multi-page PDF by hand and tracks xref offsets.
Re-run any time:  python3 tools/make_sample_pdf.py

Co-work / Candice: replace downloads/the-3-dollar-luxury-candle.pdf with the
real exported ebook before launch. In production, deliver the real file through
your store's gated delivery (Stripe + delivery, Gumroad, etc.), not as a public
static file.
"""
import os
import zipfile

CREAM = "0.984 0.961 0.914"   # page background
INK   = "0.18 0.141 0.098"    # espresso text
HONEY = "0.659 0.455 0.122"   # beeswax gold


def esc(s: str) -> str:
    return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def text(x, y, size, s, font="F1", color=INK):
    return (f"BT {color} rg /{font} {size} Tf {x} {y} Td ({esc(s)}) Tj ET\n")


def rect(x, y, w, h, color):
    return f"{color} rg {x} {y} {w} {h} re f\n"


def page_stream(lines: str) -> str:
    # full-bleed cream background, then content
    return rect(0, 0, 612, 792, CREAM) + lines


def build_pdf(pages_content):
    """pages_content: list of content-stream strings. Returns PDF bytes."""
    objects = []  # list of (obj_bytes_without_number) builders filled below

    n_pages = len(pages_content)
    # Object numbering:
    # 1 = Catalog, 2 = Pages, 3 = Font(Helvetica), 4 = Font(Helvetica-Bold)
    # then for each page: a Page obj and a Contents obj
    catalog = b"<< /Type /Catalog /Pages 2 0 R >>"
    font1 = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    font2 = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"

    page_obj_nums = []
    content_obj_nums = []
    next_num = 5
    for _ in range(n_pages):
        page_obj_nums.append(next_num); next_num += 1
        content_obj_nums.append(next_num); next_num += 1

    kids = " ".join(f"{p} 0 R" for p in page_obj_nums)
    pages = f"<< /Type /Pages /Kids [{kids}] /Count {n_pages} >>".encode()

    # assemble objects in number order
    numbered = {1: catalog, 2: pages, 3: font1, 4: font2}
    for i in range(n_pages):
        pnum = page_obj_nums[i]
        cnum = content_obj_nums[i]
        page = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
            f"/Contents {cnum} 0 R >>"
        ).encode()
        stream = pages_content[i].encode("latin-1")
        content = (b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n"
                   + stream + b"\nendstream")
        numbered[pnum] = page
        numbered[cnum] = content

    total = max(numbered)
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = {}
    for num in range(1, total + 1):
        offsets[num] = len(out)
        out += f"{num} 0 obj\n".encode() + numbered[num] + b"\nendobj\n"

    xref_pos = len(out)
    out += f"xref\n0 {total + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for num in range(1, total + 1):
        out += f"{offsets[num]:010d} 00000 n \n".encode()
    out += (f"trailer\n<< /Size {total + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n").encode()
    return bytes(out)


# ---- compose the sample pages -------------------------------------------------
p1 = page_stream(
    rect(0, 690, 612, 6, HONEY)
    + text(70, 600, 40, "THE $3 LUXURY CANDLE", font="F2", color=INK)
    + text(72, 558, 16, "How to Make Clean, Non-Toxic Soy & Beeswax", color=INK)
    + text(72, 536, 16, "Candles for a Fraction of Retail Cost.", color=INK)
    + text(72, 470, 18, "By Candice.", font="F2", color=HONEY)
    + rect(70, 360, 472, 40, HONEY)
    + text(86, 372, 16, "SAMPLE / PLACEHOLDER COPY - NOT THE FINAL EBOOK", font="F2", color=CREAM)
    + text(72, 300, 12, "This file exists so you can test the purchase and download flow.", color=INK)
    + text(72, 282, 12, "Replace it with the real exported ebook PDF before launch.", color=INK)
    + text(70, 70, 11, "(c) The $3 Luxury Candle - by Candice - For educational purposes only.", color=INK)
)

p2 = page_stream(
    text(70, 700, 26, "This is a placeholder.", font="F2", color=INK)
    + rect(70, 690, 180, 4, HONEY)
    + text(72, 640, 13, "You are looking at the sample PDF wired into the download buttons on", color=INK)
    + text(72, 620, 13, "thank-you.html. It proves the delivery path works end-to-end.", color=INK)
    + text(72, 575, 15, "Before launch:", font="F2", color=HONEY)
    + text(82, 548, 12, "1.  Export the finished ebook as a PDF.", color=INK)
    + text(82, 528, 12, "2.  Replace downloads/the-3-dollar-luxury-candle.pdf with it.", color=INK)
    + text(82, 508, 12, "3.  For real protection, deliver the file through your store's gated", color=INK)
    + text(96, 490, 12, "delivery (Stripe + delivery / Gumroad / Lemon Squeezy), not as a", color=INK)
    + text(96, 472, 12, "public static file anyone could guess.", color=INK)
    + text(70, 70, 11, "Page 2 - sample", color=INK)
)

p3 = page_stream(
    text(70, 700, 26, "What the real book covers", font="F2", color=INK)
    + rect(70, 690, 260, 4, HONEY)
    + text(82, 640, 12, "Part 1  -  Foundations: wax, wicks, fragrance, vessels, starter kit", color=INK)
    + text(82, 616, 12, "Part 2  -  Safety: handling hot wax without burning the house down", color=INK)
    + text(82, 592, 12, "Part 3  -  The Core Method: your first soy candle, step by step", color=INK)
    + text(82, 568, 12, "Part 4  -  Troubleshooting: the complete fix-it matrix", color=INK)
    + text(82, 544, 12, "Part 5  -  Recipes: 20+ signature scent blends", color=INK)
    + text(82, 520, 12, "Part 6  -  From Hobby to Income: pricing, labeling, where to sell", color=INK)
    + text(72, 460, 13, "About 120 pages. About 30,000 words. Made for total beginners.", color=HONEY, font="F2")
    + text(70, 70, 11, "Page 3 - sample", color=INK)
)

pdf_bytes = build_pdf([p1, p2, p3])

here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
downloads = os.path.join(here, "downloads")
os.makedirs(downloads, exist_ok=True)

main_pdf = os.path.join(downloads, "the-3-dollar-luxury-candle.pdf")
with open(main_pdf, "wb") as f:
    f.write(pdf_bytes)
print("wrote", main_pdf, len(pdf_bytes), "bytes")

# A tiny bonus PDF reused inside the bonuses zip
bonus_pdf = build_pdf([page_stream(
    text(70, 700, 26, "Bonus - Sample", font="F2", color=INK)
    + rect(70, 690, 160, 4, HONEY)
    + text(72, 640, 13, "Placeholder for the printable bonuses (recipe cards, wick &", color=INK)
    + text(72, 620, 13, "fragrance cheat sheet, supplier sourcing list).", color=INK)
    + text(72, 590, 13, "Replace with the real bonus files before launch.", color=INK)
)])

bonuses_zip = os.path.join(downloads, "bonuses.zip")
with zipfile.ZipFile(bonuses_zip, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("01-recipe-cards-SAMPLE.pdf", bonus_pdf)
    z.writestr("02-wick-and-fragrance-cheat-sheet-SAMPLE.pdf", bonus_pdf)
    z.writestr("03-supplier-sourcing-list-SAMPLE.pdf", bonus_pdf)
    z.writestr("READ-ME.txt",
               "These are placeholder bonus files to test the download flow.\n"
               "Replace them with the real bonuses before launch.\n")
print("wrote", bonuses_zip, os.path.getsize(bonuses_zip), "bytes")

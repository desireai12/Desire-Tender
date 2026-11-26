import os
import io
from pypdf import PdfReader, PdfWriter

os.makedirs('test-fixtures', exist_ok=True)

def create_valid_pdf(pages_text):
    """
    Creates a fully compliant PDF with pages_text list.
    """
    num_pages = len(pages_text)
    font_id = 3 + 2 * num_pages
    page_ids = [3 + i for i in range(num_pages)]
    content_ids = [3 + num_pages + i for i in range(num_pages)]
    
    offsets = {}
    buf = io.BytesIO()
    
    def write_str(s):
        buf.write(s.encode('latin1'))
        
    write_str("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    
    # 1: Catalog
    offsets[1] = buf.tell()
    write_str("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    
    # 2: Pages
    offsets[2] = buf.tell()
    kids_str = " ".join(f"{pid} 0 R" for pid in page_ids)
    write_str(f"2 0 obj\n<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>\nendobj\n")
    
    # Page objects
    for i in range(num_pages):
        pid = page_ids[i]
        cid = content_ids[i]
        offsets[pid] = buf.tell()
        write_str(f"{pid} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {cid} 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> >>\nendobj\n")
        
    # Content objects
    for i in range(num_pages):
        cid = content_ids[i]
        text_lines = pages_text[i]
        stream_parts = ["BT\n/F1 11 Tf\n40 730 Td\n16 TL\n"]
        for line in text_lines:
            escaped = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
            stream_parts.append(f"({escaped}) '\n")
        stream_parts.append("ET\n")
        stream_bytes = "".join(stream_parts).encode('latin1', errors='replace')
        
        offsets[cid] = buf.tell()
        write_str(f"{cid} 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n")
        buf.write(stream_bytes)
        write_str("\nendstream\nendobj\n")
        
    # Font object
    offsets[font_id] = buf.tell()
    write_str(f"{font_id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    
    # xref
    xref_offset = buf.tell()
    total_objects = font_id + 1
    write_str(f"xref\n0 {total_objects}\n")
    write_str("0000000000 65535 f \n")
    for oid in range(1, total_objects):
        write_str(f"{offsets[oid]:010d} 00000 n \n")
        
    write_str(f"trailer\n<< /Size {total_objects} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n")
    
    pdf_bytes = buf.getvalue()
    # Verify with pypdf
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) == num_pages, f"Expected {num_pages} pages, got {len(reader.pages)}"
    return pdf_bytes

# 1. Text-based PDF (2 pages)
pdf1 = create_valid_pdf([
    [
        "NOTICE INVITING TENDER NO: NIT-TEXT-01",
        "Tender Name: Water Supply Augmentation Scheme",
        "CRITICAL ELIGIBILITY AND QUALIFICATION CRITERIA:",
        "",
        "1. FINANCIAL CRITERIA:",
        "Clause 1.1: The bidder must have an Average Annual Financial Turnover of not less than Rs. 35.00 Cr",
        "in the last 3 financial years (2021-22, 2022-23, 2023-24).",
        "Clause 1.2: Minimum Solvency Certificate of Rs. 10.00 Cr from a scheduled nationalized bank.",
        "",
        "2. TECHNICAL CRITERIA:",
        "Clause 2.1: The bidder must have successfully completed similar works during the last 7 years:",
        "One similar work of value not less than Rs. 28.00 Cr (80% of tender value), OR",
        "Two similar works of value not less than Rs. 17.50 Cr each (50% of tender value).",
        "Similar work defined as: Laying and commissioning of DI/MS drinking water transmission pipelines."
    ],
    [
        "NIT-TEXT-01 (Continued - Page 2)",
        "3. OTHER MANDATORY CRITERIA:",
        "Clause 3.1: Valid Class AA Contractor Registration with Public Works Department.",
        "Clause 3.2: Valid Electrical Contractor License issued by Licensing Board.",
        "Clause 3.3: The bidder or any consortium member must not be blacklisted or debarred",
        "by any State/Central Government Department as on date of bid submission.",
        "",
        "4. JOINT VENTURE RULES:",
        "Clause 4.1: Lead Partner must meet at least 50% of technical and financial requirements.",
        "Other Partner must meet at least 25% of technical and financial requirements.",
        "Technical experience of partners shall be evaluated separately."
    ]
])
with open('test-fixtures/1_text_based.pdf', 'wb') as f:
    f.write(pdf1)
print("Saved test-fixtures/1_text_based.pdf, size:", len(pdf1))

# 2. Scanned / Degraded PDF (with low quality markers)
pdf2 = create_valid_pdf([
    [
        "--- SCAN ARTIFACTS / ILLEGIBLE PHOTOCOPY HEADER ---",
        "[DEGRADED LOW-CONTRAST SCAN - PAGE UNREADABLE - NO EMBEDDED TEXT]",
        "~~;;!!..::xxXX$$$###  @@@@@@@@@@  %%%^^^^",
        "NOTICE INVITING TENDER (POOR SCAN COPY - RESOLUTION < 75 DPI)",
        "Cla...se ..1: Tu...over ... Rs. [ILLEGIBLE BLURRED NUMERALS]",
        "W...rk Exp...ence: [WATERMARK OVERLAY MASKING CRITERIA TABLE]",
        "--- END OF SCANNED FRAGMENT ---"
    ]
])
with open('test-fixtures/2_scanned_degraded.pdf', 'wb') as f:
    f.write(pdf2)
print("Saved test-fixtures/2_scanned_degraded.pdf, size:", len(pdf2))

# 3. Tables PDF
pdf3 = create_valid_pdf([
    [
        "TENDER SPECIFICATION - SECTION III: QUALIFICATION REQUIREMENTS",
        "TABLE 3.1: FINANCIAL TURNOVER AND NET WORTH CRITERIA",
        "--------------------------------------------------------------------------------",
        "| Sl. No. | Parameter Name      | Required Value (INR) | Assessment Method    |",
        "--------------------------------------------------------------------------------",
        "| 1       | Annual Turnover     | Rs. 60.00 Cr         | Average of 3 years   |",
        "| 2       | Minimum Net Worth   | Rs. 15.00 Cr         | Latest audited FY    |",
        "| 3       | Working Capital     | Rs. 8.00 Cr          | Liquid assets line   |",
        "--------------------------------------------------------------------------------",
        "",
        "TABLE 3.2: SIMILAR WORK EXPERIENCE CRITERIA",
        "--------------------------------------------------------------------------------",
        "| Option  | Description of Work              | Min Value (INR) | Completion    |",
        "--------------------------------------------------------------------------------",
        "| Opt-A   | One Single Completed Water Line  | Rs. 48.00 Cr    | Last 7 Years  |",
        "| Opt-B   | Two Completed Water Lines Each   | Rs. 30.00 Cr    | Last 7 Years  |",
        "| Opt-C   | Three Completed Water Lines Each | Rs. 24.00 Cr    | Last 7 Years  |",
        "--------------------------------------------------------------------------------"
    ]
])
with open('test-fixtures/3_tables.pdf', 'wb') as f:
    f.write(pdf3)
print("Saved test-fixtures/3_tables.pdf, size:", len(pdf3))

# 4. Multi-page Sample (20 pages to test 15-page sequential batching + 2-page overlap)
pages20 = []
for p in range(1, 21):
    lines = [f"PROJECT TENDER DOCUMENT - SECTION {p} (Page {p} of 20)"]
    if p == 3:
        lines.extend([
            "PRE-QUALIFICATION NOTICE:",
            "Clause 3.1: Minimum Average Annual Turnover of Rs. 45.00 Cr in last 3 years.",
            "Clause 3.2: Bid capacity must exceed Rs. 50.00 Cr calculated as per formula."
        ])
    elif p == 7:
        lines.extend([
            "TECHNICAL CAPACITY:",
            "Clause 7.1: Successfully completed 1 water intake structure of Rs. 20.00 Cr.",
            "Clause 7.2: Minimum 5 years experience in pipeline maintenance."
        ])
    elif p == 14: # Overlap page in Batch 0 and Batch 1!
        lines.extend([
            "JOINT VENTURE AND CONSORTIUM ELIGIBILITY (Page 14):",
            "Clause 14.1: Maximum number of partners in JV shall be 2.",
            "Clause 14.2: Lead partner must hold minimum 51% equity and technical capacity.",
            "Clause 14.3: Partner must hold minimum 26% equity and technical capacity."
        ])
    elif p == 15: # Overlap page in Batch 0 and Batch 1!
        lines.extend([
            "JV CRITERIA CONTINUED (Page 15):",
            "Clause 15.1: Combined financial turnover of JV partners will be pooled.",
            "Clause 15.2: Non-lead partner must independently fulfill statutory registrations."
        ])
    elif p == 18: # Page in Batch 1 (14-20)
        lines.extend([
            "STATUTORY AND OTHER LICENSES (Page 18):",
            "Clause 18.1: Valid GST Registration and PAN card are mandatory.",
            "Clause 18.2: Labour license under Contract Labour Act 1970."
        ])
    else:
        lines.extend([
            "General project specifications and standard administrative guidelines.",
            f"This is descriptive project detail text on page {p}."
        ])
    pages20.append(lines)

pdf4 = create_valid_pdf(pages20)
with open('test-fixtures/4_multipage_sample.pdf', 'wb') as f:
    f.write(pdf4)
print("Saved test-fixtures/4_multipage_sample.pdf, size:", len(pdf4))

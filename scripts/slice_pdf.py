import sys
import io
import json
from pypdf import PdfReader, PdfWriter

def slice_pdf(input_path_or_bytes, start_page, end_page):
    """
    Slices pages [start_page, end_page] (1-indexed inclusive) from a PDF.
    Returns bytes of the sliced sub-PDF.
    """
    if isinstance(input_path_or_bytes, (bytes, bytearray)):
        reader = PdfReader(io.BytesIO(input_path_or_bytes))
    else:
        reader = PdfReader(input_path_or_bytes)
        
    total = len(reader.pages)
    start_idx = max(0, start_page - 1)
    end_idx = min(total - 1, end_page - 1)
    
    writer = PdfWriter()
    for idx in range(start_idx, end_idx + 1):
        writer.add_page(reader.pages[idx])
        
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()

if __name__ == "__main__":
    if len(sys.argv) > 3:
        input_pdf = sys.argv[1]
        s_page = int(sys.argv[2])
        e_page = int(sys.argv[3])
        sliced = slice_pdf(input_pdf, s_page, e_page)
        reader = PdfReader(io.BytesIO(sliced))
        print(f"Original: {input_pdf}")
        print(f"Slice ({s_page}-{e_page}) pages count: {len(reader.pages)}")
        print(f"Slice size: {len(sliced)} bytes")


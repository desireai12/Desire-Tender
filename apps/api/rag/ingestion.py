import io
import fitz  # PyMuPDF
from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class DocumentIngestion:
    """
    Service for extracting text from uploaded PDFs, chunking content using an
    overlapping chunk strategy, and embedding custom metadata.
    """

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""],
        )

    def extract_text_from_pdf(self, pdf_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """
        Extract page-by-page text from PDF binary data using PyMuPDF.
        """
        pages_content = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():
                pages_content.append({
                    "page_number": page_num + 1,
                    "text": text,
                    "filename": filename
                })

        doc.close()
        return pages_content

    def process_document(
        self,
        pdf_bytes: bytes,
        filename: str,
        doc_type: str,
        additional_metadata: Dict[str, Any] = None
    ) -> List[Document]:
        """
        Extracts, chunks, and creates LangChain Document objects ready for vector indexing.
        """
        raw_pages = self.extract_text_from_pdf(pdf_bytes, filename)
        documents = []

        base_meta = additional_metadata or {}
        base_meta.update({
            "source": filename,
            "doc_type": doc_type,
        })

        for page in raw_pages:
            chunks = self.text_splitter.split_text(page["text"])
            for idx, chunk_text in enumerate(chunks):
                meta = {
                    **base_meta,
                    "page": page["page_number"],
                    "chunk_id": f"{filename}-p{page['page_number']}-c{idx+1}",
                }
                documents.append(Document(page_content=chunk_text, metadata=meta))

        return documents

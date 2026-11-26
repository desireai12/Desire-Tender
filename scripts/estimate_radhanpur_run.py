import os
from pypdf import PdfReader

pdf_path = os.path.abspath('golden/radhanpur_rwss.pdf')
reader = PdfReader(pdf_path)
total_pages = len(reader.pages)
file_size_bytes = os.path.getsize(pdf_path)

batch_size = 15
overlap = 2
step = batch_size - overlap # 13

batches = []
start = 1
b_idx = 0
while start <= total_pages:
    end = min(start + batch_size - 1, total_pages)
    overlap_pages = []
    if b_idx > 0:
        prev_end = batches[b_idx - 1]['end']
        overlap_pages = list(range(start, min(prev_end, end) + 1))
    batches.append({
        'batch_index': b_idx,
        'start': start,
        'end': end,
        'page_count': end - start + 1,
        'overlap_pages': overlap_pages
    })
    if end >= total_pages:
        break
    start += step
    b_idx += 1

total_page_impressions = sum(b['page_count'] for b in batches)

# Revised Pricing Rates (Official Standard Rates)
# Input: $0.30 per 1M tokens
# Output (including thinking tokens): $2.50 per 1M tokens
INPUT_RATE_PER_M = 0.30
OUTPUT_RATE_PER_M = 2.50

# Tokens Breakdown
# Image modality: 520 tokens/page
# Prompt text + schema: ~500 tokens/batch
image_tokens_base = total_page_impressions * 520
text_prompt_tokens_base = len(batches) * 500
prompt_tokens_base = image_tokens_base + text_prompt_tokens_base

# Output candidate tokens: ~2,000 - 2,500 tokens/batch
# Thinking tokens allowance: up to 500 tokens/batch
output_tokens_base = len(batches) * 2500
thinking_tokens_base = len(batches) * 500
total_output_tokens_base = output_tokens_base + thinking_tokens_base

prompt_cost_base = (prompt_tokens_base / 1_000_000) * INPUT_RATE_PER_M
output_cost_base = (total_output_tokens_base / 1_000_000) * OUTPUT_RATE_PER_M
total_cost_base = prompt_cost_base + output_cost_base

# Retry Buffer (assuming 3 retried/failed attempts across the run)
retry_attempts = 3
retry_prompt_tokens = retry_attempts * 8300
retry_output_tokens = retry_attempts * 1000
retry_cost = ((retry_prompt_tokens / 1_000_000) * INPUT_RATE_PER_M) + ((retry_output_tokens / 1_000_000) * OUTPUT_RATE_PER_M)

total_estimated_max_cost = total_cost_base + retry_cost
proposed_spending_cap = 0.25 # USD

print(f"File: {pdf_path}")
print(f"File Size: {file_size_bytes / (1024*1024):.2f} MB | Total Pages: {total_pages}")
print(f"Batch Plan: {len(batches)} batches | Total Page Impressions: {total_page_impressions}")
print("\n--- REVISED PRICING & COST BREAKDOWN ---")
print(f"Standard Rates: Input = ${INPUT_RATE_PER_M}/1M | Output & Thinking = ${OUTPUT_RATE_PER_M}/1M")
print(f"Base Prompt Tokens    : ~{prompt_tokens_base:,} tokens (Cost: ${prompt_cost_base:.5f})")
print(f"Base Output Tokens    : ~{output_tokens_base:,} tokens")
print(f"Base Thinking Tokens  : ~{thinking_tokens_base:,} tokens")
print(f"Total Output+Thinking : ~{total_output_tokens_base:,} tokens (Cost: ${output_cost_base:.5f})")
print(f"Base 14-Batch Cost    : ${total_cost_base:.5f} USD")
print(f"Retry Buffer (3 calls): ${retry_cost:.5f} USD (Prompt: ~{retry_prompt_tokens:,}, Output: ~{retry_output_tokens:,})")
print(f"Total Max Estimate    : ${total_estimated_max_cost:.5f} USD (~₹{total_estimated_max_cost * 87:.2f} INR)")
print(f"Proposed Spending Cap : ${proposed_spending_cap:.2f} USD (~₹{proposed_spending_cap * 87:.2f} INR)")

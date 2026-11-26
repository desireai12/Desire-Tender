"""
DESIRE TENDER — STAGE 2A TEST ORCHESTRATOR
Compiles TypeScript test runner and executes the 4-stage Gemini Vision test sequence:
1. Small text-based PDF
2. Scanned / degraded PDF (OCR fallback)
3. PDF containing tables
4. Multi-page sample (20 pages, 15-page batches, 2-page overlap, deduplication, original page preservation)
5. Stage 1 Safeguards confirmation (5-state absence logic & ambiguous JV rejection)
"""

import sys
import os
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LIB_DIR = os.path.join(ROOT_DIR, 'apps', 'web', 'src', 'lib', 'new-eligibility')

# Locate node binary
NODE_BIN = None
candidate_node_paths = [
    os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright-go\1.57.0\node.exe"),
    r"C:\Program Files\nodejs\node.exe",
    r"C:\Program Files (x86)\nodejs\node.exe",
]
for p in candidate_node_paths:
    if os.path.exists(p):
        NODE_BIN = p
        break

if not NODE_BIN:
    try:
        out = subprocess.check_output(["where.exe", "node"], text=True)
        NODE_BIN = out.strip().splitlines()[0]
    except Exception:
        NODE_BIN = "node"

TSC_BIN = os.path.join(ROOT_DIR, 'apps', 'web', 'node_modules', 'typescript', 'bin', 'tsc')
TS_TEST_FILE = os.path.join(ROOT_DIR, 'scripts', 'run-stage2a-tests.ts')
OUT_DIR = os.path.join(ROOT_DIR, 'scripts', 'dist')
RESOLVER_SCRIPT = os.path.join(ROOT_DIR, 'scripts', 'ts-resolver.mjs')
COMPILED_TEST_FILE = os.path.join(OUT_DIR, 'scripts', 'run-stage2a-tests.js')

def run_stage2a_suite():
    print("=" * 80)
    print("   DESIRE TENDER: STAGE 2A TEST SUITE (GEMINI VISION CLIENT)")
    print("=" * 80)
    print(f"[ENVIRONMENT] Node binary : {NODE_BIN}")
    print(f"[ENVIRONMENT] TSC compiler: {TSC_BIN}")
    print(f"[ENVIRONMENT] Test source : {TS_TEST_FILE}")

    # Step 1: Compile TypeScript
    print("\n[STEP 1] Compiling TypeScript files with tsc...")
    compile_cmd = [
        NODE_BIN,
        TSC_BIN,
        TS_TEST_FILE,
        os.path.join(LIB_DIR, 'geminiVisionClient.ts'),
        os.path.join(LIB_DIR, 'completenessAuditor.ts'),
        os.path.join(LIB_DIR, 'evaluatorBridge.ts'),
        "--outDir", OUT_DIR,
        "--target", "es2022",
        "--module", "NodeNext",
        "--moduleResolution", "NodeNext",
        "--skipLibCheck",
        "--esModuleInterop"
    ]

    res = subprocess.run(compile_cmd, cwd=ROOT_DIR, capture_output=True, text=True)
    if res.returncode != 0:
        print("[TSC ERROR] Compilation failed:")
        print(res.stdout)
        print(res.stderr)
        sys.exit(1)
    print("  -> TypeScript compilation successful (0 errors).")

    # Step 2: Run tests with Node
    print("\n[STEP 2] Executing Stage 2A test suite via Node.js...")
    run_cmd = [
        NODE_BIN,
        "--experimental-loader",
        f"file:///{RESOLVER_SCRIPT.replace('\\', '/')}",
        COMPILED_TEST_FILE
    ]

    env = os.environ.copy()
    proc = subprocess.run(run_cmd, cwd=ROOT_DIR, env=env)
    if proc.returncode != 0:
        print(f"\n[FAILED] Stage 2A tests failed with returncode {proc.returncode}")
        sys.exit(proc.returncode)

    print("\n[SUCCESS] Stage 2A test suite completed successfully!")

if __name__ == '__main__':
    run_stage2a_suite()


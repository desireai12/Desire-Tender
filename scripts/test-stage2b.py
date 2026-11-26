"""
DESIRE TENDER — STAGE 2B TEST ORCHESTRATOR
Compiles scripts/test-stage2b-corrections.ts with tsc and executes the 10-test suite.
"""

import sys
import os
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LIB_DIR = os.path.join(ROOT_DIR, 'apps', 'web', 'src', 'lib', 'new-eligibility')

candidate_node_paths = [
    os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright-go\1.57.0\node.exe"),
    r"C:\Program Files\nodejs\node.exe",
    r"C:\Program Files (x86)\nodejs\node.exe",
]
NODE_BIN = None
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
TS_TEST_FILE = os.path.join(ROOT_DIR, 'scripts', 'test-stage2b-corrections.ts')
OUT_DIR = os.path.join(ROOT_DIR, 'scripts', 'dist')
RESOLVER_SCRIPT = os.path.join(ROOT_DIR, 'scripts', 'ts-resolver.mjs')
COMPILED_TEST_FILE = os.path.join(OUT_DIR, 'scripts', 'test-stage2b-corrections.js')

def run_suite():
    print("=" * 80)
    print("   DESIRE TENDER: STAGE 2B FINAL CORRECTIONS TEST SUITE")
    print("=" * 80)
    print(f"Node binary : {NODE_BIN}")
    print(f"TSC binary  : {TSC_BIN}")
    print(f"Root dir    : {ROOT_DIR}")

    # Step 1: Compile TypeScript
    print("\n[STEP 1] Compiling TypeScript files with tsc...")
    compile_cmd = [
        NODE_BIN,
        TSC_BIN,
        TS_TEST_FILE,
        os.path.join(LIB_DIR, 'radhanpurEvaluationRules.ts'),
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
    print("\n[STEP 2] Executing Stage 2B test suite via Node.js...")
    run_cmd = [
        NODE_BIN,
        "--experimental-loader",
        f"file:///{RESOLVER_SCRIPT.replace('\\', '/')}",
        COMPILED_TEST_FILE
    ]

    proc = subprocess.run(run_cmd, cwd=ROOT_DIR)
    if proc.returncode != 0:
        print(f"\n[FAILED] Stage 2B tests failed with code {proc.returncode}")
        sys.exit(proc.returncode)

    print("\n[SUCCESS] All Stage 2B tests passed successfully!")

if __name__ == '__main__':
    run_suite()


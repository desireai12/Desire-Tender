#!/usr/bin/env python3
"""
DESIRE TENDER — PHASE 4A MASTER VALIDATION HARNESS
Runs preflight checks, compiles and executes TypeScript test suite,
and asserts zero regressions and complete file immutability.
"""

import os
import sys
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
TS_TEST_FILE = os.path.join(ROOT_DIR, 'scripts', 'test-stage4a-schema.ts')
OUT_DIR = os.path.join(ROOT_DIR, 'scripts', 'dist')
RESOLVER_SCRIPT = os.path.join(ROOT_DIR, 'scripts', 'ts-resolver.mjs')
COMPILED_TEST_FILE = os.path.join(OUT_DIR, 'scripts', 'test-stage4a-schema.js')

def run_suite():
    print("=" * 80)
    print("   DESIRE TENDER: PHASE 4A SCHEMA & PERSISTENCE VALIDATION SUITE")
    print("=" * 80)
    print(f"Node binary : {NODE_BIN}")
    print(f"TSC binary  : {TSC_BIN}")
    print(f"Root dir    : {ROOT_DIR}")

    # Step 1: Run Database Preflight Check
    print("\n[STEP 1] Running Database Preflight & Static Safety Check...")
    preflight_script = os.path.join(ROOT_DIR, 'scripts', 'database_preflight_check.py')
    res = subprocess.run([sys.executable, preflight_script], cwd=ROOT_DIR)
    if res.returncode != 0:
        print("[CRITICAL ERROR] Preflight check failed! Halting.")
        sys.exit(1)

    # Step 2: Compile TypeScript
    print("\n[STEP 2] Compiling TypeScript files with tsc...")
    compile_cmd = [
        NODE_BIN,
        TSC_BIN,
        TS_TEST_FILE,
        os.path.join(LIB_DIR, 'dbTypes.ts'),
        os.path.join(LIB_DIR, 'datasetFinalizationGate.ts'),
        os.path.join(LIB_DIR, 'proposalManager.ts'),
        os.path.join(LIB_DIR, 'billingSafeguards.ts'),
        os.path.join(LIB_DIR, 'databaseEnvironmentGuard.ts'),
        os.path.join(LIB_DIR, 'evaluationReportRenderer.ts'),
        os.path.join(LIB_DIR, 'companyMaster.ts'),
        os.path.join(LIB_DIR, 'tenderRuleAdapter.ts'),
        os.path.join(LIB_DIR, 'adapters', 'radhanpurAdapter.ts'),
        os.path.join(LIB_DIR, 'deterministicEvaluator.ts'),
        os.path.join(LIB_DIR, 'evaluationReportGenerator.ts'),
        os.path.join(LIB_DIR, 'radhanpurEvaluationRules.ts'),
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

    # Step 3: Run tests with Node
    print("\n[STEP 3] Executing Phase 4A test suite via Node.js...")
    run_cmd = [
        NODE_BIN,
        "--experimental-loader",
        f"file:///{RESOLVER_SCRIPT.replace('\\', '/')}",
        COMPILED_TEST_FILE
    ]

    proc = subprocess.run(run_cmd, cwd=ROOT_DIR)
    if proc.returncode != 0:
        print(f"\n[FAILED] Phase 4A tests failed with code {proc.returncode}")
        sys.exit(proc.returncode)

    print("\n[SUCCESS] All Phase 4A tests and safety validations passed successfully!")

if __name__ == '__main__':
    run_suite()

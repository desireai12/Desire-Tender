"""
DESIRE TENDER — RADHANPUR RWSS EXTRACTION RUNNER
Compiles scripts/run_radhanpur_extraction.ts and executes it inside the worktree
under the strict Free-Tier Only policy (payable cost = $0.00).
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
TS_RUNNER = os.path.join(ROOT_DIR, 'scripts', 'run_radhanpur_extraction.ts')
OUT_DIR = os.path.join(ROOT_DIR, 'scripts', 'dist')
RESOLVER_SCRIPT = os.path.join(ROOT_DIR, 'scripts', 'ts-resolver.mjs')
COMPILED_FILE = os.path.join(OUT_DIR, 'scripts', 'run_radhanpur_extraction.js')

def main():
    print("=" * 80)
    print("   DESIRE TENDER: 175-PAGE RADHANPUR EXTRACTION COMPILATION & RUNNER")
    print("=" * 80)
    print(f"Node binary : {NODE_BIN}")
    print(f"TSC binary  : {TSC_BIN}")
    print(f"Worktree    : {ROOT_DIR}")

    # Compile with tsc
    print("\n[STEP 1] Compiling run_radhanpur_extraction.ts with tsc...")
    compile_cmd = [
        NODE_BIN,
        TSC_BIN,
        TS_RUNNER,
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
    print("  -> Compilation successful (0 errors).")

    # Run with Node
    print("\n[STEP 2] Executing extraction runner via Node.js...")
    run_cmd = [
        NODE_BIN,
        "--experimental-loader",
        f"file:///{RESOLVER_SCRIPT.replace('\\', '/')}",
        COMPILED_FILE
    ]

    proc = subprocess.run(run_cmd, cwd=ROOT_DIR)
    if proc.returncode != 0:
        print(f"\n[RUNNER FAILED] Exit code: {proc.returncode}")
        sys.exit(proc.returncode)

    print("\n[RUNNER COMPLETED SUCCESSFULLY]")

if __name__ == '__main__':
    main()


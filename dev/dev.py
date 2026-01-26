#!/usr/bin/env python3

import sys

# check python version
if sys.version_info[0] < 3:
    print("ERROR: This script must be run with Python 3!")
    sys.exit(-1)

import argparse
import venv
import re
from os import makedirs, environ, remove, symlink
from os.path import join, isdir, isfile, abspath, dirname, exists
from subprocess import run, Popen
from shutil import copyfile, copytree, rmtree

DEV_DIR = abspath(dirname(__file__))
ROOT_DIR = dirname(DEV_DIR)
ROOT_VENV_DIR = join(ROOT_DIR, ".venv")

DB_SCHEMA_DIR = join(ROOT_DIR, "database")
DATA_SCHEMA_DIR = join(ROOT_DIR, "schema")

BKE_POS_DIR = join(ROOT_DIR, "backend", "positioning")
BKE_POS_VENV_DIR = join(BKE_POS_DIR, ".venv")
BKE_WEB_DIR = join(ROOT_DIR, "backend", "website")
FTE_DIR = join(ROOT_DIR, "frontend")

args: argparse.Namespace

def init():
    if not args.no_positioning:
        print("# Init positioning backend")

        if not args.no_venv:
            print("## Setting up Python virtual environment")
            if sys.version_info[1] < 13:
                print("ERROR: Python virtual environment must be set up with Python 3.13+ to match runtime environment!")
                sys.exit(-1)
            venv.create(BKE_POS_VENV_DIR, clear=False, with_pip=True)

        print("## Installing Python dependencies")
        run_cmd(
            [
                "python" if args.no_venv else join(BKE_POS_VENV_DIR, "bin", "python"),
                "-m", "pip", "install", "-v", "-r", "requirements.txt"
            ],
            cwd=BKE_POS_DIR,
            env=environ if args.no_venv else dict(environ, VIRTUAL_ENV=BKE_POS_VENV_DIR),
        )

        if not args.no_venv and not exists(ROOT_VENV_DIR):
            print("## Link venv to project root")
            symlink(BKE_POS_VENV_DIR, ROOT_VENV_DIR, target_is_directory=True)

    if not args.no_website:
        print("# Init website backend")
        print("## Installing NPM dependencies")
        run_cmd(["npm", "install"], cwd=BKE_WEB_DIR)

    if not args.no_frontend:
        print("# Init frontend")
        print("## Installing NPM dependencies")
        run_cmd(["npm", "install"], cwd=FTE_DIR)

    print("# Initial update of DB schemas")
    update_db_schemas()

    print("# Initial update of data schemas")
    update_json_schemas()


def update_db_schemas():
    # Python
    if not args.no_positioning:
        print("## Updating Python client")
        gen_dir = join(DEV_DIR, "gen", "python")
        if not isdir(gen_dir):
            makedirs(gen_dir)

        gen_schema = join(gen_dir, "schema.prisma")
        with open(gen_schema, "w", encoding="utf-8") as out:
            with open(join(DB_SCHEMA_DIR, "python.prisma"), "r", encoding="utf-8") as header:
                out.write(header.read())
            with open(join(DB_SCHEMA_DIR, "model.prisma"), "r", encoding="utf-8") as model:
                out.write(model.read())

        run_cmd(
            [
                "prisma" if args.no_venv else join(BKE_POS_VENV_DIR, "bin", "prisma"),
                "generate", "--schema=" + gen_schema
            ],
            cwd=gen_dir,
            env=environ if args.no_venv else dict(environ, VIRTUAL_ENV=BKE_POS_VENV_DIR, PATH=join(BKE_POS_VENV_DIR, "bin") + ":" + environ["PATH"]),
        )


    # Node
    if not args.no_website:
        print("## Updating NodeJS client")
        gen_dir = join(DEV_DIR, "gen", "node")
        if not isdir(gen_dir):
            makedirs(gen_dir)

        gen_schema = join(gen_dir, "schema.prisma")
        with open(gen_schema, "w", encoding="utf-8") as out:
            with open(join(ROOT_DIR, "database", "node.prisma"), "r", encoding="utf-8") as header:
                out.write(header.read())
            with open(join(ROOT_DIR, "database", "model.prisma"), "r", encoding="utf-8") as model:
                out.write(model.read())

        tmp_schema = join(BKE_WEB_DIR, "schema.prisma")
        if isfile(tmp_schema):
            remove(tmp_schema)
        copyfile(gen_schema, tmp_schema)

        run_cmd(["npx", "prisma", "generate"], cwd=BKE_WEB_DIR)

        remove(tmp_schema)


def update_json_schemas():
    # Python
    if not args.no_positioning:
        print("## Updating Python data schemas")
        run_cmd(
            [
                "datamodel-codegen" if args.no_venv else join(BKE_POS_VENV_DIR, "bin", "datamodel-codegen"),
                "--input",
                DATA_SCHEMA_DIR,
                "--input-file-type",
                "jsonschema",
                "--output",
                join(BKE_POS_DIR, "schema_gen"),
                "--formatters",
                "black", "isort",
                "--collapse-root-models",
                "--output-model-type",
                "pydantic_v2.BaseModel",
            ],
            cwd=BKE_POS_DIR,
            env=environ if args.no_venv else dict(environ, VIRTUAL_ENV=BKE_POS_VENV_DIR, PATH=join(BKE_POS_VENV_DIR, "bin") + ":" + environ["PATH"]),
        )

    # TS code
    if not args.no_website:
        print("## Updating TypeScript data schemas for backend")
        run_cmd(["npx", "json2ts", "-i", DATA_SCHEMA_DIR, "-o", join(BKE_WEB_DIR, "schema-gen"), "--cwd", DATA_SCHEMA_DIR, "--enableConstEnums", "true"], cwd=BKE_WEB_DIR)

    if not args.no_frontend:
        print("## Updating TypeScript data schemas for frontend")
        run_cmd(["npx", "json2ts", "-i", DATA_SCHEMA_DIR, "-o", join(FTE_DIR, "schema-gen"), "--cwd", DATA_SCHEMA_DIR, "--enableConstEnums", "true"], cwd=FTE_DIR)


def update_schemas():
    update_db_schemas()
    update_json_schemas()


def start_all():
    print("# Starting database")
    run_cmd(["docker", "compose", "-f", "docker-compose.db.yaml", "up", "-d"], cwd=DEV_DIR)

    print("# Building frontend")
    run_cmd(["npm", "run", "debug-build"], cwd=FTE_DIR)

    print("# Building website backend")
    run_cmd(["npm", "run", "build"], cwd=BKE_WEB_DIR)

    print("# Running server")
    db = pos = web = None
    try:
        # db = Popen(["docker", "compose", "up"], cwd=DEV_DIR)
        pos = Popen(
            ["python", "main.py"],
            cwd=BKE_POS_DIR,
            env=environ if args.no_venv else dict(environ, VIRTUAL_ENV=BKE_POS_VENV_DIR, PATH=join(BKE_POS_VENV_DIR, "bin") + ":" + environ["PATH"]),
        )
        web = Popen(["npm", "run", "start"], cwd=BKE_WEB_DIR)

        # Wait for any to block
        pos.wait()
        web.wait()
    except KeyboardInterrupt as ki:
        if db:
            db.terminate()
        if pos:
            pos.terminate()
        if web:
            web.terminate()
        raise ki


def deploy_android():
    print("# Building frontend")
    run_cmd(["npm", "run", "debug-build"], cwd=FTE_DIR)

    print("# Syncing Android code")
    run_cmd(["npx", "cap", "sync"], cwd=FTE_DIR)

    print("# Generating APK")
    run_cmd(["npx", "cap", "build", "android"], cwd=FTE_DIR)


def db_migrate():
    gen_dir = join(DEV_DIR, "gen", "python")
    migrations_dir = join(gen_dir, "migrations")

    # Ensure precondition
    print("# Updating schema")
    update_db_schemas()

    print("# Creating DB migration")

    # Clear generated files
    if isdir(migrations_dir):
        rmtree(migrations_dir)

    # Copy migration rules
    copytree(join(DB_SCHEMA_DIR, "migrations"), migrations_dir, dirs_exist_ok=True)

    # Apply developer env
    try:
        from dotenv import load_dotenv # pylint: disable=import-outside-toplevel
        load_dotenv(dotenv_path=join(DEV_DIR, ".env"))
    except ModuleNotFoundError:
        print("Error: Python module dotenv not found, please run this script in the virtual environment setup by this script.")

    # Generate
    print("## Generating migration file")
    run_cmd(
        [
            "prisma" if args.no_venv else join(BKE_POS_VENV_DIR, "bin", "prisma"),
            "migrate", "dev"
        ],
        cwd=gen_dir,
        env=environ if args.no_venv else dict(environ, VIRTUAL_ENV=BKE_POS_VENV_DIR, PATH=join(BKE_POS_VENV_DIR, "bin") + ":" + environ["PATH"]),
    )

    # Copy result
    print("## Copy new migration")
    copytree(migrations_dir, join(DB_SCHEMA_DIR, "migrations"), dirs_exist_ok=True)

def set_versions():
    version = None
    while not version:
        version = input("Enter new version (e.g., 1.2.0): ").strip()
        if not version or re.match(r"^\d+\.\d+\.\d+$", version) is None:
            print("Invalid version format. Please use semantic versioning (e.g., x.x.x)!")
            version = None

    print("# Update frontend package version")
    run_cmd(["npm", "--no-git-tag-version", "version", version], cwd=FTE_DIR)

    print("# Update website backend package version")
    run_cmd(["npm", "--no-git-tag-version", "version", version], cwd=BKE_WEB_DIR)

    print("# Update positioning backend version")
    version_file = join(BKE_POS_DIR, "version.py")
    with open(version_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
    with open(version_file, "w", encoding="utf-8") as vf:
        for line in lines:
            if line.strip().startswith("__version__"):
                vf.write(f'__version__ = "{version}"\n')
            else:
                vf.write(line)

### Util ###

def run_cmd(cmd, check=True, **kwargs):
    print(">> Running:", *cmd)
    ps = run(cmd, stdout=sys.stdout, stderr=sys.stderr, **kwargs)
    if ps.returncode != 0:
        print("Command returned non-zero exit status", ps.returncode)
        if check:
            print("Error!")
            sys.exit(-2)

#########################################################################

ACTIONS = {
    "init": init,
    "update-db": update_db_schemas,
    "update-data": update_json_schemas,
    "update": update_schemas,
    "start": start_all,
    "deploy-android": deploy_android,
    "migrate": db_migrate,
    "update-versions": set_versions,
}

if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(description="Script to handle development tasks in the project.")
    arg_parser.add_argument("-v", "--verbose", action="store_true", help="increase output verbosity")
    arg_parser.add_argument("--no-positioning", action="store_true", help="deactivate positioning backend generation")
    arg_parser.add_argument("--no-website", action="store_true", help="deactivate website backend generation")
    arg_parser.add_argument("--no-frontend", action="store_true", help="deactivate frontend generation")
    arg_parser.add_argument("--no-venv", action="store_true", help="deactivate using Python virtual environment")
    arg_parser.add_argument("actions", nargs="+", choices=ACTIONS.keys(), help="the action(s) to perform")

    # Parse
    args = arg_parser.parse_args()

    try:
        for a in set(args.actions):
            ACTIONS[a]()
    except KeyboardInterrupt:
        sys.exit(0)

#!/usr/bin/env bash
set -e

alembic upgrade head
python -m scripts.seed_initial_data

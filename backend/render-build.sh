#!/usr/bin/env bash
set -o errexit  # Exit immediately if a command exits with a non-zero status

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Collect static files
python backend/manage.py collectstatic --noinput

# Apply migrations
python backend/manage.py migrate --noinput

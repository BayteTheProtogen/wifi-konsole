#!/bin/bash

# Exit on error
set -e

echo "Ensuring required system packages are installed..."
# Install dependencies using pacman (Arch/CachyOS)
# Note: This will prompt for sudo password if not run as root.
sudo pacman -S --needed --noconfirm wmctrl xorg-xprop xdotool python

echo "Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing Python dependencies..."
pip install pynput

echo "Starting Fullscreen Cycler..."
python cycler.py

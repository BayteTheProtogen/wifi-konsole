#!/bin/bash

# Exit on error
set -e

echo "Ensuring required system packages are installed..."
# Install dependencies using pacman (Arch/CachyOS)
# Note: This will prompt for sudo password if not run as root.
sudo pacman -S --needed --noconfirm wmctrl xorg-xprop xdotool python

echo "Starting Fullscreen Cycler..."
python3 cycler.py

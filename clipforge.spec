# -*- mode: python ; coding: utf-8 -*-

import os
import sys

from PyInstaller.utils.hooks import collect_all

yt_dlp_datas, yt_dlp_binaries, yt_dlp_hiddenimports = collect_all('yt_dlp')
ctk_datas, ctk_binaries, ctk_hiddenimports = collect_all('customtkinter')
ff_datas, ff_binaries, ff_hiddenimports = collect_all('imageio_ffmpeg')

# Per-platform icon bundling:
#   - icon.ico  → Windows iconbitmap() at runtime AND embedded as the EXE icon
#   - icon.icns → macOS NSApplication.setApplicationIconImage at runtime AND
#                 passed to PyInstaller's --icon flag for the bundle
#   - clipforge_icon4.png → fed to Tk's iconphoto() for cross-platform window
#                 title-bar icons (on macOS .ico produces a generic placeholder)
_datas = [
    ('assets/icon.ico', 'assets'),
    ('assets/clipforge_icon4.png', 'assets'),
]
if sys.platform == 'darwin' and os.path.exists('assets/icon.icns'):
    _datas.append(('assets/icon.icns', 'assets'))

if sys.platform == 'win32':
    _icon = 'assets/icon.ico'
elif sys.platform == 'darwin':
    _icon = 'assets/icon.icns' if os.path.exists('assets/icon.icns') else None
else:
    _icon = None  # Linux: PyInstaller ignores the icon flag for ELF binaries.

a = Analysis(
    ['clipforge.py'],
    pathex=[],
    binaries=yt_dlp_binaries + ctk_binaries + ff_binaries,
    datas=yt_dlp_datas + ctk_datas + ff_datas + _datas,
    hiddenimports=yt_dlp_hiddenimports + ctk_hiddenimports + ff_hiddenimports + ['yt_dlp', 'customtkinter', 'imageio_ffmpeg'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ClipForge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=_icon,
)

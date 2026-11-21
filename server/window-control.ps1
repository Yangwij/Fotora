param(
  [ValidateSet('toggle', 'normal', 'fullscreen')]
  [string]$Action = 'toggle'
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class AlbemWindowControl {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct MONITORINFO {
    public int cbSize;
    public RECT rcMonitor;
    public RECT rcWork;
    public uint dwFlags;
  }

  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint attach, uint attachTo, bool doAttach);
  [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(
    IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint flags);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO info);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int value);
  [DllImport("user32.dll")]
  public static extern bool SetLayeredWindowAttributes(IntPtr hWnd, uint colorKey, byte alpha, uint flags);
  [DllImport("user32.dll")]
  public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

  public static RECT WindowRect(IntPtr hWnd) {
    RECT rect;
    GetWindowRect(hWnd, out rect);
    return rect;
  }

  public static RECT MonitorWorkArea(IntPtr hWnd) {
    IntPtr monitor = MonitorFromWindow(hWnd, 2);
    MONITORINFO info = new MONITORINFO();
    info.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
    if (!GetMonitorInfo(monitor, ref info)) return new RECT();
    return info.rcWork;
  }

  public static bool IsFullscreen(IntPtr hWnd) {
    RECT rect = WindowRect(hWnd);
    int style = GetWindowLong(hWnd, -16);
    bool noFrame = (style & 0x00C40000) == 0;

    IntPtr monitor = MonitorFromWindow(hWnd, 2);
    MONITORINFO info = new MONITORINFO();
    info.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
    if (!GetMonitorInfo(monitor, ref info)) return noFrame;

    bool coversMonitor = rect.Left <= info.rcMonitor.Left
      && rect.Top <= info.rcMonitor.Top
      && rect.Right >= info.rcMonitor.Right
      && rect.Bottom >= info.rcMonitor.Bottom;
    return noFrame && coversMonitor;
  }

  public static bool ForceForeground(IntPtr hWnd) {
    uint ignored;
    IntPtr foreground = GetForegroundWindow();
    uint foregroundThread = GetWindowThreadProcessId(foreground, out ignored);
    uint currentThread = GetCurrentThreadId();
    bool attached = foregroundThread != 0 && foregroundThread != currentThread
      && AttachThreadInput(foregroundThread, currentThread, true);
    ShowWindow(hWnd, 9);
    BringWindowToTop(hWnd);
    bool focused = SetForegroundWindow(hWnd);
    SetFocus(hWnd);
    if (attached) AttachThreadInput(foregroundThread, currentThread, false);
    return focused;
  }

  public static void PressF11() {
    keybd_event(0x7A, 0, 0, UIntPtr.Zero);
    keybd_event(0x7A, 0, 2, UIntPtr.Zero);
  }
}
'@

function Find-AlbemWindow {
  $foreground = [AlbemWindowControl]::GetForegroundWindow()
  $windows = @(Get-Process msedge, chrome -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like 'Album*'
  })
  if (-not $windows.Count) { return $null }

  $front = $windows | Where-Object { $_.MainWindowHandle -eq $foreground } | Select-Object -First 1
  if ($front) { return $front }
  return $windows | Select-Object -First 1
}

function Hide-AlbumFullscreenBubble([IntPtr]$handle, [int]$durationMs = 900) {
  $targetProcessId = [uint32]0
  [AlbemWindowControl]::GetWindowThreadProcessId($handle, [ref]$targetProcessId) | Out-Null
  $deadline = [DateTime]::Now.AddMilliseconds($durationMs)

  do {
    $callback = [AlbemWindowControl+EnumWindowsProc]{
      param($hwnd, $unused)
      $windowProcessId = [uint32]0
      [AlbemWindowControl]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId) | Out-Null
      if ($windowProcessId -ne $targetProcessId -or $hwnd -eq $handle) {
        return $true
      }

      $className = New-Object System.Text.StringBuilder 256
      [AlbemWindowControl]::GetClassName($hwnd, $className, 256) | Out-Null
      if ($className.ToString() -ne 'Chrome_WidgetWin_1') { return $true }

      $rect = New-Object AlbemWindowControl+RECT
      [AlbemWindowControl]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
      $width = $rect.Right - $rect.Left
      $height = $rect.Bottom - $rect.Top
      if ($width -lt 200 -or $width -gt 900 -or $height -gt 150 -or $rect.Top -ge 300) {
        return $true
      }

      $exStyle = [AlbemWindowControl]::GetWindowLong($hwnd, -20)
      [AlbemWindowControl]::SetWindowLong($hwnd, -20, ($exStyle -bor 0x80000)) | Out-Null
      [AlbemWindowControl]::SetLayeredWindowAttributes($hwnd, 0, 0, 2) | Out-Null
      [AlbemWindowControl]::ShowWindow($hwnd, 0) | Out-Null
      [AlbemWindowControl]::PostMessage($hwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
      return $true
    }
    [AlbemWindowControl]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
    Start-Sleep -Milliseconds 20
  } while ([DateTime]::Now -lt $deadline)
}

function Write-WindowResult([string]$state, [IntPtr]$handle) {
  $rect = [AlbemWindowControl]::WindowRect($handle)
  $actualWidth = $rect.Right - $rect.Left
  $actualHeight = $rect.Bottom - $rect.Top
  [Console]::Out.Write((
    '{{"ok":true,"state":"{0}","left":{1},"top":{2},"width":{3},"height":{4}}}' -f
    $state, $rect.Left, $rect.Top, $actualWidth, $actualHeight
  ))
}

$target = Find-AlbemWindow
if (-not $target) {
  [Console]::Out.Write('{"ok":false,"error":"no-window"}')
  exit 2
}

$handle = [IntPtr]$target.MainWindowHandle
[AlbemWindowControl]::ForceForeground($handle) | Out-Null
Start-Sleep -Milliseconds 120

$isFullscreen = [AlbemWindowControl]::IsFullscreen($handle)
$enterFullscreen = $Action -eq 'fullscreen' -or ($Action -eq 'toggle' -and -not $isFullscreen)

if ($enterFullscreen) {
  if (-not $isFullscreen) {
    for ($attempt = 0; $attempt -lt 3; $attempt++) {
      [AlbemWindowControl]::PressF11()
      for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 100
        if ([AlbemWindowControl]::IsFullscreen($handle)) { break }
      }
      if ([AlbemWindowControl]::IsFullscreen($handle)) { break }
      [AlbemWindowControl]::ForceForeground($handle) | Out-Null
      Start-Sleep -Milliseconds 80
    }
  }

  if (-not [AlbemWindowControl]::IsFullscreen($handle)) {
    [Console]::Out.Write('{"ok":false,"error":"could-not-enter-fullscreen"}')
    exit 4
  }

  Hide-AlbumFullscreenBubble $handle 900
  Write-WindowResult 'fullscreen' $handle
  exit 0
}

# Chromium ignores SetWindowPos while its fullscreen state is active.
if ([AlbemWindowControl]::IsFullscreen($handle)) {
  for ($attempt = 0; $attempt -lt 3; $attempt++) {
    [AlbemWindowControl]::PressF11()
    for ($i = 0; $i -lt 10; $i++) {
      Start-Sleep -Milliseconds 100
      if (-not [AlbemWindowControl]::IsFullscreen($handle)) { break }
    }
    if (-not [AlbemWindowControl]::IsFullscreen($handle)) { break }
    [AlbemWindowControl]::ForceForeground($handle) | Out-Null
  }
}

if ([AlbemWindowControl]::IsFullscreen($handle)) {
  [Console]::Out.Write('{"ok":false,"error":"still-fullscreen"}')
  exit 3
}

[AlbemWindowControl]::ShowWindow($handle, 9) | Out-Null
Start-Sleep -Milliseconds 150

$work = [AlbemWindowControl]::MonitorWorkArea($handle)
$workWidth = $work.Right - $work.Left
$workHeight = $work.Bottom - $work.Top
$width = [Math]::Min(1534, $workWidth)
$height = [Math]::Min(900, $workHeight)
$left = $work.Left + [Math]::Floor(($workWidth - $width) / 2)
$top = $work.Top + [Math]::Floor(($workHeight - $height) / 2)

$flags = 0x0004 -bor 0x0010 -bor 0x0040
[AlbemWindowControl]::SetWindowPos($handle, [IntPtr]::Zero, $left, $top, $width, $height, $flags) | Out-Null
Start-Sleep -Milliseconds 120
Write-WindowResult 'normal' $handle

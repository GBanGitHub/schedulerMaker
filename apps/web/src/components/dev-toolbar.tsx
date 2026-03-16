"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bug, X, RotateCw, GripHorizontal } from "lucide-react";
import React from "react";

const DEVICES = [
  // Apple
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14 Pro", width: 393, height: 852 },
  { name: "iPhone 14 Pro Max", width: 430, height: 932 },
  { name: "iPhone 17", width: 393, height: 852 },
  { name: "iPhone 17 Pro Max", width: 440, height: 956 },
  // Samsung
  { name: "Galaxy S25", width: 360, height: 780 },
  { name: "Galaxy S25+", width: 384, height: 832 },
  { name: "Galaxy S25 Ultra", width: 412, height: 892 },
  // Tablets
  { name: "iPad Mini", width: 744, height: 1133 },
] as const;

const MIN_PANEL_HEIGHT = 200;
const MAX_PANEL_HEIGHT_RATIO = 0.85;
const DEFAULT_PANEL_HEIGHT = 480;

type Tab = "preview" | "info";

export function DevToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [selectedDevice, setSelectedDevice] = useState(0);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [iframeKey, setIframeKey] = useState(0);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const pathname = usePathname();
  const { data: session } = useSession();

  const toggle = useCallback(() => setIsOpen((o) => !o), []);

  // Cmd+Shift+D shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey && e.shiftKey && e.key === "d") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Track viewport size
  useEffect(() => {
    function update() {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Drag-to-resize handler
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      e.preventDefault();
      const delta = dragStartY.current - e.clientY;
      const maxHeight = window.innerHeight * MAX_PANEL_HEIGHT_RATIO;
      const newHeight = Math.min(
        maxHeight,
        Math.max(MIN_PANEL_HEIGHT, dragStartHeight.current + delta)
      );
      setPanelHeight(newHeight);
    }
    function onMouseUp() {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  const device = DEVICES[selectedDevice];
  const tabBarHeight = 48;

  // Scale iframe to fit within the panel
  const availableWidth = viewportSize.w - 32;
  const availableHeight = panelHeight - tabBarHeight - 16;
  const scale = Math.min(
    availableWidth / device.width,
    availableHeight / device.height,
    1
  );

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-20 right-4 md:bottom-4 z-[9998] flex h-10 w-10 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-lg backdrop-blur-sm transition-opacity hover:opacity-100 opacity-60"
        title="Dev Toolbar (⌘⇧D)"
      >
        <Bug className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      {/* Border frame */}
      <div className="fixed inset-0 z-[9999] pointer-events-none border-[3px] border-primary rounded-sm" />

      {/* Bottom panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9998] bg-card border-t border-border shadow-2xl flex flex-col"
        style={{ height: panelHeight }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={startDrag}
          className="flex items-center justify-center h-3 cursor-row-resize hover:bg-muted/50 transition-colors shrink-0"
        >
          <GripHorizontal className="h-3 w-3 text-muted-foreground/50" />
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-2 px-3 h-10 border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "info"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Info
          </button>

          <div className="mx-2 h-4 w-px bg-border" />

          {/* Device picker */}
          {activeTab === "preview" && (
            <>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(Number(e.target.value))}
                className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-foreground"
              >
                {DEVICES.map((d, i) => (
                  <option key={d.name} value={i}>
                    {d.name} ({d.width}×{d.height})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                title="Reload preview"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <div className="flex-1" />

          <span className="text-[10px] font-mono text-muted-foreground">
            ⌘⇧D
          </span>
          <button
            onClick={toggle}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden min-h-0">
          {activeTab === "preview" && (
            <div className="flex items-center justify-center h-full bg-muted/30 relative">
              <div
                className="border border-border rounded-md overflow-hidden bg-background shadow-inner"
                style={{
                  width: device.width * scale,
                  height: device.height * scale,
                }}
              >
                <iframe
                  key={iframeKey}
                  src={
                    typeof window !== "undefined"
                      ? window.location.origin + pathname
                      : pathname
                  }
                  style={{
                    width: device.width,
                    height: device.height,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                  className="border-0"
                  title={`Preview — ${device.name}`}
                />
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground bg-card/80 px-2 py-0.5 rounded">
                {device.width}×{device.height} @ {Math.round(scale * 100)}%
              </div>
            </div>
          )}

          {activeTab === "info" && (
            <div className="p-4 space-y-3 text-sm overflow-auto h-full">
              <InfoRow label="Route" value={pathname} />
              <InfoRow
                label="Viewport"
                value={`${viewportSize.w} × ${viewportSize.h}`}
              />
              <InfoRow
                label="User"
                value={
                  session?.user
                    ? `${session.user.name ?? "—"} (${session.user.email ?? "—"})`
                    : "Not signed in"
                }
              />
              <InfoRow
                label="NODE_ENV"
                value={process.env.NODE_ENV ?? "unknown"}
              />
              <InfoRow label="React" value={React.version} />
              <InfoRow
                label="Next.js"
                value={process.env.NEXT_PUBLIC_NEXT_VERSION ?? "—"}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-muted-foreground text-xs font-medium w-20 shrink-0">
        {label}
      </span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </div>
  );
}

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 900;
const PAT_DIM = 150;
const TRI_HEIGHT = (Math.sqrt(3) / 2) * PAT_DIM;
const PATTERN_HEIGHT = Math.floor(TRI_HEIGHT * 2);

const Kaleidoscope = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<(() => void) | null>(null);
  const offsetRef = useRef(0);
  const [hasImage, setHasImage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fps, setFps] = useState(40);

  const FPS_OPTIONS = [20, 30, 40, 60, 90, 120];

  const handleFpsChange = (newFps: number) => {
    setFps(newFps);
    if (tickRef.current && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(tickRef.current, 1000 / newFps);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      canvasWrapRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const startKaleidoscope = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    offsetRef.current = 0;

    const pat = ctx.createPattern(img, 'repeat')!;
    const patR = ctx.createPattern(img, 'repeat')!;

    ctx.translate(-0.5 * PAT_DIM, 0);

    const fn = (alternateMode: boolean) => {
      offsetRef.current = (offsetRef.current - 1) % 1024;
      const offset = offsetRef.current;
      let i = 0;

      ctx.save();
      ctx.fillStyle = pat;
      ctx.translate(0, offset);
      while (i <= 3) {
        ctx.beginPath();
        ctx.moveTo(0, -offset);
        ctx.lineTo(PAT_DIM, -offset);
        ctx.lineTo(0.5 * PAT_DIM, TRI_HEIGHT - offset);
        ctx.closePath();
        ctx.fill();
        if (i % 3 === 0) {
          ctx.translate(PAT_DIM, -offset);
          ctx.rotate((-120 * Math.PI) / 180);
          ctx.translate(-PAT_DIM, offset);
        } else if (i % 3 === 1) {
          if (alternateMode) {
            ctx.rotate((120 * Math.PI) / 180);
            ctx.translate(-3 * PAT_DIM, 0);
            ctx.rotate((-120 * Math.PI) / 180);
          }
          ctx.translate(0.5 * PAT_DIM, TRI_HEIGHT - offset);
          ctx.rotate((-120 * Math.PI) / 180);
          ctx.translate(-0.5 * PAT_DIM, -TRI_HEIGHT + offset);
        } else if (i % 3 === 2) {
          ctx.translate(0, -offset);
          ctx.rotate((-120 * Math.PI) / 180);
          ctx.translate(0, offset);
        }
        i++;
      }
      ctx.restore();

      ctx.save();
      ctx.scale(-1, -1);
      ctx.fillStyle = patR;
      ctx.translate(
        (-i + (i % 3 === 0 ? 0.5 : i % 3 === 1 ? 1.5 : -0.5)) * PAT_DIM,
        -TRI_HEIGHT + offset
      );
      ctx.translate(0, -offset);
      ctx.rotate((120 * Math.PI) / 180);
      ctx.translate(0, offset);
      let j = 0;
      while (j < i + 1) {
        ctx.beginPath();
        if (j > 0 || !alternateMode) {
          ctx.moveTo(0, -offset);
          ctx.lineTo(PAT_DIM, -offset);
          ctx.lineTo(0.5 * PAT_DIM, TRI_HEIGHT - offset);
          ctx.closePath();
          ctx.fill();
        }
        if (j % 3 === 1) {
          ctx.translate(PAT_DIM, -offset);
          ctx.rotate((-120 * Math.PI) / 180);
          ctx.translate(-PAT_DIM, offset);
        } else if (j % 3 === 2) {
          ctx.translate(0.5 * PAT_DIM, TRI_HEIGHT - offset);
          ctx.rotate((-120 * Math.PI) / 180);
          ctx.translate(-0.5 * PAT_DIM, -TRI_HEIGHT + offset);
        } else if (j % 3 === 0) {
          ctx.translate(0, -offset);
          ctx.rotate((-120 * Math.PI) / 180);
          ctx.translate(0, offset);
        }
        j++;
      }
      ctx.restore();
    };

    const tile = () => {
      const rowData = ctx.getImageData(0, 0, PAT_DIM * 3, PATTERN_HEIGHT);
      for (let i = 0; PATTERN_HEIGHT * i < canvas.height + TRI_HEIGHT; i++) {
        for (let j = 0; j * PAT_DIM < canvas.width + PAT_DIM; j += 3) {
          ctx.putImageData(rowData, j * PAT_DIM, i * PATTERN_HEIGHT);
        }
      }
    };

    tickRef.current = () => {
      fn(false);
      ctx.translate(1.5 * PAT_DIM, TRI_HEIGHT);
      fn(true);
      ctx.translate(-1.5 * PAT_DIM, -TRI_HEIGHT);
      tile();
    };

    intervalRef.current = setInterval(tickRef.current, 1000 / fps);
  }, [fps]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setHasImage(true);
      startKaleidoscope(img);
    };
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-white text-5xl font-bold tracking-[0.2em] uppercase select-none">
        Kaleidoscope
      </h1>

      {!hasImage && (
        <label className="group cursor-pointer flex flex-col items-center gap-3 border-2 border-dashed border-white/30 hover:border-white/60 rounded-2xl px-16 py-12 transition-colors">
          <svg
            className="w-12 h-12 text-white/40 group-hover:text-white/70 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-white/60 group-hover:text-white/90 text-lg transition-colors">
            Upload an image to begin
          </span>
          <span className="text-white/30 text-sm">PNG, JPG, GIF supported</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}

      <div
        ref={canvasWrapRef}
        className={`canvas-container group relative ${hasImage ? 'block' : 'hidden'}`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-lg shadow-2xl"
          style={{ maxWidth: '100%', height: 'auto' }}
        />

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="absolute top-3 right-3 bg-black/40 hover:bg-black/80 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>

      </div>

      {hasImage && !isFullscreen && (
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white/80 hover:text-white px-6 py-2.5 rounded-full text-sm transition-all">
            Change Image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <select
            value={fps}
            onChange={(e) => handleFpsChange(Number(e.target.value))}
            className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white/80 hover:text-white px-4 py-2.5 rounded-full text-sm transition-all cursor-pointer appearance-none text-center"
          >
            {FPS_OPTIONS.map((f) => (
              <option key={f} value={f} className="bg-neutral-900 text-white">
                {f} FPS
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default Kaleidoscope;

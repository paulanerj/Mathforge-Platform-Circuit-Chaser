/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

export const ParticleSystem = ({ trigger, isFinale }: { trigger: boolean; isFinale: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (!trigger && !isFinale)) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles: any[] = [];
    const createExplosion = (x: number, y: number, count: number, colors: string[]) => {
      for (let i = 0; i < count; i++)
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          size: Math.random() * 5 + 2,
        });
    };
    if (trigger) createExplosion(window.innerWidth / 2, window.innerHeight / 2, 50, ['#38BDF8', '#4ADE80', '#FFFFFF']);
    if (isFinale) createExplosion(window.innerWidth / 2, window.innerHeight / 2, 200, ['#FB7185', '#4ADE80', '#38BDF8', '#FACC15']);
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.alpha <= 0) particles.splice(i, 1);
      }
      if (particles.length > 0) requestAnimationFrame(animate);
    };
    animate();
  }, [trigger, isFinale]);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
};

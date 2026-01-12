"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  emoji: string;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  velocityX: number;
  velocityY: number;
}

const EMOJIS = ["🎉", "🎊", "✨", "🌟", "⭐", "🥳", "🎈", "💫", "🏆", "👏", "🎇", "🎆"];

export function useConfetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fire = (originX?: number, originY?: number) => {
    const x = originX ?? window.innerWidth / 2;
    const y = originY ?? window.innerHeight / 2;

    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 5 + Math.random() * 6;

      newPieces.push({
        id: Date.now() + i,
        x,
        y,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        scale: 0.5 + Math.random() * 0.4,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 8,
      });
    }

    setPieces((prev) => [...prev, ...newPieces]);

    // Limpiar después de la animación
    setTimeout(() => {
      setPieces((prev) => prev.filter((p) => !newPieces.find((np) => np.id === p.id)));
    }, 2500);
  };

  const ConfettiComponent = mounted
    ? createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {pieces.map((piece) => (
            <ConfettiPieceComponent key={piece.id} piece={piece} />
          ))}
        </div>,
        document.body
      )
    : null;

  return { fire, ConfettiComponent };
}

function ConfettiPieceComponent({ piece }: { piece: ConfettiPiece }) {
  const [state, setState] = useState({
    x: piece.x,
    y: piece.y,
    rotation: piece.rotation,
    opacity: 1,
    vx: piece.velocityX,
    vy: piece.velocityY,
  });

  const frameRef = useRef<number>();

  useEffect(() => {
    const gravity = 0.15;
    const friction = 0.99;
    const fadeStart = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;

      setState((prev) => {
        const newVy = prev.vy + gravity;
        const newOpacity = elapsed > fadeStart
          ? Math.max(0, 1 - (elapsed - fadeStart) / 1500)
          : 1;

        return {
          x: prev.x + prev.vx,
          y: prev.y + newVy,
          rotation: prev.rotation + piece.rotationSpeed,
          opacity: newOpacity,
          vx: prev.vx * friction,
          vy: newVy * friction,
        };
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [piece.rotationSpeed]);

  return (
    <div
      className="absolute select-none"
      style={{
        left: state.x,
        top: state.y,
        fontSize: `${piece.scale * 1.2}rem`,
        transform: `translate(-50%, -50%) rotate(${state.rotation}deg)`,
        opacity: state.opacity,
      }}
    >
      {piece.emoji}
    </div>
  );
}

// Componente global de confeti
let globalFireConfetti: ((x?: number, y?: number) => void) | null = null;

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const { fire, ConfettiComponent } = useConfetti();

  useEffect(() => {
    globalFireConfetti = fire;
    return () => {
      globalFireConfetti = null;
    };
  }, [fire]);

  return (
    <>
      {children}
      {ConfettiComponent}
    </>
  );
}

export function fireConfetti(x?: number, y?: number) {
  globalFireConfetti?.(x, y);
}

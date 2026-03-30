import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Types ── */
interface SkinMeta {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  clips: {
    idle: string[];
    action: string[];
    intro: string[];
    outro: string[];
  };
}

interface MascotManifest {
  skins: SkinMeta[];
}

type MascotState = 'loading' | 'intro' | 'idle' | 'action' | 'outro' | 'hidden';

interface MascotProps {
  skinId?: string;
  /** Idle → Action timer range in ms */
  actionInterval?: [number, number];
  /** Show/hide the mascot */
  visible?: boolean;
  className?: string;
}

/* ── Helpers ── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleBag<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ── Mascot Component ── */
export default function Mascot({
  skinId = 'zeno',
  actionInterval = [30_000, 60_000],
  visible = true,
  className = '',
}: MascotProps) {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef<'A' | 'B'>('A');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionBagRef = useRef<string[]>([]);
  const actionIndexRef = useRef(0);

  const [skin, setSkin] = useState<SkinMeta | null>(null);
  const [state, setState] = useState<MascotState>('loading');

  /* ── Load manifest ── */
  useEffect(() => {
    let cancelled = false;
    fetch('/mascot/manifest.json')
      .then((r) => r.json() as Promise<MascotManifest>)
      .then((data) => {
        if (cancelled) return;
        const found = data.skins.find((s) => s.id === skinId) ?? data.skins[0];
        if (found) setSkin(found);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [skinId]);

  /* ── Double-buffer swap ── */
  const playClip = useCallback((src: string, loop: boolean, onEnd?: () => void) => {
    const front = activeRef.current === 'A' ? videoARef.current : videoBRef.current;
    const back = activeRef.current === 'A' ? videoBRef.current : videoARef.current;
    if (!front || !back) return;

    back.src = src;
    back.loop = loop;
    back.muted = true;
    back.load();

    const doSwap = () => {
      front.style.opacity = '0';
      back.style.opacity = '1';
      activeRef.current = activeRef.current === 'A' ? 'B' : 'A';
    };

    const swapOnFrame = () => {
      // Use requestVideoFrameCallback if available, else fallback
      if ('requestVideoFrameCallback' in back) {
        (back as any).requestVideoFrameCallback(doSwap);
      } else {
        setTimeout(doSwap, 50);
      }
    };

    const handleCanPlay = () => {
      back.removeEventListener('canplay', handleCanPlay);
      back.play().then(swapOnFrame).catch(() => {});
    };
    back.addEventListener('canplay', handleCanPlay);

    if (onEnd) {
      const handleEnd = () => {
        back.removeEventListener('ended', handleEnd);
        onEnd();
      };
      back.addEventListener('ended', handleEnd);
    }
  }, []);

  /* ── Schedule action timer ── */
  const scheduleAction = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = actionInterval[0] + Math.random() * (actionInterval[1] - actionInterval[0]);
    timerRef.current = setTimeout(() => setState('action'), delay);
  }, [actionInterval]);

  /* ── FSM transitions ── */
  useEffect(() => {
    if (!skin || !visible) return;

    const { clips } = skin;

    switch (state) {
      case 'loading': {
        if (clips.intro.length > 0) {
          setState('intro');
        } else if (clips.idle.length > 0) {
          setState('idle');
        }
        break;
      }

      case 'intro': {
        if (clips.intro.length === 0) { setState('idle'); break; }
        const clip = pick(clips.intro);
        playClip(clip, false, () => setState('idle'));
        break;
      }

      case 'idle': {
        if (clips.idle.length === 0) break;
        const clip = pick(clips.idle);
        playClip(clip, true);
        scheduleAction();
        break;
      }

      case 'action': {
        if (clips.action.length === 0) { setState('idle'); break; }
        // Shuffle bag: no repeats until all played
        if (actionIndexRef.current >= actionBagRef.current.length) {
          actionBagRef.current = shuffleBag(clips.action);
          actionIndexRef.current = 0;
        }
        const clip = actionBagRef.current[actionIndexRef.current++];
        playClip(clip, false, () => setState('idle'));
        break;
      }

      case 'outro': {
        if (clips.outro.length === 0) { setState('hidden'); break; }
        const clip = pick(clips.outro);
        playClip(clip, false, () => setState('hidden'));
        break;
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [skin, state, visible, playClip, scheduleAction]);

  /* ── Hide/show ── */
  useEffect(() => {
    if (!visible && state !== 'hidden' && state !== 'loading') {
      setState('outro');
    } else if (visible && state === 'hidden') {
      setState('loading');
    }
  }, [visible, state]);

  if (!skin || state === 'hidden') return null;

  return (
    <div
      className={`mascot-container ${className}`}
      style={{
        position: 'fixed',
        bottom: 0,
        right: 24,
        width: 200,
        height: 200,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <video
        ref={videoARef}
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: 1,
          transition: 'opacity 150ms ease',
        }}
      />
      <video
        ref={videoBRef}
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: 0,
          transition: 'opacity 150ms ease',
        }}
      />
    </div>
  );
}

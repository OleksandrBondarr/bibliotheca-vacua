import { useEffect, useState } from "react";
import { playLampClick, setSoundEnabled, soundEnabled, startAmbience } from "@/lib/library-sound";

const KEY = "bv-after-closing";

/**
 * The switch for the room lights, present on every page. The state is
 * remembered per visitor, so it survives navigation between pages.
 */
export function useLampState() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    setClosed(window.localStorage.getItem(KEY) === "1");
  }, []);

  function pull() {
    playLampClick();
    setClosed((was) => {
      const next = !was;
      window.localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  }

  return { closed, pull };
}

/**
 * A brass banker's lamp fixed in the corner: only the switch and its own small
 * glow. The pool of light itself falls on the middle of the viewport, where the
 * reader is looking, and follows the page as they scroll.
 */
export function LibraryLamp({ closed, onPull }: { closed: boolean; onPull: () => void }) {
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const enabled = soundEnabled();
    setSound(enabled);
    if (enabled) void startAmbience();
  }, []);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  }


  return (
    <>
      <div aria-hidden className={closed ? "lights-out-layer active" : "lights-out-layer"} />
      <div className="lamp-controls">
        <button
          type="button"
          onClick={onPull}
          aria-pressed={closed}
          aria-label={closed ? "Switch the library lights on" : "Switch the library lights off"}
          title={closed ? "Lights on" : "After closing"}
          className="reading-lamp"
        >
          <span aria-hidden className="lamp-pool" />
          <span aria-hidden className="lamp-shade" />
          <span aria-hidden className="lamp-rim" />
          <span aria-hidden className="lamp-chain" />
          <span aria-hidden className="lamp-column" />
          <span aria-hidden className="lamp-foot" />
        </button>
        <button type="button" className="sound-toggle" aria-pressed={sound} onClick={toggleSound}>
          {sound ? "sound" : "quiet"}
        </button>
      </div>
    </>
  );
}

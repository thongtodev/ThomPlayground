import React, { useEffect, useRef, useState } from "react";


const landscape =
  "(orientation: landscape) and (max-width: 1100px), (orientation: landscape) and (max-height: 520px)";
export function useMobileTable() {
  const [mobile, setMobile] = useState(
    () => window.matchMedia(landscape).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(landscape);
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function MobileHeader({
  room,
  onHome,
  onHelp,
  copyInvite,
  copy,
  onLeave,
  busy,
  zoom,
  toggleZoom,
  status,
  fullscreen,
  toggleFullscreen,
}) {
  const menu = useRef(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const close = () => menu.current.close();
  return (
    <header className="uno-mobile-header">
      <button onClick={onHome} aria-label="Về trang chủ">
        ⌂
      </button>
      <b>
        JGKiD <em>Uno</em>
      </b>
      <span className="uno-mobile-code">#{room.code}</span>
      <button
        onClick={() => menu.current.showModal()}
        aria-label="Mở menu phòng"
        aria-haspopup="dialog"
      >
        ☰
      </button>
      <dialog
        ref={menu}
        className="uno-mobile-menu"
        aria-label="Menu phòng UNO"
        onClose={() => setConfirmLeave(false)}
      >
        <div className="uno-menu-title">
          <strong>Phòng {room.code}</strong>
          <button onClick={close} aria-label="Đóng menu">
            ×
          </button>
        </div>
        <div className="uno-menu-options">
          <button onClick={() => copyInvite(false)}>Chép mã phòng</button>
          <button onClick={() => copyInvite(true)}>Chép link mời</button>
          <button onClick={toggleZoom} aria-pressed={zoom}>
            Phóng lá đã chọn · {zoom ? "Bật" : "Tắt"}
          </button>
          <button
            onClick={() => {
              close();
              onHelp();
            }}
          >
            Luật chơi
          </button>
          <button
            onClick={() => {
              close();
              toggleFullscreen();
            }}
          >
            {fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          </button>
          <button disabled={busy} onClick={() => setConfirmLeave(true)}>
            Rời phòng
          </button>
        </div>
        {copy && <p role="status">{copy}</p>}
        {confirmLeave && (
          <div>
            <p>Rời phòng và bỏ ván đang chơi?</p>
            <button
              disabled={busy}
              onClick={() => {
                close();
                onLeave();
              }}
            >
              Rời ván
            </button>{" "}
            <button onClick={() => setConfirmLeave(false)}>Chơi tiếp</button>
          </div>
        )}
      </dialog>
      {status && (
        <small className="uno-network-status" role="status">
          {status}
        </small>
      )}
    </header>
  );
}

export function ActionToast({ version, notice }) {
  const [active, setActive] = useState(null);
  const lastVersion = useRef(null);
  useEffect(() => {
    if (lastVersion.current === version) return;
    lastVersion.current = version;
    // Always show the latest game action: queued notifications become stale
    // during quick multiplayer turns. Important actions stay slightly longer.
    setActive(notice?.text ? { ...notice, version } : null);
  }, [version, notice?.text, notice?.important, notice?.tone]);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(
      () => setActive(old => old?.version === active.version ? null : old),
      active.important ? 2300 : 1600,
    );
    return () => clearTimeout(timer);
  }, [active]);
  return (
    <div
      key={active?.version || 'empty'}
      className={`uno-mobile-toast ${active?.important ? 'is-important' : ''} ${active?.tone === 'turn' ? 'is-turn-notice' : ''} ${active ? 'is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {active?.text || ''}
    </div>
  );
}

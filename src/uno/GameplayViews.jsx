import {useLayoutEffect,useRef} from "react";
import {createPortal} from "react-dom";
import React from "react";
import { TurnClock } from "../effects/ProgressEffects";
import { UnoCard, CARD_MAP, COLORS } from "./Card";
import { TurnRing } from "./TurnRing";
import { ActionToast } from "./MobileTable";
import { getMobileNotice, isRoutineUnoNotice } from "./mobileNotices";
const friendlyNotice = (text) =>
  isRoutineUnoNotice(text) ? null : ({
    "Đã chia 7 lá. Bắt đầu!": "Chia bài xong rồi, chim cá chơi thôi!",
    "Bắt UNO thành công: rút 2 lá.":
      "Úi, quên hô UNO rồi! Chim cá rút thêm 2 lá nha.",
    "Thách thức đúng! Người đánh +4 rút 4 lá; bạn được đi.":
      "Bắt đúng rồi! Người ra +4 rút 4 lá, tới lượt bạn nhé.",
    "Thách thức sai: rút 6 lá, mất lượt.":
      "Đoán trật rồi! Bạn rút 6 lá và nhường lượt nhé.",
    "Đã rút 4 lá, mất lượt.": "Nhận 4 lá nhé, lượt này nhường bạn kế bên.",
    "Đã rút bài. Chỉ được đánh lá vừa rút hoặc chuyển lượt.":
      "Rút rồi nè, chim cá xem lá mới nha!",
    "+4: chấp nhận hoặc thách thức.": "Có +4 kìa! Nhận bài hay thách thức đây?",
    "Đối thủ rút 2 lá và mất lượt.":
      "Gửi chim cá kế bên 2 lá, nhường lượt nha!",
    "Một người chơi đã bỏ cuộc.":
      "Một chim cá rời bàn rồi, cả nhà chơi tiếp nha.",
  })[text] || text;

export function OpponentSeats({
  others,
  room,
  activePlayerId,
  remaining,
  tableFx,
  busy,
  act,
}) {
  return (
    <div className="uno-opponents">
      {others.map((p) => (
        <article
          data-fx-anchor={`player:${p.id}`}
          key={p.id}
          className={`uno-seat uno-seat-${p.seat} ${activePlayerId === p.id ? "is-turn" : ""}`}
        >
          <span className="uno-avatar">
            {p.name.slice(0, 1)}
            {activePlayerId === p.id && remaining !== null && (
              <TurnClock remaining={remaining} total={room.pending ? 15 : 30} />
            )}
          </span>
          <b className="uno-seat-name" title={p.name}>
            {p.name}
            {p.bot ? " · BOT" : ""}
          </b>
          <span className="uno-seat-count">{p.count} lá</span>
          <div className="uno-opponent-cards" aria-hidden="true">
            {Array.from({ length: Math.min(5, p.count) }, (_, i) => (
              <span key={i} style={{ "--card-index": i }}>
                <UnoCard back />
              </span>
            ))}
          </div>
          {tableFx?.badges
            .filter((b) => b.id === p.id)
            .map((b, i) => (
              <b key={tableFx.key + i} className="uno-player-fx">
                {b.text}
              </b>
            ))}
          {p.count === 1 &&
            (room.unoTarget === p.id ? (
              <button
                className="uno-catch"
                disabled={busy}
                onClick={() => act("catch", {}, {roomId:room.id, target:p.id, version:room.version})}
              >
                Bắt UNO!
              </button>
            ) : (
              <strong>UNO!</strong>
            ))}
        </article>
      ))}
    </div>
  );
}

export function CenterBoard({
  room,
  canPlay,
  confirmPlay,
  unoEffect,
  remaining,
  needsDraw,
  canDraw,
  act,
  assets,
  myTurn,
  mobile,
  tableFx,
  playSubmitting,
}) {
  return (
    <section
      className={`uno-table uno-color-${room.color} ${canPlay ? "can-play" : ""} ${playSubmitting ? "is-play-submitting" : ""}`}
      onClick={(e) => {
        if (!e.target.closest("button")) confirmPlay();
      }}
    >
      {tableFx?.play && (
        <span key={tableFx.key} className="uno-board-play-flash" aria-hidden="true" />
      )}
      {unoEffect && (
        <div
          key={unoEffect.key}
          className={`uno-event uno-event-${unoEffect.kind}`}
          role="status"
          aria-live="polite"
        >
          <div className="uno-event-burst">
            <span className="uno-event-name">{unoEffect.name}</span>
            <strong>{unoEffect.kind === "uno" ? "UNO!" : "BỊ BẮT UNO!"}</strong>
            <span className="uno-event-caption">
              {unoEffect.kind === "uno"
                ? "Còn một lá thôi!"
                : "+2 lá · Quên hô UNO rồi!"}
            </span>
          </div>
        </div>
      )}
      <div className="uno-table-meta">
        <b>Màu: {COLORS[room.color]}</b>
        {remaining !== null && (
          <div
            className={`uno-countdown ${remaining <= 5 ? "is-urgent" : ""}`}
            role="timer"
            aria-label={`${room.pending ? "Xử lý cộng 4" : "Lượt chơi"} còn ${remaining} giây`}
          >
            <span>{room.pending ? "Quyết định +4" : "Lượt chơi"}</span>
            <b>{remaining}s</b>
          </div>
        )}
      </div>
      <TurnRing room={room} />
      <div className="uno-piles">
        <div
          className={`uno-draw-stack ${needsDraw ? "needs-draw" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!e.target.closest("button") && canDraw) act("draw");
          }}
        >
          <button
            data-fx-anchor="deck"
            className="uno-pile-button"
            aria-label="Rút một lá bài"
            disabled={!canDraw}
            onClick={() => act("draw")}
          >
            <UnoCard back />
          </button>
          <small>{room.drawCount} lá · Rút bài</small>
        </div>
        <div key={room.top} className="uno-discard">
          <button
            data-fx-anchor="discard"
            className="uno-pile-button"
            disabled={!canPlay}
            aria-label="Đánh lá đã chọn lên bàn"
            onClick={confirmPlay}
          >
            <UnoCard id={room.top} assets={assets} priority />
          </button>
          <small>{canPlay ? "Chạm để ra bài" : "Lá trên bàn"}</small>
        </div>
      </div>
      {mobile && (
        <ActionToast
          version={`${room.id}:${room.version}`}
          notice={getMobileNotice({ room, unoEffect, tableFx })}
        />
      )}
      {friendlyNotice(room.notice) && (
        <p key={room.version} className="uno-notice" role="status">
          {friendlyNotice(room.notice)}
        </p>
      )}
      <strong>
        {myTurn
          ? "Tới chim cá rồi nè!"
          : `Đang chờ ${room.players.find((p) => p.id === room.turn)?.name || "đối thủ"}`}
      </strong>
    </section>
  );
}

function CardPreview({handRef, selected, assets}) {
  const previewRef = useRef(null);
  const root = handRef.current?.closest(".uno-in-game");
  useLayoutEffect(() => {
    const hand = handRef.current;
    const preview = previewRef.current;
    const card = hand?.querySelector(".selected");
    if (!root || !preview || !card) return;
    function position() {
      const box = card.getBoundingClientRect();
      const rail = hand.getBoundingClientRect();
      const bounds = root.getBoundingClientRect();
      preview.hidden = box.right <= rail.left || box.left >= rail.right;
      const width = Math.min(box.width * 2, (box.bottom - bounds.top - 6) / 1.5);
      const left = Math.min(Math.max(box.left + (box.width - width) / 2, bounds.left + 4), bounds.right - width - 4);
      preview.style.width = width + "px";
      preview.style.left = left + "px";
      preview.style.top = (box.bottom - width * 1.5) + "px";
    }
    position();
    const observer = new ResizeObserver(position);
    observer.observe(root);
    observer.observe(card);
    hand.addEventListener("scroll",position,{passive:true});
    window.addEventListener("resize",position);
    return () => {
      observer.disconnect();
      hand.removeEventListener("scroll",position);
      window.removeEventListener("resize",position);
    };
  },[handRef,root,selected]);
  return root && createPortal(<div className="uno-card-preview" ref={previewRef} aria-hidden="true">
    <UnoCard id={selected} assets={assets}/>
  </div>,root);
}

export function PlayerHand({
  activePlayerId,
  room,
  remaining,
  me,
  tableFx,
  handRef,
  selected,
  setSelected,
  zoom,
  myTurn,
  drawn,
  assets,
  needsDraw,
  busy,
  act,
  mobile,
}) {
  return (
    <section
      data-fx-anchor="hand"
      className={`uno-hand-area ${activePlayerId === room.me ? "local-active" : ""}`}
    >
      <div
        className={`uno-self-seat ${activePlayerId === room.me ? "is-turn" : ""}`}
      >
        <span className="uno-avatar">
          {me?.name.slice(0, 1)}
          {activePlayerId === room.me && remaining !== null && (
            <TurnClock remaining={remaining} total={room.pending ? 15 : 30} />
          )}
        </span>
        <b title={me?.name}>{me?.name || "Chim cá"}</b>
        <small>{room.hand.length} lá</small>
      </div>
      <h2>
        Bài của chim cá{" "}
        {activePlayerId === room.me && (
          <small>{room.pending ? "Xử lý +4" : "Đến lượt bạn"}</small>
        )}
        <small>{room.hand.length} lá</small>
        {tableFx?.badges
          .filter((b) => b.id === room.me)
          .map((b, i) => (
            <span key={tableFx.key + i} className="uno-player-fx">
              {b.text}
            </span>
          ))}
      </h2>
      <div
        className="uno-hand"
        ref={handRef}
        style={{
          "--hand-count":
            Math.max(1, room.hand.length),
        }}
      >
        {room.hand.map((id) => (
          <button
            data-fx-anchor={`card:${id}`}
            key={id}
            className={`uno-hand-card ${myTurn && !room.pending && room.legal.includes(id) ? "is-legal" : ""} ${selected === id ? "selected" : ""} ${drawn.includes(id) ? "just-drawn" : ""}`}
            onClick={() => setSelected(selected === id ? null : id)}
            aria-pressed={selected === id}
            aria-label={CARD_MAP[id]?.name}
          >
            <UnoCard id={id} assets={assets} priority />
          </button>
        ))}
      </div>
      {selected && (!mobile || zoom) && <CardPreview selected={selected} assets={assets} handRef={handRef}/>}
      <div className="uno-actions uno-hand-tools">
        <span className="uno-hand-hint">
          {room.unoTarget === room.me
            ? "Một lá rồi, chim cá hô UNO mau!"
            : needsDraw
              ? "Chưa có lá hợp rồi, chim cá chạm bộ bài để rút nha!"
              : room.hand.length === 2
                ? "Sắp UNO rồi, chim cá nhớ nha!"
                : selected
                  ? room.legal.includes(selected) && myTurn
                    ? "Chạm lên bàn để ra bài"
                    : "Lá này chưa đánh được nhé"
                  : "Chạm lá để chọn"}
        </span>
        {mobile && myTurn && room.drew && !room.pending && (
          <button
            className="uno-pass"
            disabled={busy}
            onClick={() => act("pass")}
          >
            Qua lượt
          </button>
        )}
        {room.unoTarget === room.me && (
          <button
            className="uno-call uno-call-now"
            disabled={busy}
            onClick={() => act("uno")}
          >
            UNO!
          </button>
        )}
      </div>
    </section>
  );
}

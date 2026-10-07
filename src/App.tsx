import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calldataBytes, CALLDATA_LIMIT } from "./lib/calldata";
import { CONTRACT_ADDRESS, EXPLORER_BASE, SOURCE_SHA256 } from "./lib/config";
import { errorMessage } from "./lib/errors";
import { connectedWallet, getDesk, getLimits, getTicket, requestWallet, sendWrite, waitForVerdict } from "./lib/genlayer";
import { deskIdOf, idsFromInput, short, ticketIdOf } from "./lib/ids";
import type { Limits } from "./lib/parse";
import { pyLen, pyStrip } from "./lib/pytext";
import {
  fileBlock, frontSlotTaken, MAX_DESK_NAME_LENGTH, MAX_REQUEST_LENGTH, myWaiting, nextUp, openBlock, placeLine, resolveBlock, REVERTS,
  takeBlock, UI, withdrawBlock,
} from "./lib/rules";
import type { Desk, Ticket, TxStatus } from "./lib/types";
import { fileVerified, openVerified, resolveVerified, takeVerified, withdrawVerified } from "./lib/verify";

type Verify = () => Promise<string | null>;
type View = "overview" | "desk" | "verify";

const IDLE: TxStatus = { phase: "idle", message: "" };
const NAV: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "desk", label: "Desk" },
  { id: "verify", label: "Verification" },
];
const DESKS_KEY = "cutline.desks";
const MINE_KEY = "cutline.mine";

function readList(key: string): string[] {
  try {
    return idsFromInput(window.localStorage.getItem(key) ?? "");
  } catch {
    return [];
  }
}

function saveList(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, ids.join(","));
  } catch {
    /* storage unavailable: the desk view still lists every waiting and open ticket */
  }
}

function deskFromUrl(): string {
  return idsFromInput(new URLSearchParams(window.location.search).get("d") ?? "")[0] ?? "";
}

function setDeskInUrl(id: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("d", id);
  else url.searchParams.delete("d");
  window.history.replaceState(null, "", url.toString());
}

const same = (a: string, b: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export default function App() {
  const urlDesk = deskFromUrl();
  const [view, setView] = useState<View>(urlDesk ? "desk" : "overview");
  const [me, setMe] = useState("");
  const [deskId, setDeskId] = useState(urlDesk);
  const [known, setKnown] = useState<string[]>(() => {
    const list = readList(DESKS_KEY);
    return urlDesk && !list.includes(urlDesk) ? [urlDesk, ...list] : list;
  });
  const [mineIds, setMineIds] = useState<string[]>(() => readList(MINE_KEY));
  const [desk, setDesk] = useState<Desk | null>(null);
  const [tickets, setTickets] = useState<Record<string, Ticket>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");
  const [limits, setLimits] = useState<Limits | null>(null);

  const [openInput, setOpenInput] = useState("");
  const [newName, setNewName] = useState("");
  const [nameTaken, setNameTaken] = useState(false);
  const [text, setText] = useState("");
  const [filed, setFiled] = useState(false);

  const [status, setStatus] = useState<TxStatus>(IDLE);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const recheck = useRef<Verify | null>(null);

  // ---------- reads ----------
  const loadDesk = useCallback(async (id: string, mine: string[]) => {
    if (!id) {
      setDesk(null);
      setTickets({});
      setLoadState("idle");
      return;
    }
    setLoadState("loading");
    try {
      const d = await getDesk(id);
      if (!d) {
        setDesk(null);
        setTickets({});
        setLoadState("missing");
        return;
      }
      const ids = [...new Set([...d.front, ...d.back, ...d.in_progress, ...mine])];
      const ts = await Promise.all(ids.map((t) => getTicket(t).catch(() => null)));
      const map: Record<string, Ticket> = {};
      ts.forEach((t) => { if (t && t.desk_id === id) map[t.ticket_id] = t; });
      setDesk(d);
      setTickets(map);
      setNames((n) => ({ ...n, [id]: d.name }));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    connectedWallet().then(setMe).catch(() => setMe(""));
    window.ethereum?.on?.("accountsChanged", (accounts: string[]) => {
      setMe((accounts?.[0] ?? "").toLowerCase());
      recheck.current = null;
      setStatus(IDLE);
      setFresh(null);
    });
    getLimits().then(setLimits).catch(() => setLimits(null));
  }, []);

  useEffect(() => {
    setDeskInUrl(deskId);
    void loadDesk(deskId, mineIds);
    // mineIds is read at load time; adding a ticket reloads explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deskId, loadDesk]);

  useEffect(() => saveList(DESKS_KEY, known), [known]);
  useEffect(() => saveList(MINE_KEY, mineIds), [mineIds]);

  useEffect(() => {
    known.filter((id) => !names[id]).forEach((id) => {
      getDesk(id).then((d) => d && setNames((n) => ({ ...n, [id]: d.name }))).catch(() => undefined);
    });
  }, [known, names]);

  // ---------- derived ----------
  const all = Object.values(tickets);
  const waiting = all.filter((t) => t.state === "WAITING");
  const owner = !!desk && same(desk.owner, me);
  const mine = all.filter((t) => same(t.filer, me)).sort((a, b) => b.seq - a.seq);
  const slotTaken = frontSlotTaken(all, me);
  const mineCount = myWaiting(waiting, me);

  const newDeskId = me && pyLen(pyStrip(newName)) > 0 ? deskIdOf(me, newName) : "";
  useEffect(() => {
    let live = true;
    setNameTaken(false);
    if (!newDeskId) return;
    const t = setTimeout(() => { getDesk(newDeskId).then((d) => live && setNameTaken(!!d)).catch(() => undefined); }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [newDeskId]);
  const openReason = openBlock(me, newName, nameTaken);

  const newTicketId = me && desk && pyLen(pyStrip(text)) > 0 ? ticketIdOf(desk.desk_id, me, text) : "";
  useEffect(() => {
    let live = true;
    setFiled(false);
    if (!newTicketId) return;
    const t = setTimeout(() => { getTicket(newTicketId).then((x) => live && setFiled(!!x)).catch(() => undefined); }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [newTicketId]);
  const fileBytes = useMemo(() => calldataBytes("file_ticket", [desk?.desk_id ?? "0".repeat(64), text]), [desk, text]);
  const fileReason = fileBlock({ me, desk, mine: mineCount, text, exists: filed, bytes: fileBytes });
  const takeReason = desk ? takeBlock(desk, me) : UI.noDesk;
  const upNext = desk ? nextUp(desk) : "";

  // ---------- writes ----------
  async function connect() {
    try {
      setMe(await requestWallet());
    } catch (e) {
      setStatus({ phase: "error", message: errorMessage(e) });
    }
  }

  async function runWrite(action: string, method: string, args: unknown[], verify: Verify) {
    setBusy(true);
    recheck.current = null;
    try {
      setStatus({ phase: "signing", message: "Confirm the transaction in your wallet…", action });
      const hash = await sendWrite(me, method, args, 0n);
      setStatus({ phase: "submitted", message: "Submitted. Waiting for validators to accept it…", hash, action });
      const verdict = await waitForVerdict(hash);
      if (verdict.kind === "error") {
        setStatus({ phase: "error", message: verdict.reason, hash, action });
        return;
      }
      if (verdict.kind === "pending") {
        recheck.current = verify;
        setStatus({ phase: "delayed", message: "Submitted — confirmation delayed. Check again re-reads the accepted state; do not send it twice.", hash, action });
        return;
      }
      setStatus({ phase: "checking", message: "Executed. Reading the accepted state…", hash, action });
      const done = await verify();
      if (done) {
        setStatus({ phase: "success", message: done, hash, action });
      } else {
        recheck.current = verify;
        setStatus({ phase: "delayed", message: "Executed, but the accepted state does not show the change yet. Check again in a moment.", hash, action });
      }
    } catch (e) {
      setStatus({ phase: "error", message: errorMessage(e), action });
    } finally {
      setBusy(false);
    }
  }

  async function checkAgain() {
    const verify = recheck.current;
    if (!verify) return;
    setBusy(true);
    try {
      const done = await verify();
      if (done) {
        recheck.current = null;
        setStatus((s) => ({ ...s, phase: "success", message: done }));
      } else {
        setStatus((s) => ({ ...s, message: "The accepted state does not show the change yet. Try again shortly." }));
      }
    } catch (e) {
      setStatus((s) => ({ ...s, message: errorMessage(e) }));
    } finally {
      setBusy(false);
    }
  }

  function openDesk(id: string) {
    setKnown((k) => [id, ...k.filter((x) => x !== id)]);
    setDeskId(id);
    setView("desk");
  }

  function onOpenInput() {
    const id = idsFromInput(openInput)[0];
    if (!id) {
      setStatus({ phase: "error", message: "Paste a 64-character desk id or a CutTheLine desk link.", action: "Desk" });
      return;
    }
    setOpenInput("");
    openDesk(id);
  }

  async function onNewDesk() {
    if (openReason) return;
    const s = { id: deskIdOf(me, newName), me, name: newName };
    if (await getDesk(s.id)) {
      setNameTaken(true);
      return;
    }
    await runWrite("Open desk", "open_desk", [pyStrip(newName)], async () => {
      const d = await getDesk(s.id);
      if (!openVerified(d, s)) return null;
      setNewName("");
      openDesk(s.id);
      await loadDesk(s.id, mineIds);
      return `Desk "${d!.name}" is open. Share the desk link; you take and resolve the tickets.`;
    });
  }

  async function onFile() {
    if (!desk || fileReason) return;
    const did = desk.desk_id;
    const s = { id: ticketIdOf(did, me, text), me, text, slotTaken };
    if (await getTicket(s.id)) {
      setFiled(true);
      return;
    }
    await runWrite("File ticket", "file_ticket", [did, pyStrip(text)], async () => {
      const t = await getTicket(s.id);
      const check = fileVerified(t, s);
      if (!check.ok) return null;
      const next = mineIds.includes(s.id) ? mineIds : [s.id, ...mineIds];
      setMineIds(next);
      setText("");
      setFresh(s.id);
      await loadDesk(did, next);
      const k = check.ticket;
      if (k.outcome === "BLOCKS_OTHERS" && k.lane === "FRONT") {
        return `Validators read it as BLOCKS_OTHERS — it holds up people besides you. FRONT lane, ${k.ahead_total === 0 ? "next up" : `${k.ahead_total} ahead`}.`;
      }
      if (k.outcome === "BLOCKS_OTHERS") {
        return `Validators read it as BLOCKS_OTHERS, but your front slot at this desk is taken, so it waits in BACK (front_lane_taken) — ${k.ahead_total} ahead.`;
      }
      return `Validators read it as SELF_ONLY — it holds up only you. BACK lane, ${k.ahead_total} ahead.`;
    });
  }

  async function onTake() {
    if (!desk) return;
    const d = await getDesk(desk.desk_id);
    if (!d || takeBlock(d, me)) return;
    const expected = nextUp(d);
    await runWrite("Take next", "take_next", [d.desk_id], async () => {
      const [after, t] = await Promise.all([getDesk(d.desk_id), getTicket(expected)]);
      if (!takeVerified(after, expected, t)) return null;
      setFresh(expected);
      await loadDesk(d.desk_id, mineIds);
      return `Took ${t!.lane === "FRONT" ? "the FRONT" : "a BACK"} ticket: "${t!.text}" — now in progress.`;
    });
  }

  async function onResolve(t0: Ticket) {
    const [t, d] = await Promise.all([getTicket(t0.ticket_id), getDesk(t0.desk_id)]);
    if (!t || resolveBlock(t, d, me)) return;
    await runWrite("Resolve", "resolve", [t.ticket_id], async () => {
      const after = await getTicket(t.ticket_id);
      if (!resolveVerified(after)) return null;
      await loadDesk(t.desk_id, mineIds);
      return t.lane === "FRONT"
        ? `Resolved. The filer's front slot at this desk is free again.`
        : `Resolved.`;
    });
  }

  async function onWithdraw(t0: Ticket) {
    const t = await getTicket(t0.ticket_id);
    if (!t || withdrawBlock(t, me)) return;
    await runWrite("Withdraw", "withdraw_ticket", [t.ticket_id], async () => {
      const after = await getTicket(t.ticket_id);
      if (!withdrawVerified(after)) return null;
      await loadDesk(t.desk_id, mineIds);
      return "Ticket withdrawn. It no longer counts toward your three waiting tickets.";
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus({ phase: "success", message: "Desk link copied. Anyone can file a ticket here with their own wallet.", action: "Share" });
    } catch {
      setStatus({ phase: "error", message: "Could not copy; copy the address bar instead.", action: "Share" });
    }
  }

  // ---------- one ticket (a render function, not a component) ----------
  function renderTicket(t: Ticket) {
    const tone = t.outcome === "BLOCKS_OTHERS" ? "v-rec" : "v-one";
    const wReason = withdrawBlock(t, me);
    const rReason = resolveBlock(t, desk, me);
    return (
      <article key={t.ticket_id} className={`flash ticket lane-${t.lane.toLowerCase()} st-${t.state.toLowerCase()} ${fresh === t.ticket_id ? "fresh" : ""} ${t.ticket_id === upNext ? "upnext" : ""}`}>
        <header className="flash-top">
          <span className={`due-pill ${t.lane === "FRONT" ? "now" : ""}`}>{t.lane}</span>
          <span className={`verdict ${tone}`}>{t.outcome}</span>
        </header>
        <p className="purpose">{t.text}</p>
        <p className="fine">
          #{t.seq} · filed by {short(t.filer)}{same(t.filer, me) ? " · YOU" : ""} · {placeLine(t)}
          {t.note === "front_lane_taken" ? " · front slot taken" : ""}
        </p>
        {t.ticket_id === upNext && <span className="sig on">Next up</span>}
        <div className="practise">
          {t.state === "IN_PROGRESS" && owner && (
            <button className="btn btn-primary" onClick={() => onResolve(t)} disabled={busy || !!rReason}>Resolve</button>
          )}
          {t.state === "WAITING" && same(t.filer, me) && (
            <button className="btn btn-ghost" onClick={() => onWithdraw(t)} disabled={busy || !!wReason}>Withdraw</button>
          )}
          {t.state === "IN_PROGRESS" && same(t.filer, me) && <span className="reason">{REVERTS.onlyWaiting}</span>}
        </div>
        <footer className="flash-foot mono">{short(t.ticket_id, 8, 6)}</footer>
      </article>
    );
  }

  const front = desk ? desk.front.map((id) => tickets[id]).filter(Boolean) : [];
  const back = desk ? desk.back.map((id) => tickets[id]).filter(Boolean) : [];
  const progress = desk ? desk.in_progress.map((id) => tickets[id]).filter(Boolean) : [];
  const closedMine = mine.filter((t) => t.state === "RESOLVED" || t.state === "WITHDRAWN");

  // ---------- view ----------
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="badge"><img src="/logo-192.png" alt="" width={34} height={34} /></span>
          <div>
            <div className="brand-name">CutTheLine</div>
            <div className="brand-sub">WHO-ELSE-IS-STUCK HELP DESK</div>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {NAV.map((n) => (
            <button key={n.id} className={`tab ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>{n.label}</button>
          ))}
        </nav>
        {me ? <div className="wallet mono" title={me}>◆ {short(me)}</div> : <button className="btn btn-ghost" onClick={connect}>◆ Connect wallet</button>}
      </header>

      <div className={`runtime runtime-${status.phase}`} aria-live="polite">
        <span className="dot" aria-hidden="true" />
        <span className="runtime-tag">{status.phase === "idle" ? "STUDIONET" : (status.action ?? "STATUS").toUpperCase()}</span>
        <span className="runtime-msg">
          {status.phase === "idle" ? <>Contract <a className="mono" href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{short(CONTRACT_ADDRESS, 6, 4)}</a> on GenLayer StudioNet · chain 61999</> : status.message}
        </span>
        {status.hash && <a className="mono runtime-link" href={`${EXPLORER_BASE}/tx/${status.hash}`} target="_blank" rel="noreferrer">tx {short(status.hash, 10, 8)}</a>}
        {status.phase === "delayed" && recheck.current && <button className="btn btn-ghost small" onClick={checkAgain} disabled={busy}>Check again</button>}
      </div>

      <main className="main">
        {view === "overview" && (
          <>
            <section className="hero">
              <div className="hero-left">
                <p className="eyebrow">HELP DESK · AI-READ · GENLAYER</p>
                <h1>If it stops others, it goes first.</h1>
                <p className="lede">
                  File a ticket in one line. GenLayer validators read it once and ask who besides you is stuck: a problem that
                  stops other people goes to the FRONT lane and is served before every BACK ticket, even older ones. One front
                  ticket per person per desk — so the verdict is not a free pass.
                </p>
                <div className="cta">
                  <button className="btn btn-primary big" onClick={() => setView("desk")}>Open a desk →</button>
                  <button className="btn btn-ghost big" onClick={() => setView("verify")}>Verification</button>
                </div>
              </div>
              <div className="hero-right">
                {[
                  ["01", "Describe the problem", "“Main won't build on my laptop…” or “Main won't build, so … neither can anyone else's.” — the same build, a different reach."],
                  ["02", "Read once", "BLOCKS_OTHERS goes FRONT; SELF_ONLY waits in BACK. A second blocking ticket from you keeps its verdict but waits in BACK."],
                  ["03", "Served in order", "The owner always takes the earliest FRONT ticket, and only then the earliest BACK one. Lanes never change after filing."],
                ].map(([n, t, d], i) => (
                  <div className={`step ${i === 0 ? "lit" : ""}`} key={n}>
                    <span className="step-n mono">{n}</span>
                    <div><p className="step-t">{t}</p><p className="step-d">{d}</p></div>
                  </div>
                ))}
              </div>
            </section>
            <section className="features">
              <div className="feature">
                <span className="f-icon" aria-hidden="true">◇</span>
                <h2>Reach, not urgency</h2>
                <p>Nobody grades how urgent or important you say it is. The one question is whether people other than you cannot get on with their work.</p>
              </div>
              <div className="feature">
                <span className="f-icon" aria-hidden="true">✦</span>
                <h2>One front slot each</h2>
                <p>Each wallet holds one open FRONT ticket per desk; it frees when that ticket is resolved or withdrawn. Unclear readings count as SELF_ONLY.</p>
              </div>
              <div className="feature">
                <span className="f-icon" aria-hidden="true">↗</span>
                <h2>See your place</h2>
                <p>Every ticket shows its lane, the verdict and how many tickets are ahead of it. Only the owner takes and resolves; only the filer withdraws.</p>
              </div>
            </section>
          </>
        )}

        {view === "desk" && (
          <>
            <section className="panel head">
              <div>
                <p className="eyebrow">DESK</p>
                <h1>{desk ? desk.name : "Open a desk"}</h1>
                <p className="muted">{desk ? `Owner ${short(desk.owner)}${owner ? " · YOU" : ""} · ${desk.waiting_total} waiting · ${desk.in_progress.length} in progress · ${desk.ticket_count} filed` : "Paste a desk id or link, pick one you used here, or start a new one."}</p>
              </div>
              <div className="row">
                <input className="mono" aria-label="Desk id" placeholder="Desk id or link" value={openInput} onChange={(e) => setOpenInput(e.target.value)} spellCheck={false} />
                <button className="btn btn-ghost" onClick={onOpenInput}>Open</button>
                <button className="btn btn-ghost" onClick={copyLink} disabled={!desk}>Copy desk link</button>
              </div>
            </section>

            {known.length > 0 && (
              <div className="chips-row">
                {known.map((id) => (
                  <button key={id} className={`chip-btn ${id === deskId ? "on" : ""}`} onClick={() => openDesk(id)}>{names[id] ?? short(id, 8, 6)}</button>
                ))}
              </div>
            )}

            {loadState === "loading" && <section className="panel empty"><p className="muted mono">Reading the desk…</p></section>}
            {loadState === "missing" && <section className="panel empty"><p className="reason">{REVERTS.unknownDesk}</p></section>}
            {loadState === "error" && <section className="panel empty"><p className="reason">Could not read this desk. Try again.</p></section>}

            {desk && (
              <section className="ledger-grid">
                <div className="panel form compact">
                  <p className="sense-label">File a ticket</p>
                  <textarea id="ticket" rows={3} placeholder="What is broken, and who besides you is stuck?" value={text} onChange={(e) => setText(e.target.value)} />
                  <div className="form-foot">
                    <span className={`meter mono ${fileBytes > CALLDATA_LIMIT ? "over" : ""}`}>{pyLen(pyStrip(text))} / {MAX_REQUEST_LENGTH} · {fileBytes} / {CALLDATA_LIMIT} bytes</span>
                    <span className="action">
                      {text && fileReason && fileReason !== REVERTS.requestEmpty && <span className="reason">{fileReason}</span>}
                      {!text && fileReason === REVERTS.threeWaiting && <span className="reason">{fileReason}</span>}
                      <button className="btn btn-primary" onClick={onFile} disabled={busy || !!fileReason}>File ticket</button>
                    </span>
                  </div>
                  <p className="fine">
                    {me ? `You have ${mineCount} of ${limits?.max_waiting_per_wallet ?? 3} tickets waiting here · your front slot is ${slotTaken ? "taken" : "free"}` : UI.noWallet}
                  </p>
                  {newTicketId && <p className="fine mono">Ticket id: {newTicketId}</p>}
                </div>
                <div className="panel approvers">
                  <p className="sense-label">Desk owner</p>
                  {owner ? (
                    <>
                      <p className="muted">Next up: {upNext && tickets[upNext] ? <b>{tickets[upNext].lane} · “{tickets[upNext].text}”</b> : "nothing waiting"}</p>
                      <span className="action">
                        <button className="btn btn-primary" onClick={onTake} disabled={busy || !!takeReason}>Take next</button>
                        {takeReason && <span className="reason">{takeReason}</span>}
                      </span>
                    </>
                  ) : (
                    <p className="muted">{short(desk.owner, 8, 6)} takes and resolves tickets here. <span className="reason">{me ? REVERTS.onlyOwnerTake : UI.noWallet}</span></p>
                  )}
                </div>
              </section>
            )}

            {desk && (
              <section className="lanes">
                <div className="lane">
                  <h2 className="lane-title"><span className="due-pill now">FRONT</span> {front.length} waiting</h2>
                  {front.length === 0 && <p className="fine">No front ticket waiting.</p>}
                  {front.map((t) => renderTicket(t))}
                </div>
                <div className="lane">
                  <h2 className="lane-title"><span className="due-pill">BACK</span> {back.length} waiting</h2>
                  {back.length === 0 && <p className="fine">No back ticket waiting.</p>}
                  {back.map((t) => renderTicket(t))}
                </div>
                <div className="lane">
                  <h2 className="lane-title"><span className="due-pill">IN PROGRESS</span> {progress.length}</h2>
                  {progress.length === 0 && <p className="fine">Nothing in progress.</p>}
                  {progress.map((t) => renderTicket(t))}
                </div>
              </section>
            )}

            {desk && closedMine.length > 0 && (
              <section>
                <h2 className="section-title">Your closed tickets</h2>
                <div className="grid">{closedMine.map((t) => renderTicket(t))}</div>
              </section>
            )}

            <section className="panel form">
              <p className="eyebrow">NEW DESK</p>
              <h1>Open a help desk</h1>
              <label htmlFor="dname">Desk name</label>
              <input id="dname" placeholder="Platform help desk" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="form-foot">
                <span className="fine">{pyLen(pyStrip(newName))} / {MAX_DESK_NAME_LENGTH} characters</span>
                <span className="action">
                  {newName && openReason && <span className="reason">{openReason}</span>}
                  <button className="btn btn-primary" onClick={onNewDesk} disabled={busy || !!openReason}>Open desk</button>
                </span>
              </div>
              {newDeskId && <p className="fine mono">Desk id: {newDeskId}</p>}
            </section>
          </>
        )}

        {view === "verify" && (
          <section className="panel form">
            <p className="eyebrow">VERIFICATION</p>
            <h1>What you are talking to</h1>
            <dl className="facts">
              <div><dt>Contract</dt><dd className="mono"><a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS}</a></dd></div>
              <div><dt>Source SHA-256</dt><dd className="mono">{SOURCE_SHA256}</dd></div>
              <div><dt>Contract name · version</dt><dd className="mono">{limits ? `${limits.contract_name ?? "?"} · ${limits.version ?? "?"}` : "reading…"}</dd></div>
              <div><dt>Rubric hash (from get_limits)</dt><dd className="mono">{limits?.rubric_hash ?? "reading…"}</dd></div>
              <div><dt>Front tickets per wallet · waiting cap</dt><dd className="mono">{limits ? `${limits.front_tickets_open_per_wallet} · ${limits.max_waiting_per_wallet}` : "reading…"}</dd></div>
            </dl>
            <p className="muted">
              Every revert the app can predict disables the button and shows the contract's own sentence. Whether a problem
              stops others is decided only by validators inside file_ticket(); the app reads the verdict and the lane back
              from the contract. No money is held.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

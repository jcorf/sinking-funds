import React, { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical, Lock, LockOpen, Plus, X } from 'lucide-react';
import './CreditCards.css';
import { getAllyBankBalance, updateCreditCardOrder } from '../../utils/api';
import { url } from '../../utils/lib';
import { formatMoney, toCents } from '../SinkingFunds/goalMath';
import { MoneyInput } from '../SinkingFunds/GoalParts';

/* ---------------------------------------------------------------------------
   Data helpers. Balance model (unchanged): total = posted + pending − covered.
   Pending and Covered are the sums of their itemized transaction lists.
   --------------------------------------------------------------------------- */

const parseSubs = (json) => {
  try {
    const list = JSON.parse(json || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const sumSubs = (subs) => toCents(subs.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0));

async function postJson(path, body, method = 'POST') {
  try {
    const response = await fetch(url(path), {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return false;
    const result = await response.json().catch(() => ({}));
    // Some routes return a bare true/false, others { success }.
    if (result === false) return false;
    return !(result && result.success === false);
  } catch {
    return false;
  }
}

const SOURCES = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'future', label: 'Future' },
  { value: 'actual', label: 'Actual' },
];

const sourceLabel = (value) => {
  if (!value) return null;
  const known = SOURCES.find((s) => s.value === value);
  return known ? known.label : value;
};

/* ---------------------------------------------------------------------------
   Source picker: Venmo / Future / Actual, or a custom word.
   --------------------------------------------------------------------------- */

function SourcePicker({ value, onChange }) {
  const isCustom = value && !SOURCES.some((s) => s.value === value);
  const [custom, setCustom] = useState(isCustom ? value : '');
  const [editingCustom, setEditingCustom] = useState(false);

  return (
    <span className="cc-sources" role="group" aria-label="Source">
      {SOURCES.map((s) => (
        <button
          key={s.value}
          type="button"
          className={`cc-tag cc-tag-${s.value} ${value === s.value ? 'is-selected' : ''}`}
          aria-pressed={value === s.value}
          onClick={() => onChange(value === s.value ? '' : s.value)}
        >
          {s.label}
        </button>
      ))}
      {editingCustom ? (
        <input
          className="cc-tag-input"
          aria-label="Custom source"
          value={custom}
          autoFocus
          onChange={(e) => setCustom(e.target.value)}
          onBlur={() => {
            setEditingCustom(false);
            if (custom.trim()) onChange(custom.trim());
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
      ) : (
        <button
          type="button"
          className={`cc-tag cc-tag-custom ${isCustom ? 'is-selected' : ''}`}
          aria-pressed={!!isCustom}
          onClick={() => setEditingCustom(true)}
        >
          {isCustom ? value : 'Other…'}
        </button>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Itemized transactions for one card's Pending or Covered amount. Defined at
   module level (stable identity), with its own draft until Save.
   --------------------------------------------------------------------------- */

function TransactionList({ kind, subs, locked, onSave, onClose }) {
  const [draft, setDraft] = useState(() => subs.map((s) => ({ ...s })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const title = kind === 'pending' ? 'Pending transactions' : 'Covered transactions';
  const changed = JSON.stringify(draft) !== JSON.stringify(subs);
  const total = sumSubs(draft);

  const update = (i, field, value) => setDraft((d) => d.map((row, j) => (j === i ? { ...row, [field]: value } : row)));

  const save = async () => {
    setSaving(true);
    setError('');
    const cleaned = draft
      .filter((row) => (row.name || '').trim() || (parseFloat(row.amount) || 0) !== 0)
      .map((row) => ({ name: (row.name || '').trim(), amount: toCents(row.amount), source: row.source || '' }));
    const ok = await onSave(cleaned);
    setSaving(false);
    if (ok) onClose();
    else setError("Couldn't save these transactions. Check that the app's backend is running.");
  };

  return (
    <div className="cc-txns" role="region" aria-label={title}>
      <div className="cc-txns-header">
        <h3>{title}</h3>
        <span className="cc-num cc-txns-total">{formatMoney(total)}</span>
      </div>

      {draft.length === 0 && <p className="cc-muted cc-txns-empty">No transactions.</p>}

      <ul className="cc-txns-list">
        {draft.map((row, i) =>
          locked ? (
            <li key={i} className="cc-txn cc-txn--read">
              <span className="cc-txn-name">{row.name || <span className="cc-muted">Untitled</span>}</span>
              {row.source && <span className="cc-tag is-static">{sourceLabel(row.source)}</span>}
              <span className="cc-num cc-txn-amount">{formatMoney(row.amount)}</span>
            </li>
          ) : (
            <li key={i} className="cc-txn">
              <input
                className="cc-txn-desc"
                aria-label="Description"
                placeholder="Description"
                value={row.name || ''}
                onChange={(e) => update(i, 'name', e.target.value)}
              />
              <MoneyInput
                value={row.amount}
                label={`${row.name || 'Transaction'} amount`}
                onPreview={(v) => update(i, 'amount', v)}
                onCommit={(v) => update(i, 'amount', v)}
              />
              <SourcePicker value={row.source} onChange={(v) => update(i, 'source', v)} />
              <button
                type="button"
                className="cc-icon-button cc-txn-remove"
                aria-label={`Remove ${row.name || 'transaction'}`}
                onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          )
        )}
      </ul>

      {!locked && (
        <div className="cc-txns-footer">
          <button
            type="button"
            className="cc-text-button"
            onClick={() => setDraft((d) => [...d, { name: '', amount: 0, source: '' }])}
          >
            <Plus size={14} aria-hidden="true" /> Add transaction
          </button>
          <span className="cc-txns-buttons">
            <button type="button" className="sf-btn-quiet cc-btn-sm" onClick={onClose}>
              {changed ? 'Cancel' : 'Close'}
            </button>
            <button type="button" className="sf-btn-primary cc-btn-sm" disabled={!changed || saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </span>
        </div>
      )}
      {error && (
        <p className="cc-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   One card row.
   --------------------------------------------------------------------------- */

function CardRow({ card, locked, expanded, onToggle, onPosted, onSaveSubs, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const pendingSubs = parseSubs(card.pending_sub_balances);
  const coveredSubs = parseSubs(card.covered_sub_balances);
  const balance = toCents(card.total_balance);
  const negative = balance < -0.004;

  const toggleButton = (kind, amount, count) => (
    <button
      type="button"
      className={`cc-amount-toggle ${expanded === kind ? 'is-open' : ''}`}
      aria-expanded={expanded === kind}
      onClick={() => onToggle(kind)}
      title={`${count} ${kind} ${count === 1 ? 'transaction' : 'transactions'}`}
    >
      <span className="cc-num">{formatMoney(amount)}</span>
      <ChevronRight size={14} aria-hidden="true" className="cc-chev" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`cc-row ${isDragging ? 'is-dragging' : ''} ${locked ? 'is-locked' : ''} ${expanded ? 'is-expanded' : ''}`}
    >
      <div className="cc-row-grid">
        {locked ? (
          <span className="cc-drag-spacer" aria-hidden="true" />
        ) : (
          <button type="button" className="cc-drag" aria-label={`Reorder ${card.card_name}`} {...attributes} {...listeners}>
            <GripVertical size={16} aria-hidden="true" />
          </button>
        )}
        <span className="cc-name">{card.card_name}</span>
        <span className="cc-col cc-col-posted" data-label="Posted">
          {locked ? (
            <span className="cc-num">{formatMoney(card.posted_transactions)}</span>
          ) : (
            <MoneyInput
              value={card.posted_transactions}
              label={`${card.card_name} posted`}
              onCommit={(v) => onPosted(v)}
            />
          )}
        </span>
        <span className="cc-col" data-label="Pending">
          {toggleButton('pending', card.pending_transactions, pendingSubs.length)}
        </span>
        <span className="cc-col" data-label="Covered">
          {toggleButton('covered', card.covered_transactions, coveredSubs.length)}
        </span>
        <span className={`cc-col cc-balance ${negative ? 'is-negative' : ''}`} data-label="Balance">
          <span className="cc-num" title={negative ? 'More is covered than this card owes' : undefined}>
            {formatMoney(balance)}
          </span>
          {negative && <small>over-covered</small>}
        </span>
        {!locked ? (
          <button
            type="button"
            className="cc-delete"
            onClick={onRemove}
            aria-label={`Delete ${card.card_name}`}
            title={`Delete ${card.card_name}`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <span className="cc-delete-spacer" aria-hidden="true" />
        )}
      </div>

      {expanded && (
        <TransactionList
          key={`${card.id}-${expanded}-${locked}`}
          kind={expanded}
          subs={expanded === 'pending' ? pendingSubs : coveredSubs}
          locked={locked}
          onSave={(subs) => onSaveSubs(expanded, subs)}
          onClose={() => onToggle(expanded)}
        />
      )}
    </li>
  );
}

/* ---------------------------------------------------------------------------
   "Cards vs bucket" panel: total owed − bucket = net change.
   --------------------------------------------------------------------------- */

function NetPanel({ totalOwed, bucket, ready, locked, onBucket }) {
  const [expanded, setExpanded] = useState(false);
  // Until both the cards and the bucket have loaded, show placeholders rather
  // than a net computed from partial data (which flashed red, then green).
  const net = ready && bucket !== null ? toCents(totalOwed - bucket) : null;
  const state = net === null ? 'loading' : net > 0.004 ? 'short' : net < -0.004 ? 'ahead' : 'even';
  const label = {
    loading: ready ? "Couldn't load the bucket" : 'Loading…',
    short: 'Move into the bucket',
    ahead: 'Bucket covers your cards',
    even: 'Bucket matches your cards',
  }[state];
  const note = {
    loading: '',
    short: `Your cards owe ${formatMoney(net)} more than the bucket holds.`,
    ahead: `${formatMoney(-(net || 0))} to spare.`,
    even: 'Nothing to move.',
  }[state];
  const shownNet = net === null ? '—' : formatMoney(Math.abs(net));

  return (
    <aside className={`cc-net is-${state} ${expanded ? 'is-expanded' : ''}`} aria-label="Cards vs bucket">
      <button type="button" className="cc-net-bar" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
        <span className="cc-net-bar-item">
          <span className="cc-net-bar-label">{label}</span>
          <span className="cc-net-bar-value cc-num">{shownNet}</span>
        </span>
        <ChevronRight size={16} aria-hidden="true" className={`cc-net-bar-chev ${expanded ? 'is-open' : ''}`} />
      </button>

      <div className="cc-net-body">
        <h2 className="cc-net-title">Cards vs bucket</h2>
        <dl className="cc-net-list">
          <div className="cc-net-line">
            <dt>Total owed</dt>
            <dd className="cc-num">{ready ? formatMoney(totalOwed) : '—'}</dd>
          </div>
          <div className="cc-net-line">
            <dt>
              <span className="cc-op">−</span>Allocated
            </dt>
            <dd>
              {locked || !ready ? (
                <span className="cc-num">{!ready || bucket === null ? '—' : formatMoney(bucket)}</span>
              ) : (
                <MoneyInput value={bucket || 0} label="Allocated" onCommit={onBucket} />
              )}
            </dd>
          </div>
        </dl>
        <div className="cc-net-result" aria-live="polite">
          <div className="cc-net-label">{label}</div>
          <div className="cc-net-value cc-num">{shownNet}</div>
          {note && <p className="cc-net-note">{note}</p>}
        </div>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

const LOCK_KEY = 'credit-cards:locked';

// Last-known cards and bucket, kept across page visits so switching back to
// this page shows the figures immediately (no "—" then number flash) while a
// fresh copy loads quietly in the background.
const cache = { cards: null, bucket: null, bucketLoaded: false };

const CreditCards = () => {
  const [cards, setCards] = useState(cache.cards || []);
  const [loaded, setLoaded] = useState(cache.cards !== null);
  const [bucket, setBucket] = useState(cache.bucket);
  const [bucketLoaded, setBucketLoaded] = useState(cache.bucketLoaded);
  const [expanded, setExpanded] = useState({}); // { [cardId]: 'pending' | 'covered' }
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(() => {
    try {
      return window.localStorage.getItem(LOCK_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(url('/get_credit_cards'), { credentials: 'include' });
      const data = await response.json();
      cache.cards = data.data || [];
      setCards(cache.cards);
    } catch {
      setError("Couldn't load your cards.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    getAllyBankBalance().then((b) => {
      cache.bucket = b;
      cache.bucketLoaded = true;
      setBucket(b);
      setBucketLoaded(true);
    });
  }, [refresh]);

  const toggleLocked = () => {
    setLocked((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LOCK_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const totalOwed = toCents(cards.reduce((sum, c) => sum + (Number(c.total_balance) || 0), 0));

  const fail = (msg) => setError(msg);

  const updatePosted = async (card, value) => {
    setError('');
    const posted = toCents(value);
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, posted_transactions: posted, total_balance: toCents(posted + c.pending_transactions - c.covered_transactions) }
          : c
      )
    );
    const ok = await postJson('/update_credit_card_balance', {
      card_name: card.card_name,
      field: 'posted_transactions',
      new_value: posted,
    });
    if (!ok) fail(`Couldn't save ${card.card_name}'s posted balance.`);
    refresh();
  };

  const saveSubs = async (card, kind, subs) => {
    setError('');
    const ok = await postJson(`/update_${kind}_sub_balances`, { card_name: card.card_name, sub_balances: subs });
    await refresh();
    return ok;
  };

  // Saved once when the field is left (not per keystroke); Net change uses
  // the new value immediately because it's derived from state on render.
  const updateBucket = async (value) => {
    setError('');
    const previous = bucket;
    setBucket(toCents(value));
    cache.bucket = toCents(value);
    const ok = await postJson('/update_ally_bank_balance', { balance: toCents(value) });
    if (!ok) {
      setBucket(previous);
      cache.bucket = previous;
      fail("Couldn't save the bucket balance.");
    }
  };

  const addCard = async (name) => {
    if (!name.trim()) return;
    if (cards.some((c) => c.card_name.toLowerCase() === name.trim().toLowerCase())) {
      fail(`You already have a card called "${name.trim()}".`);
      return;
    }
    setError('');
    const ok = await postJson('/add_credit_card', { card_name: name.trim() });
    if (!ok) fail("Couldn't add the card.");
    refresh();
  };

  const removeCard = async (card) => {
    if (!window.confirm(`Delete the ${card.card_name} card? This can't be undone.`)) return;
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    const ok = await postJson('/remove_credit_card', { card_name: card.card_name }, 'DELETE');
    if (!ok) fail(`Couldn't delete ${card.card_name}.`);
    refresh();
  };

  const toggleExpanded = (cardId, kind) =>
    setExpanded((prev) => ({ ...prev, [cardId]: prev[cardId] === kind ? null : kind }));

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setCards((items) => {
      const reordered = arrayMove(
        items,
        items.findIndex((c) => c.id === active.id),
        items.findIndex((c) => c.id === over.id)
      );
      updateCreditCardOrder(reordered.map((c) => c.id));
      cache.cards = reordered;
      return reordered;
    });
  };

  const activeCard = cards.find((c) => c.id === activeId);

  return (
    <div className="cc-page">
      <header className="cc-page-header">
        <h1>CC Payment</h1>
        <button
          type="button"
          className={`cc-lock ${locked ? '' : 'is-unlocked'}`}
          onClick={toggleLocked}
          aria-pressed={!locked}
          title={locked ? 'Unlock to edit balances, transactions, and cards' : 'Lock to show a clean read-only view'}
        >
          {locked ? <Lock size={15} aria-hidden="true" /> : <LockOpen size={15} aria-hidden="true" />}
          {locked ? 'Unlock to edit' : 'Lock'}
        </button>
      </header>

      <div className="cc-layout">
        <div className="cc-main">
          <section>
            <header className="cc-section-header">
              <h2>Cards</h2>
            </header>

            {error && (
              <p className="cc-error cc-page-error" role="alert">
                {error}
              </p>
            )}

            <div className="cc-list">
              {cards.length > 0 && (
                <div className={`cc-row-grid cc-col-heads ${locked ? 'is-locked' : ''}`} aria-hidden="true">
                  <span />
                  <span>Card</span>
                  <span className="cc-col">Posted</span>
                  <span className="cc-col">Pending</span>
                  <span className="cc-col">Covered</span>
                  <span className="cc-col">Balance</span>
                  <span />
                </div>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragCancel={() => setActiveId(null)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <ul className="cc-rows">
                    {loaded && cards.length === 0 && (
                      <li className="cc-empty">
                        {locked ? 'No cards yet. Unlock to add one.' : 'No cards yet. Add your first one below.'}
                      </li>
                    )}
                    {cards.map((card) => (
                      <CardRow
                        key={card.id}
                        card={card}
                        locked={locked}
                        expanded={expanded[card.id] || null}
                        onToggle={(kind) => toggleExpanded(card.id, kind)}
                        onPosted={(v) => updatePosted(card, v)}
                        onSaveSubs={(kind, subs) => saveSubs(card, kind, subs)}
                        onRemove={() => removeCard(card)}
                      />
                    ))}
                    {!locked && (
                      <li className="cc-add">
                        <Plus size={16} aria-hidden="true" />
                        <input
                          type="text"
                          placeholder="Add a card…"
                          aria-label="Add a card"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addCard(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                      </li>
                    )}
                  </ul>
                </SortableContext>
                <DragOverlay>
                  {activeCard ? (
                    <div className="cc-row cc-row--overlay">
                      <div className="cc-row-grid">
                        <span className="cc-drag">
                          <GripVertical size={16} aria-hidden="true" />
                        </span>
                        <span className="cc-name">{activeCard.card_name}</span>
                        <span />
                        <span />
                        <span />
                        <span className="cc-col cc-balance">
                          <span className="cc-num">{formatMoney(activeCard.total_balance)}</span>
                        </span>
                        <span />
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </section>
        </div>

        <NetPanel
          totalOwed={totalOwed}
          bucket={bucket}
          ready={loaded && bucketLoaded}
          locked={locked}
          onBucket={updateBucket}
        />
      </div>
    </div>
  );
};

export default CreditCards;

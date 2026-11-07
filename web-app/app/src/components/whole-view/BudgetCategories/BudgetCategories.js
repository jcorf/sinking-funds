import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Lock, LockOpen } from 'lucide-react';
import './BudgetCategories.css';
import {
  getBudgetCategories,
  addBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  updateBudgetCategoryOrder,
  getPaycheckSettings,
  updatePaycheckSettings,
  getPostTaxContributions,
  addPostTaxContribution,
  updatePostTaxContribution,
  deletePostTaxContribution,
  updatePostTaxContributionOrder,
  getPreTaxBenefits,
  addPreTaxBenefit,
  updatePreTaxBenefit,
  deletePreTaxBenefit,
  updatePreTaxBenefitOrder,
  getPostTaxBenefits,
  addPostTaxBenefit,
  updatePostTaxBenefit,
  deletePostTaxBenefit,
  updatePostTaxBenefitOrder,
} from '../../utils/api';

const parseDecimalInput = (value) => {
  if (!value || value === '') return 0.0;
  if (value === '.' || value === '0.') return 0.0;
  if (value.endsWith('.')) return parseFloat(value.slice(0, -1)) || 0.0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0.0 : parsed;
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const sumAmounts = (items) => items.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

// Each editable list on this page is the same shape ("named thing + dollar
// amount, sortable, deletable") backed by its own set of endpoints.
const CATEGORY_API = {
  fetchAll: getBudgetCategories,
  add: addBudgetCategory,
  update: updateBudgetCategory,
  remove: deleteBudgetCategory,
  reorder: updateBudgetCategoryOrder,
};
const PRE_TAX_BENEFIT_API = {
  fetchAll: getPreTaxBenefits,
  add: addPreTaxBenefit,
  update: updatePreTaxBenefit,
  remove: deletePreTaxBenefit,
  reorder: updatePreTaxBenefitOrder,
};
const POST_TAX_INVESTMENT_API = {
  fetchAll: getPostTaxContributions,
  add: addPostTaxContribution,
  update: updatePostTaxContribution,
  remove: deletePostTaxContribution,
  reorder: updatePostTaxContributionOrder,
};
const POST_TAX_BENEFIT_API = {
  fetchAll: getPostTaxBenefits,
  add: addPostTaxBenefit,
  update: updatePostTaxBenefit,
  remove: deletePostTaxBenefit,
  reorder: updatePostTaxBenefitOrder,
};

// Last-known lists and paycheck settings, kept across page visits so coming
// back to this page shows real numbers immediately (no $0 -> real flash)
// while a fresh copy loads quietly in the background.
const listCache = new Map();
let settingsCache = null;

function useAmountList(api) {
  const [items, setItems] = useState(() => listCache.get(api) || []);
  const [loaded, setLoaded] = useState(() => listCache.has(api));

  const refetch = useCallback(async () => {
    const data = await api.fetchAll();
    setItems(data.data || []);
    setLoaded(true);
  }, [api]);

  // Keep the cache in step with every change (fetches, edits, reorders).
  useEffect(() => {
    if (loaded) listCache.set(api, items);
  }, [api, items, loaded]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addItem = async (name) => {
    if (!name.trim()) return;
    await api.add(name.trim(), 0);
    refetch();
  };

  const removeItem = async (name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    setItems((prev) => prev.filter((c) => c.category !== name));
    try {
      await api.remove(name);
    } finally {
      refetch();
    }
  };

  // Local-only: keeps the totals live while a value is being typed.
  const previewAmount = (id, amount) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, amount } : c)));
  };

  const commitAmount = async (name, amount) => {
    setItems((prev) => prev.map((c) => (c.category === name ? { ...c, amount } : c)));
    try {
      await api.update(name, 'amount', amount);
    } finally {
      refetch();
    }
  };

  const move = (activeId, overId) => {
    setItems((prev) => {
      const reordered = arrayMove(
        prev,
        prev.findIndex((c) => c.id === activeId),
        prev.findIndex((c) => c.id === overId)
      );
      api.reorder(reordered.map((c) => c.id));
      return reordered;
    });
  };

  return { items, loaded, total: sumAmounts(items), addItem, removeItem, previewAmount, commitAmount, move };
}

// Remembers which setup sections are collapsed. Best effort: storage can be
// unavailable (private window, blocked site data), so it must never throw.
const COLLAPSE_KEY = 'budget-categories:collapsed';

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(COLLAPSE_KEY)) || {};
    } catch {
      return {};
    }
  });

  const toggle = (key) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return [collapsed, toggle];
}

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true">
      {[3, 8, 13].map((y) => (
        <g key={y}>
          <circle cx="3" cy={y} r="1.4" />
          <circle cx="9" cy={y} r="1.4" />
        </g>
      ))}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M3.5 1.5L7 5l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A "$ [ 0.00 ]" input that edits a dollar amount as text, reports every
// keystroke for live totals, and commits once on blur (or Enter).
function MoneyInput({ id, value, label, onPreview, onCommit }) {
  const [text, setText] = useState(parseFloat(value || 0).toFixed(2));
  const focused = useRef(false);
  // Value when editing began. onPreview updates `value` live, so comparing
  // against it on blur would always look unchanged.
  const startValue = useRef(0);

  // Follow server updates, but never overwrite what's being typed.
  useEffect(() => {
    if (!focused.current) setText(parseFloat(value || 0).toFixed(2));
  }, [value]);

  return (
    <span className="bc-money">
      <span className="bc-money-sign" aria-hidden="true">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={text}
        onFocus={(e) => {
          focused.current = true;
          startValue.current = parseFloat(value || 0);
          e.target.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          onPreview && onPreview(parseDecimalInput(e.target.value));
        }}
        onBlur={() => {
          focused.current = false;
          const amount = parseDecimalInput(text);
          setText(amount.toFixed(2));
          if (amount !== startValue.current) onCommit(amount);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur();
        }}
      />
    </span>
  );
}

function AmountRow({ item, list, locked }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bc-row ${isDragging ? 'is-dragging' : ''} ${locked ? 'is-locked' : ''}`}
    >
      {locked ? (
        <span className="bc-drag-spacer" aria-hidden="true" />
      ) : (
        <button
          type="button"
          className="bc-drag"
          aria-label={`Reorder ${item.category}`}
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
      )}
      <span className="bc-row-name">{item.category}</span>
      {locked ? (
        <span className="bc-amount-text">{formatCurrency(item.amount || 0)}</span>
      ) : (
        <>
          <MoneyInput
            value={item.amount}
            label={`${item.category} per paycheck`}
            onPreview={(amount) => list.previewAmount(item.id, amount)}
            onCommit={(amount) => list.commitAmount(item.category, amount)}
          />
          <button
            type="button"
            className="bc-delete"
            onClick={() => list.removeItem(item.category)}
            aria-label={`Delete ${item.category}`}
            title={`Delete ${item.category}`}
          >
            <CloseIcon />
          </button>
        </>
      )}
    </li>
  );
}

function AmountList({ list, addPlaceholder, emptyText, locked }) {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const active = list.items.find((c) => c.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={({ active: a, over }) => {
        setActiveId(null);
        if (over && a.id !== over.id) list.move(a.id, over.id);
      }}
    >
      <SortableContext items={list.items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="bc-list">
          {list.items.length === 0 && (emptyText || locked) && (
            <li className="bc-empty">{locked ? 'Nothing here yet. Unlock to add one.' : emptyText}</li>
          )}
          {list.items.map((item) => (
            <AmountRow key={item.id} item={item} list={list} locked={locked} />
          ))}
          {!locked && (
          <li className="bc-add">
            <input
              type="text"
              placeholder={addPlaceholder}
              aria-label={addPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  list.addItem(e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </li>
          )}
        </ul>
      </SortableContext>
      <DragOverlay>
        {active ? (
          <div className="bc-row bc-row--overlay">
            <span className="bc-drag">
              <GripIcon />
            </span>
            <span className="bc-row-name">{active.category}</span>
            <span className="bc-overlay-amount">{formatCurrency(active.amount || 0)}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SetupSection({ id, label, total, collapsed, onToggle, children }) {
  const bodyId = `bc-section-${id}`;
  return (
    <section className="bc-setup-section">
      <button
        type="button"
        className={`bc-section-toggle ${collapsed ? '' : 'is-open'}`}
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span className="bc-chevron">
          <ChevronIcon />
        </span>
        <span className="bc-section-toggle-label">{label}</span>
        <span className="bc-section-total">{total === null ? '—' : formatCurrency(total)}</span>
      </button>
      {!collapsed && <div id={bodyId}>{children}</div>}
    </section>
  );
}

function MathLine({ label, amount, operator, emphasis }) {
  return (
    <div className={`bc-math-line ${emphasis ? 'is-subtotal' : ''}`}>
      <dt>
        {operator && <span className="bc-op">{operator}</span>}
        {label}
      </dt>
      <dd>{amount === null ? '—' : formatCurrency(amount)}</dd>
    </div>
  );
}

function PaycheckMath({ gross, preTax, taxes, postTax, categories, onSetGross, ready = true }) {
  const [expanded, setExpanded] = useState(false);
  const available = gross - preTax - taxes - postTax;
  const leftover = available - categories;
  // With no gross pay entered there is nothing to be "over" yet. Until every
  // input has loaded, show placeholders instead of math on partial data.
  const noPay = ready && gross === 0;
  const over = ready && !noPay && leftover < -0.004;
  const exact = ready && !noPay && Math.abs(leftover) < 0.005;

  const leftoverLabel = !ready ? 'Loading…' : over ? 'Over budget by' : 'Leftover';
  const leftoverAmount = !ready || noPay ? '—' : formatCurrency(Math.abs(leftover));
  const money = (n) => (ready ? n : null);

  return (
    <aside
      className={`bc-math ${expanded ? 'is-expanded' : ''} ${over ? 'is-over' : ''}`}
      aria-label="This paycheck"
    >
      {/* Compact bar, shown only on narrow screens */}
      <button
        type="button"
        className="bc-math-bar"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="bc-math-bar-item">
          <span className="bc-math-bar-label">Available</span>
          <span className="bc-math-bar-value">{ready ? formatCurrency(available) : '—'}</span>
        </span>
        <span className="bc-math-bar-item">
          <span className="bc-math-bar-label">{leftoverLabel}</span>
          <span className="bc-math-bar-value bc-leftover-value">{leftoverAmount}</span>
        </span>
        <span className={`bc-chevron bc-math-bar-chevron ${expanded ? 'is-open' : ''}`}>
          <ChevronIcon />
        </span>
      </button>

      <div className="bc-math-body">
        <h2 className="bc-math-title">This paycheck</h2>
        <dl className="bc-math-list">
          <MathLine label="Gross pay" amount={money(gross)} />
          <MathLine operator="−" label="Pre-tax" amount={money(preTax)} />
          <MathLine operator="−" label="Taxes" amount={money(taxes)} />
          <MathLine label="Net pay" amount={money(gross - preTax - taxes)} emphasis />
          <MathLine operator="−" label="Post-tax" amount={money(postTax)} />
          <MathLine label="Available to budget" amount={money(available)} emphasis />
          <MathLine operator="−" label="Pre-budgeted" amount={money(categories)} />
        </dl>

        <div className="bc-leftover" aria-live="polite">
          <div className="bc-leftover-label">{leftoverLabel}</div>
          <div className="bc-leftover-value">{leftoverAmount}</div>
          {noPay ? (
            <p className="bc-leftover-note">
              Add your gross pay to see what’s left.{' '}
              <button type="button" className="bc-link" onClick={onSetGross}>
                Set gross pay
              </button>
            </p>
          ) : over ? (
            <p className="bc-leftover-note">Trim a category to bring this back to zero.</p>
          ) : exact ? (
            <p className="bc-leftover-note">Every dollar is assigned.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

const BudgetCategories = () => {
  const categories = useAmountList(CATEGORY_API);
  const preTaxBenefits = useAmountList(PRE_TAX_BENEFIT_API);
  const postTaxInvestments = useAmountList(POST_TAX_INVESTMENT_API);
  const postTaxBenefits = useAmountList(POST_TAX_BENEFIT_API);
  const [collapsed, toggleCollapsed] = useCollapsed();
  // Locked (the default) shows clean read-only amounts; unlock to edit.
  const [locked, setLocked] = useState(() => {
    try {
      return window.localStorage.getItem('budget-categories:locked') !== 'false';
    } catch {
      return true;
    }
  });
  const toggleLocked = () => {
    setLocked((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('budget-categories:locked', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Standing values (the backend field is still called net_pay, but it holds gross pay).
  const [settings, setSettings] = useState(settingsCache || { net_pay: 0, pre_tax_retirement: 0, taxes: 0 });
  const [settingsLoaded, setSettingsLoaded] = useState(settingsCache !== null);

  useEffect(() => {
    getPaycheckSettings().then((s) => {
      setSettings({
        net_pay: parseFloat(s.net_pay || 0),
        pre_tax_retirement: parseFloat(s.pre_tax_retirement || 0),
        taxes: parseFloat(s.taxes || 0),
      });
      setSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (settingsLoaded) settingsCache = settings;
  }, [settings, settingsLoaded]);

  // Only show the paycheck math once every input has loaded at least once.
  const ready =
    settingsLoaded && categories.loaded && preTaxBenefits.loaded && postTaxInvestments.loaded && postTaxBenefits.loaded;

  const previewSetting = (field) => (amount) => setSettings((prev) => ({ ...prev, [field]: amount }));
  const commitSetting = (field) => (amount) => {
    setSettings((prev) => ({ ...prev, [field]: amount }));
    updatePaycheckSettings(field, amount);
  };

  const focusGross = () => {
    const input = document.getElementById('bc-gross-pay');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
    }
  };

  const totalPreTax = settings.pre_tax_retirement + preTaxBenefits.total;
  const totalPostTax = postTaxInvestments.total + postTaxBenefits.total;

  const standingValues = [
    { field: 'net_pay', id: 'bc-gross-pay', label: 'Gross pay' },
    { field: 'pre_tax_retirement', id: 'bc-pre-tax-retirement', label: 'Pre-tax retirement' },
    { field: 'taxes', id: 'bc-taxes', label: 'Taxes' },
  ];

  return (
    <div className="bc-page">
      <header className="bc-page-header">
        <h1>Paycheck</h1>
        <button
          type="button"
          className={`bc-lock ${locked ? '' : 'is-unlocked'}`}
          onClick={toggleLocked}
          aria-pressed={!locked}
          title={locked ? 'Unlock to edit amounts, reorder, add or delete' : 'Lock to show a clean read-only view'}
        >
          {locked ? <Lock size={15} aria-hidden="true" /> : <LockOpen size={15} aria-hidden="true" />}
          {locked ? 'Unlock to edit' : 'Lock'}
        </button>
      </header>

      <div className="bc-layout">
        <div className="bc-main">
          <section className="bc-section">
            <header className="bc-section-header">
              <h2>Categories</h2>
              <span className="bc-section-total">
                {categories.loaded ? formatCurrency(categories.total) : '—'}
                <span className="bc-section-total-unit"> per paycheck</span>
              </span>
            </header>
            <AmountList
              list={categories}
              addPlaceholder="Add a category…"
              emptyText="No categories yet. Add your first one below."
              locked={locked}
            />
          </section>

          <section className="bc-section">
            <header className="bc-section-header">
              <h2>Paycheck setup</h2>
            </header>

            <ul className="bc-list">
              {standingValues.map(({ field, id, label }) => (
                <li className={`bc-row bc-row--static ${locked ? 'is-locked' : ''}`} key={field}>
                  <label className="bc-row-name" htmlFor={id}>
                    {label}
                  </label>
                  {locked ? (
                    <span className="bc-amount-text" id={id}>
                      {formatCurrency(settings[field] || 0)}
                    </span>
                  ) : (
                    <MoneyInput
                      id={id}
                      value={settings[field]}
                      label={`${label} per paycheck`}
                      onPreview={previewSetting(field)}
                      onCommit={commitSetting(field)}
                    />
                  )}
                </li>
              ))}
            </ul>

            <SetupSection
              id="pre-tax-benefits"
              label="Pre-Tax Contributions"
              total={preTaxBenefits.loaded ? preTaxBenefits.total : null}
              collapsed={!!collapsed.preTaxBenefits}
              onToggle={() => toggleCollapsed('preTaxBenefits')}
            >
              <AmountList list={preTaxBenefits} addPlaceholder="Add a pre-tax contribution…" locked={locked} />
            </SetupSection>

            <SetupSection
              id="post-tax-investments"
              label="Post-Tax Retirement & Investments"
              total={postTaxInvestments.loaded ? postTaxInvestments.total : null}
              collapsed={!!collapsed.postTaxInvestments}
              onToggle={() => toggleCollapsed('postTaxInvestments')}
            >
              <AmountList list={postTaxInvestments} addPlaceholder="Add a post-tax investment…" locked={locked} />
            </SetupSection>

            <SetupSection
              id="post-tax-benefits"
              label="Post-Tax Other Contributions"
              total={postTaxBenefits.loaded ? postTaxBenefits.total : null}
              collapsed={!!collapsed.postTaxBenefits}
              onToggle={() => toggleCollapsed('postTaxBenefits')}
            >
              <AmountList list={postTaxBenefits} addPlaceholder="Add a post-tax contribution…" locked={locked} />
            </SetupSection>
          </section>
        </div>

        <PaycheckMath
          gross={settings.net_pay}
          preTax={totalPreTax}
          taxes={settings.taxes}
          postTax={totalPostTax}
          categories={categories.total}
          onSetGross={focusGross}
          ready={ready}
        />
      </div>
    </div>
  );
};

export default BudgetCategories;

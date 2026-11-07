import React, { useEffect, useState } from 'react';
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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

function CollapsibleHeading({ label, expanded, onToggle }) {
  return (
    <h2 className="post-tax-heading collapsible-heading" onClick={onToggle}>
      <span className={`collapse-chevron ${expanded ? 'expanded' : ''}`}>▸</span>
      {label}
    </h2>
  );
}

// Shared by every editable amount list on this page (budget categories,
// post-tax investments, pre-tax benefits, post-tax benefits) -- they're all
// "named thing + dollar amount, sortable, deletable."
function SortableAmountRow({ item, removeItem, updateItem }) {
  const [localAmount, setLocalAmount] = useState(parseFloat(item.amount).toFixed(2));

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    setLocalAmount(parseFloat(item.amount).toFixed(2));
  }, [item.amount]);

  return (
    <div ref={setNodeRef} style={style} className="budget-category-row">
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      <button
        className="delete-card-btn"
        onClick={() => removeItem(item.category)}
        title={`Delete ${item.category}`}
      >
        ×
      </button>

      <div className="category-title-section">
        <h3>{item.category}</h3>
      </div>

      <div className="category-inputs-section">
        <div className="amount-field">
          <label>Amount per paycheck</label>
          <input
            type="text"
            inputMode="decimal"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onBlur={() => {
              const value = parseDecimalInput(localAmount);
              setLocalAmount(value.toFixed(2));
              updateItem(item.category, 'amount', value);
            }}
          />
        </div>
      </div>
    </div>
  );
}

const BudgetCategories = () => {
  const [view, setView] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [netPay, setNetPay] = useState('0.00');
  const [preTaxRetirement, setPreTaxRetirement] = useState('0.00');
  const [taxes, setTaxes] = useState('0.00');

  const [postTaxContributions, setPostTaxContributions] = useState([]);
  const [activePostTaxId, setActivePostTaxId] = useState(null);

  const [preTaxBenefits, setPreTaxBenefits] = useState([]);
  const [activePreTaxBenefitId, setActivePreTaxBenefitId] = useState(null);

  const [postTaxBenefits, setPostTaxBenefits] = useState([]);
  const [activePostTaxBenefitId, setActivePostTaxBenefitId] = useState(null);

  // Purely visual: hides the list + add-row for a section without affecting
  // its total or the Leftover calculation.
  const [showPreTaxBenefits, setShowPreTaxBenefits] = useState(true);
  const [showPostTaxInvestments, setShowPostTaxInvestments] = useState(true);
  const [showPostTaxBenefits, setShowPostTaxBenefits] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
    fetchPaycheckSettings();
    fetchPostTaxContributions();
    fetchPreTaxBenefits();
    fetchPostTaxBenefits();
  }, []);

  const fetchCategories = async () => {
    const data = await getBudgetCategories();
    setCategories(data.data || []);
  };

  const fetchPaycheckSettings = async () => {
    const settings = await getPaycheckSettings();
    setNetPay(parseFloat(settings.net_pay || 0).toFixed(2));
    setPreTaxRetirement(parseFloat(settings.pre_tax_retirement || 0).toFixed(2));
    setTaxes(parseFloat(settings.taxes || 0).toFixed(2));
  };

  const fetchPostTaxContributions = async () => {
    const data = await getPostTaxContributions();
    setPostTaxContributions(data.data || []);
  };

  const fetchPreTaxBenefits = async () => {
    const data = await getPreTaxBenefits();
    setPreTaxBenefits(data.data || []);
  };

  const fetchPostTaxBenefits = async () => {
    const data = await getPostTaxBenefits();
    setPostTaxBenefits(data.data || []);
  };

  const addCategory = async (categoryName) => {
    if (!categoryName.trim()) return;
    await addBudgetCategory(categoryName, 0);
    fetchCategories();
  };

  const removeCategory = async (categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) return;

    setCategories((prev) => prev.filter((c) => c.category !== categoryName));

    try {
      await deleteBudgetCategory(categoryName);
    } finally {
      fetchCategories();
    }
  };

  const updateCategory = async (categoryName, field, value) => {
    setCategories((prev) =>
      prev.map((c) => (c.category === categoryName ? { ...c, [field]: value } : c))
    );

    try {
      await updateBudgetCategory(categoryName, field, value);
    } finally {
      fetchCategories();
    }
  };

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        updateBudgetCategoryOrder(reorderedItems.map((item) => item.id));
        return reorderedItems;
      });
    }
  }

  const commitNetPay = () => {
    const value = parseDecimalInput(netPay);
    setNetPay(value.toFixed(2));
    updatePaycheckSettings('net_pay', value);
  };

  const commitPreTaxRetirement = () => {
    const value = parseDecimalInput(preTaxRetirement);
    setPreTaxRetirement(value.toFixed(2));
    updatePaycheckSettings('pre_tax_retirement', value);
  };

  const commitTaxes = () => {
    const value = parseDecimalInput(taxes);
    setTaxes(value.toFixed(2));
    updatePaycheckSettings('taxes', value);
  };

  const addPostTaxCategory = async (categoryName) => {
    if (!categoryName.trim()) return;
    await addPostTaxContribution(categoryName, 0);
    fetchPostTaxContributions();
  };

  const removePostTaxCategory = async (categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) return;

    setPostTaxContributions((prev) => prev.filter((c) => c.category !== categoryName));

    try {
      await deletePostTaxContribution(categoryName);
    } finally {
      fetchPostTaxContributions();
    }
  };

  const updatePostTaxCategory = async (categoryName, field, value) => {
    setPostTaxContributions((prev) =>
      prev.map((c) => (c.category === categoryName ? { ...c, [field]: value } : c))
    );

    try {
      await updatePostTaxContribution(categoryName, field, value);
    } finally {
      fetchPostTaxContributions();
    }
  };

  function handlePostTaxDragStart(event) {
    setActivePostTaxId(event.active.id);
  }

  function handlePostTaxDragEnd(event) {
    const { active, over } = event;
    setActivePostTaxId(null);

    if (over && active.id !== over.id) {
      setPostTaxContributions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        updatePostTaxContributionOrder(reorderedItems.map((item) => item.id));
        return reorderedItems;
      });
    }
  }

  const addPreTaxBenefitCategory = async (categoryName) => {
    if (!categoryName.trim()) return;
    await addPreTaxBenefit(categoryName, 0);
    fetchPreTaxBenefits();
  };

  const removePreTaxBenefitCategory = async (categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) return;

    setPreTaxBenefits((prev) => prev.filter((c) => c.category !== categoryName));

    try {
      await deletePreTaxBenefit(categoryName);
    } finally {
      fetchPreTaxBenefits();
    }
  };

  const updatePreTaxBenefitCategory = async (categoryName, field, value) => {
    setPreTaxBenefits((prev) =>
      prev.map((c) => (c.category === categoryName ? { ...c, [field]: value } : c))
    );

    try {
      await updatePreTaxBenefit(categoryName, field, value);
    } finally {
      fetchPreTaxBenefits();
    }
  };

  function handlePreTaxBenefitDragStart(event) {
    setActivePreTaxBenefitId(event.active.id);
  }

  function handlePreTaxBenefitDragEnd(event) {
    const { active, over } = event;
    setActivePreTaxBenefitId(null);

    if (over && active.id !== over.id) {
      setPreTaxBenefits((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        updatePreTaxBenefitOrder(reorderedItems.map((item) => item.id));
        return reorderedItems;
      });
    }
  }

  const addPostTaxBenefitCategory = async (categoryName) => {
    if (!categoryName.trim()) return;
    await addPostTaxBenefit(categoryName, 0);
    fetchPostTaxBenefits();
  };

  const removePostTaxBenefitCategory = async (categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) return;

    setPostTaxBenefits((prev) => prev.filter((c) => c.category !== categoryName));

    try {
      await deletePostTaxBenefit(categoryName);
    } finally {
      fetchPostTaxBenefits();
    }
  };

  const updatePostTaxBenefitCategory = async (categoryName, field, value) => {
    setPostTaxBenefits((prev) =>
      prev.map((c) => (c.category === categoryName ? { ...c, [field]: value } : c))
    );

    try {
      await updatePostTaxBenefit(categoryName, field, value);
    } finally {
      fetchPostTaxBenefits();
    }
  };

  function handlePostTaxBenefitDragStart(event) {
    setActivePostTaxBenefitId(event.active.id);
  }

  function handlePostTaxBenefitDragEnd(event) {
    const { active, over } = event;
    setActivePostTaxBenefitId(null);

    if (over && active.id !== over.id) {
      setPostTaxBenefits((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        updatePostTaxBenefitOrder(reorderedItems.map((item) => item.id));
        return reorderedItems;
      });
    }
  }

  const totalPerPaycheck = categories.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalPostTaxContributions = postTaxContributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalPreTaxBenefits = preTaxBenefits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalPostTaxBenefits = postTaxBenefits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  // Pre-Tax Retirement and Post-Tax Investments are their own standing
  // input/list, but Benefits combine with their counterpart into a single
  // Pre-Tax / Post-Tax figure for the leftover math and summary line.
  const totalPreTax = parseDecimalInput(preTaxRetirement) + totalPreTaxBenefits;
  const totalPostTax = totalPostTaxContributions + totalPostTaxBenefits;

  const leftover =
    parseDecimalInput(netPay) -
    totalPreTax -
    parseDecimalInput(taxes) -
    totalPerPaycheck -
    totalPostTax;

  const activeCategory = categories.find((c) => c.id === activeId);
  const activePostTaxContribution = postTaxContributions.find((c) => c.id === activePostTaxId);
  const activePreTaxBenefit = preTaxBenefits.find((c) => c.id === activePreTaxBenefitId);
  const activePostTaxBenefit = postTaxBenefits.find((c) => c.id === activePostTaxBenefitId);

  return (
    <div className="budget-categories">
      <h1>Budget Categories</h1>

      <div className="view-toggle">
        <button
          className={`view-toggle-btn ${view === 'categories' ? 'selected' : ''}`}
          onClick={() => setView('categories')}
        >
          Categories
        </button>
        <button
          className={`view-toggle-btn ${view === 'breakdown' ? 'selected' : ''}`}
          onClick={() => setView('breakdown')}
        >
          Paycheck Breakdown
        </button>
      </div>

      {view === 'categories' && (
        <div className="categories-container">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={categories.map((c) => c.id)} strategy={rectSortingStrategy}>
              {categories.map((category) => (
                <SortableAmountRow
                  key={category.id}
                  item={category}
                  removeItem={removeCategory}
                  updateItem={updateCategory}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeCategory ? (
                <div className="budget-category-row dragging-overlay">
                  <div className="drag-handle">⋮⋮</div>
                  <div className="category-title-section">
                    <h3>{activeCategory.category}</h3>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="summary-section">
            <h2>Summary</h2>
            <div className="summary-stats">
              <div>Total per paycheck: {formatCurrency(totalPerPaycheck)}</div>
            </div>
          </div>

          <div className="budget-category-row add-card-row">
            <input
              type="text"
              placeholder="Add new budget category..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addCategory(e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      )}

      {view === 'breakdown' && (
        <div className="categories-container">
          <div className="paycheck-inputs-section">
            <h2>Standing Values</h2>
            <div className="paycheck-input-row">
              <label>Gross Pay (per paycheck)</label>
              <input
                type="text"
                inputMode="decimal"
                value={netPay}
                onChange={(e) => setNetPay(e.target.value)}
                onBlur={commitNetPay}
              />
            </div>
            <div className="paycheck-input-row">
              <label>Pre-Tax Retirement (per paycheck)</label>
              <input
                type="text"
                inputMode="decimal"
                value={preTaxRetirement}
                onChange={(e) => setPreTaxRetirement(e.target.value)}
                onBlur={commitPreTaxRetirement}
              />
            </div>
            <div className="paycheck-input-row">
              <label>Taxes (per paycheck)</label>
              <input
                type="text"
                inputMode="decimal"
                value={taxes}
                onChange={(e) => setTaxes(e.target.value)}
                onBlur={commitTaxes}
              />
            </div>
          </div>

          <CollapsibleHeading
            label="Pre-Tax Benefits"
            expanded={showPreTaxBenefits}
            onToggle={() => setShowPreTaxBenefits((prev) => !prev)}
          />

          {showPreTaxBenefits && (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handlePreTaxBenefitDragStart}
                onDragEnd={handlePreTaxBenefitDragEnd}
              >
                <SortableContext
                  items={preTaxBenefits.map((c) => c.id)}
                  strategy={rectSortingStrategy}
                >
                  {preTaxBenefits.map((benefit) => (
                    <SortableAmountRow
                      key={benefit.id}
                      item={benefit}
                      removeItem={removePreTaxBenefitCategory}
                      updateItem={updatePreTaxBenefitCategory}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activePreTaxBenefit ? (
                    <div className="budget-category-row dragging-overlay">
                      <div className="drag-handle">⋮⋮</div>
                      <div className="category-title-section">
                        <h3>{activePreTaxBenefit.category}</h3>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              <div className="budget-category-row add-card-row">
                <input
                  type="text"
                  placeholder="Add new pre-tax benefit..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addPreTaxBenefitCategory(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </>
          )}

          <div className="summary-section">
            <h2>Total Pre-Tax</h2>
            <div className="summary-stats">
              <div>Retirement + Benefits: {formatCurrency(totalPreTax)}</div>
            </div>
          </div>

          <div className="summary-section">
            <h2>Regular Budget Categories</h2>
            <div className="summary-stats">
              <div>Total per paycheck: {formatCurrency(totalPerPaycheck)}</div>
            </div>
          </div>

          <CollapsibleHeading
            label="Post-Tax Retirement & Investment Contributions"
            expanded={showPostTaxInvestments}
            onToggle={() => setShowPostTaxInvestments((prev) => !prev)}
          />

          {showPostTaxInvestments && (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handlePostTaxDragStart}
                onDragEnd={handlePostTaxDragEnd}
              >
                <SortableContext
                  items={postTaxContributions.map((c) => c.id)}
                  strategy={rectSortingStrategy}
                >
                  {postTaxContributions.map((contribution) => (
                    <SortableAmountRow
                      key={contribution.id}
                      item={contribution}
                      removeItem={removePostTaxCategory}
                      updateItem={updatePostTaxCategory}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activePostTaxContribution ? (
                    <div className="budget-category-row dragging-overlay">
                      <div className="drag-handle">⋮⋮</div>
                      <div className="category-title-section">
                        <h3>{activePostTaxContribution.category}</h3>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              <div className="budget-category-row add-card-row">
                <input
                  type="text"
                  placeholder="Add new post-tax investment..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addPostTaxCategory(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </>
          )}

          <CollapsibleHeading
            label="Post-Tax Benefits"
            expanded={showPostTaxBenefits}
            onToggle={() => setShowPostTaxBenefits((prev) => !prev)}
          />

          {showPostTaxBenefits && (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handlePostTaxBenefitDragStart}
                onDragEnd={handlePostTaxBenefitDragEnd}
              >
                <SortableContext
                  items={postTaxBenefits.map((c) => c.id)}
                  strategy={rectSortingStrategy}
                >
                  {postTaxBenefits.map((benefit) => (
                    <SortableAmountRow
                      key={benefit.id}
                      item={benefit}
                      removeItem={removePostTaxBenefitCategory}
                      updateItem={updatePostTaxBenefitCategory}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activePostTaxBenefit ? (
                    <div className="budget-category-row dragging-overlay">
                      <div className="drag-handle">⋮⋮</div>
                      <div className="category-title-section">
                        <h3>{activePostTaxBenefit.category}</h3>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              <div className="budget-category-row add-card-row">
                <input
                  type="text"
                  placeholder="Add new post-tax benefit..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addPostTaxBenefitCategory(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </>
          )}

          <div className="summary-section">
            <h2>Total Post-Tax</h2>
            <div className="summary-stats">
              <div>Investments + Benefits: {formatCurrency(totalPostTax)}</div>
            </div>
          </div>

          <div className="summary-section leftover-section">
            <h2>Leftover</h2>
            <div className="summary-stats">
              <div className="leftover-total">{formatCurrency(leftover)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetCategories;

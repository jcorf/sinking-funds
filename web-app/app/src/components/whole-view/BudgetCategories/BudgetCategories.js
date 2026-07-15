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

function SortableBudgetCategoryRow({ category, removeCategory, updateCategory }) {
  const [localAmount, setLocalAmount] = useState(parseFloat(category.amount).toFixed(2));

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    setLocalAmount(parseFloat(category.amount).toFixed(2));
  }, [category.amount]);

  return (
    <div ref={setNodeRef} style={style} className="budget-category-row">
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      <button
        className="delete-card-btn"
        onClick={() => removeCategory(category.category)}
        title={`Delete ${category.category}`}
      >
        ×
      </button>

      <div className="category-title-section">
        <h3>{category.category}</h3>
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
              updateCategory(category.category, 'amount', value);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SortablePostTaxRow({ contribution, removeContribution, updateContribution }) {
  const [localAmount, setLocalAmount] = useState(parseFloat(contribution.amount).toFixed(2));

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: contribution.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    setLocalAmount(parseFloat(contribution.amount).toFixed(2));
  }, [contribution.amount]);

  return (
    <div ref={setNodeRef} style={style} className="budget-category-row">
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      <button
        className="delete-card-btn"
        onClick={() => removeContribution(contribution.category)}
        title={`Delete ${contribution.category}`}
      >
        ×
      </button>

      <div className="category-title-section">
        <h3>{contribution.category}</h3>
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
              updateContribution(contribution.category, 'amount', value);
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

  const totalPerPaycheck = categories.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalPostTax = postTaxContributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const leftover =
    parseDecimalInput(netPay) -
    parseDecimalInput(preTaxRetirement) -
    parseDecimalInput(taxes) -
    totalPerPaycheck -
    totalPostTax;

  const activeCategory = categories.find((c) => c.id === activeId);
  const activePostTaxContribution = postTaxContributions.find((c) => c.id === activePostTaxId);

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
                <SortableBudgetCategoryRow
                  key={category.id}
                  category={category}
                  removeCategory={removeCategory}
                  updateCategory={updateCategory}
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

          <div className="summary-section">
            <h2>Regular Budget Categories</h2>
            <div className="summary-stats">
              <div>Total per paycheck: {formatCurrency(totalPerPaycheck)}</div>
            </div>
          </div>

          <h2 className="post-tax-heading">Post-Tax Retirement &amp; Investment Contributions</h2>

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
                <SortablePostTaxRow
                  key={contribution.id}
                  contribution={contribution}
                  removeContribution={removePostTaxCategory}
                  updateContribution={updatePostTaxCategory}
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

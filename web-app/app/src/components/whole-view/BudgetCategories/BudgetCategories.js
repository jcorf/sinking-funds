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

const BudgetCategories = () => {
  const [categories, setCategories] = useState([]);
  const [activeId, setActiveId] = useState(null);

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
  }, []);

  const fetchCategories = async () => {
    const data = await getBudgetCategories();
    setCategories(data.data || []);
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

  const totalPerPaycheck = categories.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  const activeCategory = categories.find((c) => c.id === activeId);

  return (
    <div className="budget-categories">
      <h1>Budget Categories</h1>

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
    </div>
  );
};

export default BudgetCategories;

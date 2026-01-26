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
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import './CreditCards.css';
import { updateCreditCardOrder } from '../../utils/api';

// Custom parsing function that handles incomplete decimals
const parseDecimalInput = (value) => {
  if (!value || value === '') return 0.0;
  if (value === '.' || value === '0.') return 0.0;
  if (value.endsWith('.')) return parseFloat(value.slice(0, -1)) || 0.0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0.0 : parsed;
};

// Source Pill Selector Component
const SourcePillSelector = ({ value, onChange }) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSource, setCustomSource] = useState('');

  const pillOptions = [
    { label: 'venmo', value: 'venmo', color: '#007bff' }, // Blue
    { label: 'future', value: 'future', color: '#28a745' }, // Green
    { label: 'other', value: 'other', color: '#6c757d' } // Gray for other button
  ];

  const getPillColor = (source) => {
    if (source === 'venmo') return '#007bff';
    if (source === 'future') return '#28a745';
    return '#fd7e14'; // Orange for custom sources
  };

  const handlePillClick = (pillValue) => {
    if (pillValue === 'other') {
      setShowCustomInput(true);
      setCustomSource('');
    } else {
      onChange(pillValue);
      setShowCustomInput(false);
    }
  };

  const handleCustomSubmit = () => {
    if (customSource.trim()) {
      onChange(customSource.trim());
      setShowCustomInput(false);
      setCustomSource('');
    }
  };

  const handleCustomKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  };

  return (
    <div className="source-selector">
      <div className="pill-container">
        {pillOptions.map(pill => (
          <button
            key={pill.value}
            type="button"
            className={`source-pill ${value === pill.value ? 'selected' : ''}`}
            style={{
              backgroundColor: value === pill.value ? pill.color : 'transparent',
              borderColor: pill.color,
              color: value === pill.value ? 'white' : pill.color
            }}
            onClick={() => handlePillClick(pill.value)}
          >
            {pill.label}
          </button>
        ))}
        {value && value !== 'venmo' && value !== 'future' && (
          <span
            className="source-pill custom-pill"
            style={{
              backgroundColor: getPillColor(value),
              borderColor: getPillColor(value),
              color: 'white'
            }}
          >
            {value}
            <button
              type="button"
              className="pill-remove"
              onClick={() => onChange('')}
              title="Remove custom source"
            >
              ×
            </button>
          </span>
        )}
      </div>
      {showCustomInput && (
        <div className="custom-source-input">
          <input
            type="text"
            placeholder="Enter custom source..."
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            onKeyPress={handleCustomKeyPress}
            autoFocus
          />
          <button
            type="button"
            className="custom-add-btn"
            onClick={handleCustomSubmit}
          >
            Add
          </button>
          <button
            type="button"
            className="custom-cancel-btn"
            onClick={() => {
              setShowCustomInput(false);
              setCustomSource('');
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

// Sortable Credit Card Row Component
function SortableCreditCardRow({ card, removeCreditCard, updateCardBalance, formatCurrency, parseSubBalances, coveredDropdownCard, setCoveredDropdownCard, pendingDropdownCard, setPendingDropdownCard, updateCoveredSubBalances, updatePendingSubBalances, CoveredSubBalancesDropdown, PendingSubBalancesDropdown }) {
  const [localPosted, setLocalPosted] = useState(card.posted_transactions.toString());
  const [localPending, setLocalPending] = useState(card.pending_transactions.toString());

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: card.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const subBalances = parseSubBalances(card.covered_sub_balances);

  // Update local state when card data changes
  useEffect(() => {
    setLocalPosted(card.posted_transactions.toString());
  }, [card.posted_transactions]);

  useEffect(() => {
    setLocalPending(card.pending_transactions.toString());
  }, [card.pending_transactions]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="credit-card-row"
    >
      {/* Drag Handle */}
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      
      <button
        className="delete-card-btn"
        onClick={() => removeCreditCard(card.card_name)}
        title={`Delete ${card.card_name} card`}
      >
        ×
      </button>
      {/* Left Section: Title */}
      <div className="card-title-section">
        <h3>{card.card_name}</h3>
      </div>

      {/* Middle Section: Balance Inputs */}
      <div className="card-inputs-section">
        <div className="balance-field">
          <label>Posted</label>
          <input
            type="text"
            inputMode="decimal"
            value={localPosted}
            onChange={(e) => setLocalPosted(e.target.value)}
            onBlur={() => {
              const value = parseDecimalInput(localPosted);
              updateCardBalance(card.card_name, 'posted_transactions', value);
            }}
          />
        </div>

        <div className="balance-field pending-field">
          <label
            onClick={() => setPendingDropdownCard(card.id)}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Pending
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={localPending}
            readOnly
          />
          {pendingDropdownCard === card.id && (
            <PendingSubBalancesDropdown
              cardName={card.card_name}
              subBalances={parseSubBalances(card.pending_sub_balances || '[]')}
              onClose={() => setPendingDropdownCard(null)}
              updatePendingSubBalances={updatePendingSubBalances}
            />
          )}
        </div>

        <div className="balance-field covered-field">
          <label
            onClick={() => setCoveredDropdownCard(card.id)}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Covered
          </label>
          <input
            type="number"
            step="0.01"
            value={card.covered_transactions}
            readOnly
          />
          {coveredDropdownCard === card.id && (
            <CoveredSubBalancesDropdown
              cardName={card.card_name}
              subBalances={subBalances}
              onClose={() => setCoveredDropdownCard(null)}
              updateCoveredSubBalances={updateCoveredSubBalances}
            />
          )}
        </div>
      </div>

      {/* Right Section: Total */}
      <div className="card-total-section">
        <div className="total-balance">
          <strong>{formatCurrency(card.total_balance)}</strong>
        </div>
      </div>
    </div>
  );
}

const CreditCards = () => {
  const [creditCards, setCreditCards] = useState([]);
  const [allyBankBalance, setAllyBankBalance] = useState(0);
  const [allyBankInputValue, setAllyBankInputValue] = useState('0');
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalToTransfer, setTotalToTransfer] = useState(0);
  const [coveredDropdownCard, setCoveredDropdownCard] = useState(null);
  const [pendingDropdownCard, setPendingDropdownCard] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Only activate drag after moving 8px
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCreditCards();
    fetchAllyBankBalance();
  }, []);

  const fetchCreditCards = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_credit_cards');
      const data = await response.json();
      setCreditCards(data.data || []);

      // Calculate total debt
      let debt = 0;
      data.data.forEach(card => {
        debt += card.total_balance;
      });
      setTotalDebt(debt);
      updateTotalToTransfer(debt);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  };

  const fetchAllyBankBalance = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_ally_bank_balance');
      const data = await response.json();
      const balance = data.balance || 0;
      setAllyBankBalance(balance);
      setAllyBankInputValue(balance.toString());
      updateTotalToTransfer(totalDebt);
    } catch (error) {
      console.error('Error fetching Ally Bank balance:', error);
    }
  };

  const updateTotalToTransfer = (debt) => {
    setTotalToTransfer(debt - allyBankBalance);
  };

  const calculateTotalBalance = (card, field, value) => {
    const updatedCard = { ...card, [field]: value };
    return updatedCard.posted_transactions + updatedCard.pending_transactions - updatedCard.covered_transactions;
  };

  const updateCardBalance = async (cardName, field, value) => {
    // Optimistically update local state
    const card = creditCards.find(c => c.card_name === cardName);
    if (!card) return;

    const oldBalance = card.total_balance;
    const newBalance = calculateTotalBalance(card, field, value);

    setCreditCards(prevCards => prevCards.map(c =>
      c.card_name === cardName ? { ...c, [field]: value, total_balance: newBalance } : c
    ));

    setTotalDebt(prevDebt => prevDebt - oldBalance + newBalance);
    updateTotalToTransfer(totalDebt - oldBalance + newBalance);

    try {
      const response = await fetch('http://127.0.0.1:5000/update_credit_card_balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_name: cardName, field, new_value: value })
      });
      await response.json();
      // Fetch to ensure consistency
      fetchCreditCards();
    } catch (error) {
      console.error('Error updating card balance:', error);
      // Revert on error
      fetchCreditCards();
    }
  };

  const addCreditCard = async (cardName) => {
    if (!cardName.trim()) return;

    try {
      const response = await fetch('http://127.0.0.1:5000/add_credit_card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_name: cardName })
      });
      await response.json();
      fetchCreditCards();
    } catch (error) {
      console.error('Error adding credit card:', error);
    }
  };

  const removeCreditCard = async (cardName) => {
    if (!window.confirm(`Are you sure you want to delete the ${cardName} credit card?`)) return;

    // Optimistically remove from local state
    const card = creditCards.find(c => c.card_name === cardName);
    if (!card) return;

    const removedBalance = card.total_balance;
    setCreditCards(prevCards => prevCards.filter(c => c.card_name !== cardName));
    setTotalDebt(prevDebt => prevDebt - removedBalance);
    updateTotalToTransfer(totalDebt - removedBalance);

    try {
      const response = await fetch('http://127.0.0.1:5000/remove_credit_card', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_name: cardName })
      });
      await response.json();
      // Fetch to ensure consistency
      fetchCreditCards();
    } catch (error) {
      console.error('Error removing credit card:', error);
      // Revert on error
      fetchCreditCards();
    }
  };


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };



  const updateAllyBankBalance = async (newBalance) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/update_ally_bank_balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance })
      });
      await response.json();
      setAllyBankBalance(newBalance);
      updateTotalToTransfer(totalDebt);
    } catch (error) {
      console.error('Error updating Ally Bank balance:', error);
    }
  };

  const updateCoveredSubBalances = async (cardName, subBalances) => {
    // Calculate new covered total
    const totalCovered = subBalances.reduce((sum, sub) => sum + (parseFloat(sub.amount) || 0), 0);

    // Optimistically update local state
    const card = creditCards.find(c => c.card_name === cardName);
    if (!card) return;

    const oldBalance = card.total_balance;
    const newBalance = card.posted_transactions + card.pending_transactions - totalCovered;

    setCreditCards(prevCards => prevCards.map(c =>
      c.card_name === cardName ? { ...c, covered_transactions: totalCovered, covered_sub_balances: JSON.stringify(subBalances), total_balance: newBalance } : c
    ));

    setTotalDebt(prevDebt => prevDebt - oldBalance + newBalance);
    updateTotalToTransfer(totalDebt - oldBalance + newBalance);

    try {
      const response = await fetch('http://127.0.0.1:5000/update_covered_sub_balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_name: cardName, sub_balances: subBalances })
      });
      await response.json();
      // Fetch to ensure consistency
      fetchCreditCards();
    } catch (error) {
      console.error('Error updating covered sub-balances:', error);
      // Revert on error
      fetchCreditCards();
    }
  };

  const updatePendingSubBalances = async (cardName, subBalances) => {
    // Calculate new pending total
    const totalPending = subBalances.reduce((sum, sub) => sum + (parseFloat(sub.amount) || 0), 0);

    // Optimistically update local state
    const card = creditCards.find(c => c.card_name === cardName);
    if (!card) return;

    const oldBalance = card.total_balance;
    const newBalance = card.posted_transactions + totalPending - card.covered_transactions;

    setCreditCards(prevCards => prevCards.map(c =>
      c.card_name === cardName ? { ...c, pending_transactions: totalPending, pending_sub_balances: JSON.stringify(subBalances), total_balance: newBalance } : c
    ));

    setTotalDebt(prevDebt => prevDebt - oldBalance + newBalance);
    updateTotalToTransfer(totalDebt - oldBalance + newBalance);

    // For now, just store locally - could be extended to save to DB later
    console.log('Pending sub-balances updated:', cardName, subBalances, 'Total pending:', totalPending);
    // TODO: Add database endpoint for pending sub-balances if needed
  };

  const parseSubBalances = (subBalancesJson) => {
    try {
      return JSON.parse(subBalancesJson || '[]');
    } catch {
      return [];
    }
  };

  // Drag and drop handlers
  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const {active, over} = event;
    setActiveId(null);

    if (active.id !== over.id) {
      setCreditCards((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        const reorderedItems = arrayMove(items, oldIndex, newIndex);

        // Update the order in the database
        const cardOrders = reorderedItems.map(item => item.id);
        updateCreditCardOrder(cardOrders);

        return reorderedItems;
      });
    }
  }

  const CoveredSubBalancesDropdown = ({ cardName, subBalances, onClose, updateCoveredSubBalances }) => {
    const [localSubBalances, setLocalSubBalances] = useState(subBalances);

    useEffect(() => {
      setLocalSubBalances(subBalances);
    }, [subBalances]);

    const addSubBalance = () => {
      setLocalSubBalances([...localSubBalances, { name: '', amount: 0, source: '' }]);
    };

    const updateSubBalance = (index, field, value) => {
      const updated = [...localSubBalances];
      updated[index] = { ...updated[index], [field]: value };
      setLocalSubBalances(updated);
    };

    const removeSubBalance = (index) => {
      setLocalSubBalances(localSubBalances.filter((_, i) => i !== index));
    };

    const saveSubBalances = () => {
      updateCoveredSubBalances(cardName, localSubBalances);
      onClose();
    };

    return (
      <div className="covered-dropdown">
        <div className="dropdown-header">
          <h4>Covered Transactions</h4>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="sub-balances-list">
          {localSubBalances.map((sub, index) => (
            <div key={index} className="sub-balance-item">
              <input
                type="text"
                placeholder="Description"
                value={sub.name}
                onChange={(e) => updateSubBalance(index, 'name', e.target.value)}
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount"
                value={sub.amount}
                onChange={(e) => updateSubBalance(index, 'amount', e.target.value)}
                onBlur={(e) => {
                  const value = parseDecimalInput(e.target.value);
                  updateSubBalance(index, 'amount', value);
                }}
              />
              <SourcePillSelector
                value={sub.source}
                onChange={(value) => updateSubBalance(index, 'source', value)}
              />
              <button onClick={() => removeSubBalance(index)} className="remove-sub">×</button>
            </div>
          ))}
        </div>
        <div className="dropdown-actions">
          <button onClick={addSubBalance} className="add-sub-btn">+ Add Transaction</button>
          <button onClick={saveSubBalances} className="save-btn">Save</button>
        </div>
      </div>
    );
  };

  const PendingSubBalancesDropdown = ({ cardName, subBalances, onClose, updatePendingSubBalances = () => {} }) => {
    const [localSubBalances, setLocalSubBalances] = useState(subBalances);

    useEffect(() => {
      setLocalSubBalances(subBalances);
    }, [subBalances]);

    const addSubBalance = () => {
      setLocalSubBalances([...localSubBalances, { name: '', amount: 0, source: '' }]);
    };

    const updateSubBalance = (index, field, value) => {
      const updated = [...localSubBalances];
      updated[index] = { ...updated[index], [field]: value };
      setLocalSubBalances(updated);
    };

    const removeSubBalance = (index) => {
      setLocalSubBalances(localSubBalances.filter((_, i) => i !== index));
    };

    const saveSubBalances = () => {
      updatePendingSubBalances(cardName, localSubBalances);
      onClose();
    };

    return (
      <div className="pending-dropdown">
        <div className="dropdown-header">
          <h4>Pending Transactions</h4>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="sub-balances-list">
          {localSubBalances.map((sub, index) => (
            <div key={index} className="sub-balance-item">
              <input
                type="text"
                placeholder="Description"
                value={sub.name}
                onChange={(e) => updateSubBalance(index, 'name', e.target.value)}
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount"
                value={sub.amount}
                onChange={(e) => updateSubBalance(index, 'amount', e.target.value)}
                onBlur={(e) => {
                  const value = parseDecimalInput(e.target.value);
                  updateSubBalance(index, 'amount', value);
                }}
              />
              <SourcePillSelector
                value={sub.source}
                onChange={(value) => updateSubBalance(index, 'source', value)}
              />
              <button onClick={() => removeSubBalance(index)} className="remove-sub">×</button>
            </div>
          ))}
        </div>
        <div className="dropdown-actions">
          <button onClick={addSubBalance} className="add-sub-btn">+ Add Transaction</button>
          <button onClick={saveSubBalances} className="save-btn">Save</button>
        </div>
      </div>
    );
  };

  return (
    <div className="credit-cards">
      <h1>Credit Card Balances</h1>

      <div className="ally-bank-section">
        <h2>Saved in Bucket</h2>
        <div className="ally-bank-balance">
          <label>Available Balance:</label>
          <input
            type="text"
            inputMode="decimal"
            value={allyBankInputValue}
            onChange={(e) => {
              const value = e.target.value;
              setAllyBankInputValue(value);
              const numericValue = parseFloat(value) || 0;
              updateAllyBankBalance(numericValue);
            }}
            onBlur={() => {
              // Format the value when input loses focus
              const numericValue = parseFloat(allyBankInputValue) || 0;
              setAllyBankInputValue(numericValue.toFixed(2));
            }}
          />
        </div>
      </div>

      <div className="cards-container">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={creditCards.map(card => card.id)} strategy={rectSortingStrategy}>
            {creditCards.map(card => (
              <SortableCreditCardRow
                key={card.id}
                card={card}
                removeCreditCard={removeCreditCard}
                updateCardBalance={updateCardBalance}
                formatCurrency={formatCurrency}
                parseSubBalances={parseSubBalances}
                coveredDropdownCard={coveredDropdownCard}
                setCoveredDropdownCard={setCoveredDropdownCard}
                pendingDropdownCard={pendingDropdownCard}
                setPendingDropdownCard={setPendingDropdownCard}
                updateCoveredSubBalances={updateCoveredSubBalances}
                updatePendingSubBalances={updatePendingSubBalances}
                CoveredSubBalancesDropdown={CoveredSubBalancesDropdown}
                PendingSubBalancesDropdown={PendingSubBalancesDropdown}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="credit-card-row dragging-overlay">
                {(() => {
                  const activeCard = creditCards.find(card => card.id === activeId);
                  return activeCard ? (
                    <>
                      <div className="drag-handle">⋮⋮</div>
                      <button className="delete-card-btn">×</button>
                      <div className="card-title-section">
                        <h3>{activeCard.card_name}</h3>
                      </div>
                      <div className="card-inputs-section">
                        <div className="balance-field">
                          <label>Posted</label>
                          <input type="text" value={activeCard.posted_transactions} readOnly />
                        </div>
                        <div className="balance-field">
                          <label>Pending</label>
                          <input type="text" value={activeCard.pending_transactions} readOnly />
                        </div>
                        <div className="balance-field covered-field">
                          <label>Covered</label>
                          <input type="number" value={activeCard.covered_transactions} readOnly />
                        </div>
                      </div>
                      <div className="card-total-section">
                        <div className="total-balance">
                          <strong>{formatCurrency(activeCard.total_balance)}</strong>
                        </div>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="summary-section">
          <h2>Summary</h2>
          <div className="summary-stats">
            <div>Already Allocated: {formatCurrency(allyBankBalance)}</div>
            <div>Total Debt: {formatCurrency(totalDebt)}</div>
            <div className="total-to-transfer">Net Change: {formatCurrency(totalToTransfer)}</div>
          </div>
        </div>

        <div className="credit-card-row add-card-row">
          <input
            type="text"
            placeholder="Add new card..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addCreditCard(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CreditCards;
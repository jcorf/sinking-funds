import {url, obj, getTodayDate} from './lib'

export async function login(username, password) {
    const response = await fetch(url('/login'), {
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({username, password}),
    });
    return await response.json();
}

export async function logout() {
    const response = await fetch(url('/logout'), {
        method: "POST",
        credentials: 'include',
    });
    return await response.json();
}

export async function getSession() {
    try {
        const response = await fetch(url('/session'), {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching session:', error);
        return {authenticated: false};
    }
}

// Next payday on/after today and the most recent one before it, from the
// backend's bimonthly schedule rules.
export async function getNextPayday() {
    try {
        const response = await fetch(url('/next_payday'), {credentials: 'include'});
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching next payday:', error);
        return null;
    }
}

// The Ally "Saved in Bucket" balance (number), or null if unavailable.
export async function getAllyBankBalance() {
    try {
        const response = await fetch(url('/get_ally_bank_balance'), {credentials: 'include'});
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return typeof data.balance === 'number' ? data.balance : Number(data.balance) || 0;
    } catch (error) {
        console.error('Error fetching bucket balance:', error);
        return null;
    }
}

// The single scratch notepad from the tools dock.
export async function getNotes() {
    const response = await fetch(url('/get_notes'), {credentials: 'include'});
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

export async function updateNotes(body) {
    try {
        const response = await fetch(url('/update_notes'), {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({body}),
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving notes:', error);
        return false;
    }
}

export async function getCategoryData(categoryName) {
    try {
        const flaskUrl = url('/get_category_info', ['on_value'], [categoryName])
        const response = await fetch(flaskUrl, {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export async function getAllData() {
    try {
        const flaskUrl = url('/get_data')
        const response = await fetch(flaskUrl, {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export async function getPaycheckSchedule(categoryName, startDate) {
    try {
        const flaskUrl = url('/saved_by_paycheck',
            ['on_value', 'start_date'], [categoryName, startDate])
        const response = await fetch(flaskUrl, {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export async function updateField(field, value, onValue, onField = 'category', startDate = getTodayDate()) {
    try {
        const response = await fetch(url('/update_field'), {
        method: "POST",  // HTTP method
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",  // Indicate that the body is JSON
        },
        body: JSON.stringify(obj(['new_value', 'field_to_change', 'on_value', 'on_field', 'start_date'], [value, field, onValue, onField, startDate])),  // Convert the data object to a JSON string
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Success:", result);  // Handle the response data

        return true;
    } catch (error) {
        console.error("Error:", error);  // Handle any errors
        return false;
    }
}

export async function deleteCategory(onValue, onField = 'category') {
    try {
        const response = await fetch(url('/remove_category'), {
            method: "DELETE",  // HTTP method
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",  // Indicate that the body is JSON
            },
            body: JSON.stringify(obj(['on_value', 'on_field'], [onValue, onField])),  // Convert the data object to a JSON string
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Success:", result);  // Handle the response data

        return true;
    } catch (error) {
        console.error("Error:", error);  // Handle any errors
        return false;
    }
}

export async function addCategory(category, saved, goal, goalDate, startDate = getTodayDate(), emoji = ':heart:') {
    try {
        const response = await fetch(url('/add_category'), {
            method: "POST",  // HTTP method
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",  // Indicate that the body is JSON
            },
            body: JSON.stringify(obj(['category', 'saved', 'goal', 'goal_date', 'start_date', 'emoji'],
                [category, saved, goal, goalDate, startDate, emoji])),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Success:", result);  // Handle the response data

        return result === true;
    } catch (error) {
        console.error("Error:", error);  // Handle any errors
        return false;
    }
}

export async function updateAllCategories(startDate= getTodayDate(), paySchedule = null) {
    try {
        const requestBody = paySchedule 
            ? obj(['start_date', 'pay_schedule'], [startDate, paySchedule])
            : obj(['start_date'], [startDate]);
            
        const response = await fetch(url('/recalculate_all'), {
            method: "POST",  // HTTP method
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",  // Indicate that the body is JSON
            },
            body: JSON.stringify(requestBody),  // Convert the data object to a JSON string
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return true;
    } catch (error) {
        console.error("Error:", error);  // Handle any errors
        return false;
    }
}

export async function updateCardOrder(cardOrders) {
    try {
        const response = await fetch(url('/update_card_order'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ card_orders: cardOrders }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Order update success:", result);
        return result;
    } catch (error) {
        console.error("Error updating card order:", error);
        return false;
    }
}

export async function updateCreditCardOrder(cardOrders) {
    try {
        const response = await fetch(url('/update_credit_card_order'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ card_orders: cardOrders }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Credit card order update success:", result);
        return result;
    } catch (error) {
        console.error("Error updating credit card order:", error);
        return false;
    }
}

export async function getBudgetCategories() {
    try {
        const response = await fetch(url('/get_budget_categories'), {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching budget categories:', error);
        return {data: []};
    }
}

export async function addBudgetCategory(category, amount) {
    try {
        const response = await fetch(url('/add_budget_category'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, amount }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error adding budget category:", error);
        return false;
    }
}

export async function updateBudgetCategory(category, field, value) {
    try {
        const response = await fetch(url('/update_budget_category'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, field_to_change: field, new_value: value }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating budget category:", error);
        return false;
    }
}

export async function deleteBudgetCategory(category) {
    try {
        const response = await fetch(url('/remove_budget_category'), {
            method: "DELETE",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error deleting budget category:", error);
        return false;
    }
}

export async function updateBudgetCategoryOrder(cardOrders) {
    try {
        const response = await fetch(url('/update_budget_category_order'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ card_orders: cardOrders }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating budget category order:", error);
        return false;
    }
}

export async function getPaycheckSettings() {
    try {
        const response = await fetch(url('/get_paycheck_settings'), {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching paycheck settings:', error);
        return {net_pay: 0, pre_tax_retirement: 0};
    }
}

export async function updatePaycheckSettings(field, value) {
    try {
        const response = await fetch(url('/update_paycheck_settings'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ field_to_change: field, new_value: value }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating paycheck settings:", error);
        return false;
    }
}

export async function getPostTaxContributions() {
    try {
        const response = await fetch(url('/get_post_tax_contributions'), {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching post-tax contributions:', error);
        return {data: []};
    }
}

export async function addPostTaxContribution(category, amount) {
    try {
        const response = await fetch(url('/add_post_tax_contribution'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, amount }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error adding post-tax contribution:", error);
        return false;
    }
}

export async function updatePostTaxContribution(category, field, value) {
    try {
        const response = await fetch(url('/update_post_tax_contribution'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, field_to_change: field, new_value: value }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating post-tax contribution:", error);
        return false;
    }
}

export async function deletePostTaxContribution(category) {
    try {
        const response = await fetch(url('/remove_post_tax_contribution'), {
            method: "DELETE",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error deleting post-tax contribution:", error);
        return false;
    }
}

export async function updatePostTaxContributionOrder(cardOrders) {
    try {
        const response = await fetch(url('/update_post_tax_contribution_order'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ card_orders: cardOrders }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating post-tax contribution order:", error);
        return false;
    }
}

export async function getPreTaxBenefits() {
    try {
        const response = await fetch(url('/get_pre_tax_benefits'), {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching pre-tax benefits:', error);
        return {data: []};
    }
}

export async function addPreTaxBenefit(category, amount) {
    try {
        const response = await fetch(url('/add_pre_tax_benefit'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, amount }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error adding pre-tax benefit:", error);
        return false;
    }
}

export async function updatePreTaxBenefit(category, field, value) {
    try {
        const response = await fetch(url('/update_pre_tax_benefit'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, field_to_change: field, new_value: value }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating pre-tax benefit:", error);
        return false;
    }
}

export async function deletePreTaxBenefit(category) {
    try {
        const response = await fetch(url('/remove_pre_tax_benefit'), {
            method: "DELETE",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error deleting pre-tax benefit:", error);
        return false;
    }
}

export async function updatePreTaxBenefitOrder(cardOrders) {
    try {
        const response = await fetch(url('/update_pre_tax_benefit_order'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ card_orders: cardOrders }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating pre-tax benefit order:", error);
        return false;
    }
}

export async function getPostTaxBenefits() {
    try {
        const response = await fetch(url('/get_post_tax_benefits'), {credentials: 'include'});
        return await response.json();
    } catch (error) {
        console.error('Error fetching post-tax benefits:', error);
        return {data: []};
    }
}

export async function addPostTaxBenefit(category, amount) {
    try {
        const response = await fetch(url('/add_post_tax_benefit'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, amount }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error adding post-tax benefit:", error);
        return false;
    }
}

export async function updatePostTaxBenefit(category, field, value) {
    try {
        const response = await fetch(url('/update_post_tax_benefit'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category, field_to_change: field, new_value: value }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating post-tax benefit:", error);
        return false;
    }
}

export async function deletePostTaxBenefit(category) {
    try {
        const response = await fetch(url('/remove_post_tax_benefit'), {
            method: "DELETE",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ category }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error deleting post-tax benefit:", error);
        return false;
    }
}

export async function updatePostTaxBenefitOrder(cardOrders) {
    try {
        const response = await fetch(url('/update_post_tax_benefit_order'), {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ card_orders: cardOrders }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating post-tax benefit order:", error);
        return false;
    }
}

// ---- Spending from a goal -------------------------------------------------

export async function getGoalSpending(goalId) {
    try {
        const response = await fetch(url('/goal_spending', ['id'], [goalId]), {credentials: 'include'});
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return (await response.json()).data || [];
    } catch (error) {
        console.error('Error fetching spending:', error);
        return null;
    }
}

// Returns { spending } on success or { error } with a message to show.
export async function spendFromGoal(goalId, { amount, note, spentOn, nextCycle, lowerGoal, startDate }) {
    try {
        const response = await fetch(url('/spend_from_goal'), {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: goalId, amount, note, spent_on: spentOn, next_cycle: nextCycle, lower_goal: lowerGoal, start_date: startDate}),
        });
        const data = await response.json();
        if (!response.ok) return {error: data.error || "That didn't save."};
        return data;
    } catch (error) {
        console.error('Error recording spending:', error);
        return {error: "That didn't save. Check that the app's backend is running, then try again."};
    }
}

export async function removeGoalSpending(spendingId, startDate) {
    try {
        const response = await fetch(url('/goal_spending'), {
            method: 'DELETE',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({spending_id: spendingId, start_date: startDate}),
        });
        return response.ok;
    } catch (error) {
        console.error('Error removing spending:', error);
        return false;
    }
}

// ---- Export ---------------------------------------------------------------

// Downloads /export (everything, JSON) or /export_goals.csv as a file.
export async function downloadExport(kind = 'json') {
    const path = kind === 'csv' ? '/export_goals.csv' : '/export';
    try {
        const response = await fetch(url(path), {credentials: 'include'});
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const disposition = response.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/);
        const filename = match ? match[1] : kind === 'csv' ? 'sinking-funds-goals.csv' : 'sinking-funds.json';
        const blob = await response.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
        return true;
    } catch (error) {
        console.error('Error exporting:', error);
        return false;
    }
}

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

    } catch (error) {
        console.error("Error:", error);  // Handle any errors
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

    } catch (error) {
        console.error("Error:", error);  // Handle any errors
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

    } catch (error) {
        console.error("Error:", error);  // Handle any errors
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
    } catch (error) {
        console.error("Error:", error);  // Handle any errors
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

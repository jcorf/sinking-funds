import {url, obj, getTodayDate} from './lib'

export async function getCategoryData(categoryName) {
    try {
        const flaskUrl = url('/get_category_info', ['on_value'], [categoryName])
        const response = await fetch(flaskUrl);
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export async function getAllData() {
    try {
        const flaskUrl = url('/get_data')
        const response = await fetch(flaskUrl);
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export async function getPaycheckSchedule(categoryName, startDate) {
    try {
        const flaskUrl = url('/saved_by_paycheck',
            ['on_value', 'start_date'], [categoryName, startDate])
        const response = await fetch(flaskUrl);
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export async function updateField(field, value, onValue, onField = 'category', startDate = getTodayDate()) {
    try {
        const response = await fetch(url('/update_field'), {
        method: "POST",  // HTTP method
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

/*
export function progress(saved, goal)  {
    return (parseFloat(saved) / parseFloat(goal)) * 100;
}
export function progressString(saved, goal) {
    const progress = progress(saved, goal);
    return progress.toFixed(1).endsWith(0) ? `${progress}` : progress.toFixed(1)
}
*/

const baseUrl = 'http://127.0.0.1:5000'


export function findNumPaychecks(coefficient, start, goal) {
    if (start >= goal) {
        return 0;
    }
    let x = Math.ceil((goal - start) / coefficient);
    return x;
}


export function url(endpoint, keys = [], values = []) {
    let url = `${baseUrl}${endpoint}`;
    if (keys.length > 0 && values.length > 0) {
        url += `?${parameter(keys[0], values[0])}`;
        for (let i = 1; i < keys.length; i++) {
            url += `&${parameter(keys[i], values[i])}`;
        }
    }
    return url;
}

export function parameter(key, value) {
    return `${key}=${value}`;
}

export function obj(keys = [], values = []) {
    return keys.reduce((acc, key, index) => {
        acc[key] = values[index];
        return acc;
    }, {});
}

export function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getOneYearDate() {
    const today = new Date();
    const year = today.getFullYear() + 1;
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

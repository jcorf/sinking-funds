// Match whatever host the page was loaded from (localhost vs 127.0.0.1).
// Browsers treat those as different sites for cookie purposes, so if the
// frontend is served from one and this pointed at the other, the session
// cookie set by /login would silently fail to attach to later requests.
// REACT_APP_API_PORT lets a test instance (see start_test.sh) talk to its own
// backend instead of the real one.
const apiPort = process.env.REACT_APP_API_PORT || '5001';
const baseUrl = `http://${window.location.hostname}:${apiPort}`

export const isTestEnv = process.env.REACT_APP_ENV_LABEL === 'TEST';

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

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

export function getRandomEmoji() {
    const commonEmojis = [
        ':heart:', ':moneybag:', ':red_car:', ':house:', ':airplane:', ':gift:',
        ':dog:', ':cat:', ':baby:', ':mortar_board:', ':briefcase:', ':computer:',
        ':phone:', ':camera:', ':game_die:', ':musical_note:', ':books:', ':palm_tree:',
        ':umbrella:', ':snowflake:', ':sunny:', ':rainbow:', ':star:', ':sparkles:',
        ':fire:', ':zap:', ':gem:', ':trophy:', ':medal_sports:', ':crown:',
        ':rocket:', ':bike:', ':strawberry:', ':man_cook:', ':dizzy:',':herb:',
        ':wedding:', ':bus:', ':train:', ':taxi:', ':eyeglasses:', ':woman:', ':man:',
        ':christmas_tree:',':umbrella:', ':rotating_light:', ':tooth:'
    ];
    
    const randomIndex = Math.floor(Math.random() * commonEmojis.length);
    return commonEmojis[randomIndex];
}

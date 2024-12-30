module.exports = {
    "server": {
        "host": "localhost",
        "port": 5000,
        "rewrites": [
            {
                "source": "http://localhost:3000",
                "destination": "/newpath",
                "type": "permanent"
            }
        ]
    }
};

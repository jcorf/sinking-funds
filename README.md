# Sinking Funds Calculator

A web application for managing and tracking sinking funds (savings goals) with automatic paycheck-based calculations.

## Overview

This application helps users manage multiple savings goals by calculating how much to save per paycheck based on a bimonthly pay schedule (15th and 30th/31st of each month). It provides a visual dashboard to track progress toward financial goals.

## Features

- **Multiple Savings Categories**: Create and manage multiple sinking funds (e.g., emergency fund, vacation, car repairs)
- **Bimonthly Pay Schedule**: Automatically calculates savings based on 15th and 30th/31st paydays
- **Progress Tracking**: Visual progress bars and percentage completion for each goal
- **Drag & Drop Interface**: Reorder categories by dragging cards
- **Real-time Updates**: Update saved amounts and see immediate recalculation
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
sinking-funds/
├── src/paycheck/                 # Backend Python/Flask application
│   ├── database.py              # Database operations and schema
│   ├── flask-connector.py       # Flask API endpoints
│   ├── paycheck.py              # Paycheck calculation logic
│   ├── schedules/
│   │   └── bimonthly.py         # Bimonthly pay schedule calculations
│   └── utils/
│       ├── utils.py             # Utility functions
│       └── reference/
│           └── database_constants.py
├── web-app/app/                 # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── whole-view/      # Main application views
│   │   │   │   ├── Dashboard/   # Dashboard component
│   │   │   │   ├── Grid/        # Main grid view of savings cards
│   │   │   │   ├── InfoCard/    # Individual savings card component
│   │   │   │   ├── AddCard/     # Add new savings category
│   │   │   │   ├── Recalculate/ # Recalculate all savings
│   │   │   │   └── InfoPage/    # Detailed category information
│   │   │   └── utils/
│   │   │       ├── api.js       # API communication functions
│   │   │       └── lib.js       # Utility functions
│   │   └── App.js               # Main React application
│   └── package.json
└── README.md
```

## Technology Stack

### Backend
- **Python 3.x**: Core application logic
- **Flask**: Web framework for API endpoints
- **SQLite**: Database for storing savings data
- **Flask-CORS**: Cross-origin resource sharing

### Frontend
- **React**: User interface framework
- **React Router**: Client-side routing
- **CSS3**: Styling and animations
- **Fetch API**: HTTP requests to backend

## Setup Instructions

### What I'm running this locally on
- Python 3.9.13
- Node.js 22.12.0
- npm 10.9.0

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd src/paycheck
   ```

2. Install Python dependencies (if using a virtual environment):
   ```bash
   pip install flask flask-cors
   ```

3. Run the Flask application:
   ```bash
   python flask-connector.py
   ```

   The backend will start on `http://127.0.0.1:5000`

4. Set up database -- change DB name in `src/paycheck/utils/reference/database_constants.py`

`http://127.0.0.1:5000/delete_database`

`http://127.0.0.1:5000/setup_database`

`http://127.0.0.1:5000/add_mock_data`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd web-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The frontend will start on `http://localhost:3000`

## Usage

### Adding a Savings Category

1. Click the "+" card in the main grid
2. Enter the category name, current amount saved, goal amount, and target date
3. Choose an emoji to represent the category
4. Click "Add Category"

### Updating Progress

1. Click on any savings card to view details
2. Use the "next paycheck" button to simulate receiving a paycheck
3. The saved amount will update and progress will be recalculated

### Recalculating All Categories

1. Navigate to the "Recalculate" page
2. Select a new start date
3. Click "Recalculate" to update all categories with the new timeline

### Reordering Categories

1. Drag and drop cards in the main grid to reorder them
2. The new order will be saved automatically

## API Endpoints

### GET Endpoints
- `/get_data` - Retrieve all savings categories
- `/get_category_info` - Get specific category information
- `/saved_by_paycheck` - Get paycheck schedule for a category

### POST Endpoints
- `/add_category` - Create a new savings category
- `/update_field` - Update a field in a category
- `/recalculate_all` - Recalculate all categories with new start date
- `/update_card_order` - Update the display order of cards

### DELETE Endpoints
- `/remove_category` - Delete a savings category

## Paycheck Schedule Logic

The application uses a bimonthly pay schedule:
- **15th of each month**: First paycheck
- **30th/31st of each month**: Second paycheck
- **Weekend adjustment**: If payday falls on a weekend, it's moved to the previous Friday

### Calculation Formula
```
Amount per paycheck = (Goal - Current Saved) / Number of remaining paychecks
```

## Database Schema

The application uses a SQLite database with the following table structure:

```sql
CREATE TABLE savings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    saved REAL NOT NULL,
    goal REAL NOT NULL,
    goal_date TEXT NOT NULL,
    calculated_to_save REAL NOT NULL,
    emoji TEXT,
    display_order INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Todo

1. Add other pay schedules
2. Productionize it instead of having it be local

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues or questions, please open an issue in the repository or contact the development team.

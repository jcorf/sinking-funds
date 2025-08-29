import './Recalculate.css';
import React from 'react';
import {updateAllCategories} from "../../utils/api";
import {useNavigate} from "react-router-dom";

const Recalculate = ({startDate, updateStartDate}) => {
    const navigate = useNavigate();

    function recalculate() {
        const startDate = document.getElementById('start-date').value;
        if (startDate) {
            updateStartDate(startDate);
            // Send bimonthly flag to backend for processing
            updateAllCategories(startDate, 'bimonthly');
            navigate('/sinking-funds');
        }
    }

    return (
        <div className="date-container">
            <label htmlFor="start-date">I want to calculate my savings from this date</label>
            <div className="date-input-container">
                <input type="date" id="start-date" name="start-date" defaultValue={startDate} />
            </div>
            
            <div className="bimonthly-info">
                <p>Using bimonthly pay schedule (15th & 30th/31st)</p>
                <p>Dates will be rounded to the nearest weekday before</p>
            </div>
            
            <button onClick={recalculate}>Recalculate</button>
        </div>
    );
};

export default Recalculate;

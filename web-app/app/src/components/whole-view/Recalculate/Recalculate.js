import './Recalculate.css';
import React from 'react';
import {updateAllCategories} from "../../utils/api";
import {useNavigate} from "react-router-dom";


const Recalculate = ({startDate, updateStartDate}) => {
    const navigate = useNavigate();

    function recalculate() {
        const startDate = document.getElementById('start-date').value;
        if (startDate) {
            updateStartDate(startDate)
            updateAllCategories(startDate)
            navigate('/sinking-funds')
        }
    }

    return <div className="date-container">
        <label htmlFor="start-date">I want to calculate my savings from this date</label>
        <input type="date" id="start-date" name="start-date" defaultValue={startDate} />
        <button onClick={recalculate}>Recalculate</button>
    </div>

};

export default Recalculate;

import './AddCard.css';
import React, {useState} from 'react';
import {addCategory} from "../../utils/api";
import {getTodayDate} from "../../utils/lib";


const AddCard = ({updateGridCards}) => {

    const handleClick = () => {
        // Generate a random UUID for the category name
        const randomUUID = crypto.randomUUID();
        addCategory(randomUUID, 100, 200, "2025-12-31", getTodayDate())
            .then((res) => {
                updateGridCards();
            })
    };

    return <div className="plus-card" onClick={handleClick}>
        <div className="plus-sign">+
        </div>
    </div>

};

export default AddCard;

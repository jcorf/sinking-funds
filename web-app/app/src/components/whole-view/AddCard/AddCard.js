import './AddCard.css';
import React, {useState} from 'react';
import {addCategory} from "../../utils/api";
import {getTodayDate, getRandomEmoji} from "../../utils/lib";


const AddCard = ({updateGridCards}) => {

    const handleClick = () => {
        // Generate a random UUID and take only the first 8 characters
        const randomUUID = crypto.randomUUID().split('-')[0];
        const randomEmoji = getRandomEmoji();
        addCategory(randomUUID, 100, 200, "2025-12-31", getTodayDate(), randomEmoji)
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

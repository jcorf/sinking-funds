import './AddCard.css';
import React, {useState} from 'react';
import {addCategory} from "../../utils/api";
import {getTodayDate} from "../../utils/lib";


const AddCard = ({updateGridCards}) => {

    const [count, setCount] = useState(0);

    const handleClick = () => {
        addCategory("placeholder" + count.toString(), 100, 200, "2025-12-31", getTodayDate())
            .then((res) => {
                updateGridCards();
            })
        setCount(count + 1);
    };

    return <div className="plus-card" onClick={handleClick}>
        <div className="plus-sign">+
        </div>
    </div>

};

export default AddCard;

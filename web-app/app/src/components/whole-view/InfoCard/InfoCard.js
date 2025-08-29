import React, {useEffect, useState} from 'react';
import './InfoCard.css';
import * as emoji from 'node-emoji'
import {useNavigate} from "react-router-dom";
import {findNumPaychecks} from "../../utils/lib";
import {updateField} from "../../utils/api";

const InfoCard = ({id, category, saved, goal, toSave, goalDate, icon, updateGridCards}) => {
    const navigate = useNavigate();
    const [remainingPaychecks, setRemainingPaychecks] = useState(findNumPaychecks(toSave, saved, goal));
    const [currentEmoji, setCurrentEmoji] = useState(':heart:');

    useEffect(() => {
        // Set the emoji from the icon prop if provided, otherwise use default
        if (icon) {
            setCurrentEmoji(icon);
        }
    }, [icon]);

    const goToAbout = () => {
        navigate('/users/' + id + "/" + category);
    };

    const handleNextPaycheckClick = async (e) => {
        e.stopPropagation(); // Prevent the card click from triggering
        const nextPaycheckAmount = parseFloat(saved) + parseFloat(toSave);
        
        try {
            await updateField('saved', nextPaycheckAmount.toFixed(2), id, 'id');
            if (updateGridCards) {
                updateGridCards(); // Refresh the grid to show updated values
            }
        } catch (error) {
            console.error('Error updating saved amount:', error);
        }
    };

    const progress = (parseFloat(saved) / parseFloat(goal)) * 100;
    const progressString = progress.toFixed(1).endsWith(0) ? `${progress}` : progress.toFixed(1)
    
    // Calculate next paycheck amount
    const nextPaycheckAmount = parseFloat(saved) + parseFloat(toSave);

    return <div className="card" onClick={goToAbout}>
        <div className="card-title">
            <span>{category}</span>
            <span>{emoji.get(currentEmoji)}</span>
        </div>
        <div className="progress-bar">
            <div className="progress-bar-inner"
                 style={{width: `${progress}%`}}>
            </div>
        </div>
        <div className="card-info">
            <span>saved: ${saved}</span>
            <span>goal: ${goal}</span>
        </div>
        <div className="details">
            <span>per paycheck: ${parseFloat(toSave).toFixed(2)}</span>
            <span>date: {goalDate}</span>
            <div className="side-by-side">
                <span>in: {remainingPaychecks} {remainingPaychecks === 1 ? 'paycheck' : 'paychecks'}</span>
                <span>{progressString}%</span>
            </div>
        </div>
        <div className="next-paycheck">
            <button 
                className="next-paycheck-button"
                onClick={handleNextPaycheckClick}
            >
                next paycheck: ${nextPaycheckAmount.toFixed(2)}
            </button>
        </div>
    </div>
};

export default InfoCard;

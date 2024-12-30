import React, {useEffect} from 'react';
import './InfoCard.css';
import * as emoji from 'node-emoji'

import {useNavigate} from "react-router-dom";
import {findNumPaychecks} from "../../utils/lib";

const InfoCard = ({id, category, saved, goal, toSave, goalDate}) => {
    const navigate = useNavigate();
    const [remainingPaychecks, setRemainingPaychecks] = React.useState(findNumPaychecks(toSave, saved, goal));

    const goToAbout = () => {
        navigate('/users/' + id + "/" + category);
    };
    const progress = (parseFloat(saved) / parseFloat(goal)) * 100;
    const progressString = progress.toFixed(1).endsWith(0) ? `${progress}` : progress.toFixed(1)

    let iconString = ':heart:'.toString()

    return <div className="card" onClick={goToAbout}>
        <div className="card-title">
            <span>{category}</span>
            <span>{emoji.get(iconString)}</span>
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
            <span>per paycheck: ${toSave}</span>
            <span>date: {goalDate}</span>
            <div className="side-by-side">
                <span>in: {remainingPaychecks} paychecks</span>
                <span>{progressString}%</span>
            </div>
        </div>
    </div>
};

export default InfoCard;

import React, {useEffect, useState} from 'react';
import './Grid.css';
import Infocard from "../InfoCard/InfoCard"
import AddCard from "../AddCard/AddCard"
import {getAllData} from "../../utils/api";


const Grid = () => {
    const [cards, setCards] = useState([]);

    useEffect(() => {
        fetch('http://127.0.0.1:5000/get_data')
            .then(response => response.json())
            .then(data => {
                setCards(data['data'])
            })
            .catch(error => console.error('Error fetching data:', error));
    }, []);

    async function updateGridCards() {
        try {
            const data = await getAllData();
            setCards(data['data']);
        } catch (error) {
            console.error("Error fetching data: ", error);
        }
    }

    const rows = Math.ceil((cards.length / 3))
    function marginTop() {
        console.log(rows)
        return rows * 2;
    }

    return (
        <div className="grid">
            <div className="grid-container" style={{marginTop: `${marginTop()}%`}}>
                {cards.map((card, index) => (
                    <div className="grid-item" key={index}>
                        <Infocard id={card.id} category={card.category} saved={card.saved} icon={card.icon}
                                  goal={card.goal} toSave={card.calculated_to_save} goalDate={card.goal_date}
                                  />
                    </div>
                ))}
                <div className="grid-item">
                    <AddCard updateGridCards={updateGridCards}/>
                </div>
            </div>
        </div>
    );
};


export default Grid;

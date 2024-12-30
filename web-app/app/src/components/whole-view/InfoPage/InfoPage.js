import "./InfoPage.css"
import {useEffect, useState} from "react";
import {useNavigate, useParams} from 'react-router-dom';
import * as emoji from 'node-emoji'
import TextField from "../TextField/TextField";
import {deleteCategory, getCategoryData, getPaycheckSchedule, updateField} from "../../utils/api";

export function InfoPage({startDate}) {
    const {id, categoryName} = useParams(); // Access the route parameter (userId)
    const navigate = useNavigate();

    const [categoryData, setCategoryData] = useState([]);
    const [paySchedule, setPaySchedule] = useState([]);

    useEffect(() => {
        async function getData() {
            const catData = await getCategoryData(categoryName);
            const paycheckSchedule = await getPaycheckSchedule(categoryName, startDate);
            setCategoryData(catData)
            setPaySchedule(paycheckSchedule)
        }
        getData();
    }, []);


    const goToSinkingFunds = () => {
        navigate('/sinking-funds');
    };

    let iconString = ":heart:".toString()

    const handleDelete = () => {
        deleteCategory(id, 'id')
        goToSinkingFunds();
    }

    const handleSubtract = () => {
        const newSave = categoryData['saved'] - categoryData['calculated_to_save']
        updateField("saved", newSave,
            id, "id", startDate)
        goToSinkingFunds()
    }

    // Handle saving text on Ctrl+S
    const handleAdd = () => {
        const newSave = categoryData['saved'] + categoryData['calculated_to_save']
        updateField("saved", newSave,
            id, "id", startDate)
        goToSinkingFunds()
    };

    const handleUpdate = () => {
        goToSinkingFunds()
    };


    return (
        <div className="side-by-side">
            <div className="side-by-side-left" onClick={goToSinkingFunds}>
                ◄
            </div>
            <div className="container">
                <div className="header">
                    <div className="title"><TextField value={categoryName} fieldName="category"/></div>
                    <div className="icon">{emoji.get(iconString)}</div>
                </div>
                <div className="progress-bar">
                    <div className="progress-bar-inner"></div>
                </div>
                <div className="content">
                    <div className="info">
                        <div className="info-box"><div className="description">saved: $</div><TextField value={categoryData['saved']}
                                                                     fieldName='saved' categoryName={categoryName}/></div>
                        <div className="info-box"><div className="description">goal: $</div><TextField value={categoryData['goal']}
                                                                    fieldName='goal'
                                                                    categoryName={categoryName}
                        /></div>
                        <div className="info-box"><div className="description">by:&nbsp;</div><TextField value={categoryData['goal_date']}
                                                                      fieldName='goal_date'  categoryName={categoryName}/></div>
                        <div>to save: ${categoryData['calculated_to_save']}</div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr>
                                <th>Pay Date</th>
                                <th>Cumulative Saved</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.entries(paySchedule).map(([date, value], index) => (
                                <tr key={index}>
                                    <td>{date}</td>
                                    <td>${(Math.round(value * 100) / 100).toLocaleString()}
                                        { index === Object.entries(paySchedule).length - 1  ? ' ' + emoji.get(':star:') : ''}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="side-by-side">
                    <button onClick={handleSubtract} className="delete-button">-</button>
                    <button onClick={handleDelete} className="delete-button">Delete</button>
                    <button onClick={handleUpdate} className="delete-button">Update</button>
                    <button onClick={handleAdd} className="delete-button">+</button>
                </div>
            </div>
        </div>

    )
}

export default InfoPage;

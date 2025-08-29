import "./InfoPage.css"
import {useEffect, useState, useRef} from "react";
import {useNavigate, useParams} from 'react-router-dom';
import * as emoji from 'node-emoji'
import TextField from "../TextField/TextField";
import EmojiPicker from "../EmojiPicker/EmojiPicker";
import {deleteCategory, getCategoryData, getPaycheckSchedule, updateField} from "../../utils/api";
import {getRandomEmoji} from "../../utils/lib";

export function InfoPage({startDate}) {
    const {id, categoryName} = useParams(); // Access the route parameter (userId)
    const navigate = useNavigate();

    const [categoryData, setCategoryData] = useState([]);
    const [paySchedule, setPaySchedule] = useState([]);
    const [currentEmoji, setCurrentEmoji] = useState(getRandomEmoji());
    
    // Refs for TextField components
    const categoryRef = useRef();
    const savedRef = useRef();
    const goalRef = useRef();
    const goalDateRef = useRef();

    useEffect(() => {
        async function getData() {
            const catData = await getCategoryData(categoryName);
            const paycheckSchedule = await getPaycheckSchedule(categoryName, startDate);
            setCategoryData(catData)
            setPaySchedule(paycheckSchedule)
            
            // Set the emoji from the database if it exists
            if (catData.emoji) {
                setCurrentEmoji(catData.emoji);
            }
        }
        getData();
    }, [categoryName, startDate]);

    const goToSinkingFunds = () => {
        navigate('/sinking-funds');
    };

    const handleEmojiSelect = async (emojiCode) => {
        setCurrentEmoji(emojiCode);
        // Update the emoji in the database
        await updateField("emoji", emojiCode, id, "id", startDate);
    };

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

    const handleUpdate = async () => {
        // Save all modified fields using the refs
        let hasChanges = false;
        
        // Call save on each TextField component
        if (categoryRef.current) {
            hasChanges = categoryRef.current.save() || hasChanges;
        }
        if (savedRef.current) {
            hasChanges = savedRef.current.save() || hasChanges;
        }
        if (goalRef.current) {
            hasChanges = goalRef.current.save() || hasChanges;
        }
        if (goalDateRef.current) {
            hasChanges = goalDateRef.current.save() || hasChanges;
        }
        
        // Wait a moment for the save operations to complete
        setTimeout(() => {
            goToSinkingFunds();
        }, 200);
    };

    return (
        <div className="side-by-side">
            <div className="side-by-side-left" onClick={goToSinkingFunds}>
                ◄
            </div>
            <div className="container">
                <div className="header">
                    <div className="title"><TextField ref={categoryRef} value={categoryName} fieldName="category"/></div>
                    <div className="icon">
                        <EmojiPicker 
                            onEmojiSelect={handleEmojiSelect}
                            currentEmoji={currentEmoji}
                        />
                    </div>
                </div>
                <div className="progress-bar">
                    <div className="progress-bar-inner"></div>
                </div>
                <div className="content">
                    <div className="info">
                        <div className="info-box"><div className="description">saved: $</div><TextField ref={savedRef} value={categoryData['saved']}
                                                                     fieldName='saved' categoryName={categoryName}/></div>
                        <div className="info-box"><div className="description">goal: $</div><TextField ref={goalRef} value={categoryData['goal']}
                                                                    fieldName='goal'
                                                                    categoryName={categoryName}
                        /></div>
                        <div className="info-box"><div className="description">by:&nbsp;</div><TextField ref={goalDateRef} value={categoryData['goal_date']}
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

import React, {useEffect, useState} from "react";
import {updateField} from "../../utils/api";
import {useNavigate, useParams} from "react-router-dom";

function TextField({value, fieldName, categoryName, startDate}) {

    const {id, categoryName2} = useParams();
    const [oldValue, setOldValue] = useState({value});
    const [text, setText] = useState({
        value: ""
    });

    const [field, setField] = useState(fieldName);
    const [editingField, setEditingField] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        if (value !== undefined) {
            setOldValue(value);
            setText((prev) => ({
                ...prev, value: value
            }));
        }
    }, [value]);

    // Handle editing
    const handleEdit = (field) => {
        setEditingField(field);
    };

    // Handle input change
    const handleChange = (e) => {
        const {name, value} = e.target;
        setText((prevText) => ({
            ...prevText, [name]: value,
        }));
    };

    const goToSinkingFunds = () => {
        navigate('/sinking-funds');
    };

    // Handle saving text on Ctrl+S
    const handleSave = (e) => {

        if (e.ctrlKey && e.key === "s" && text.value !== oldValue) {
            setOldValue(text.value);
            e.preventDefault(); // Prevent browser save dialog
            setEditingField(null); // Exit editing mode
            if (field !== "category") {
                updateField(field, text.value, categoryName, startDate);
            }
            else {
                updateField(field, text.value, id, "id", startDate);
            }
            goToSinkingFunds()
        }

    };

    React.useEffect(() => {
        window.addEventListener("keydown", handleSave);
        return () => window.removeEventListener("keydown", handleSave);
    }, [text]);


    return (<div style={{display: "inline-block"}}>
            {Object.keys(text).map((field) => (<div
                    key={field}
                    style={{
                        cursor: editingField ? "text" : "pointer", display: "inline-block"
                    }}
                >
                    {editingField === field ? (// editing field not changed
                        <input
                            type="text"
                            name={field}
                            value={text[field]}
                            onChange={handleChange}
                            //onBlur={() => setEditingField(null)} // Save on blur
                            autoFocus
                            className="text-field"
                        />) : (// editing field changed
                        <span onClick={() => handleEdit(field)}>{text[field]}</span>)}
                </div>))}
        </div>);
}

export default TextField;

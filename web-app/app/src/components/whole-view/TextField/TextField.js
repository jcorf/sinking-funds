import React, {useEffect, useState, useImperativeHandle, forwardRef} from "react";
import {updateField} from "../../utils/api";
import {useNavigate, useParams} from "react-router-dom";

const TextField = forwardRef(({value, fieldName}, ref) => {

    const {id, categoryName2} = useParams();
    const [oldValue, setOldValue] = useState({value});
    const [text, setText] = useState({
        value: ""
    });

    const [field, setField] = useState(fieldName);
    const [editingField, setEditingField] = useState(null);
    const navigate = useNavigate();
    
    // Expose save method to parent component
    useImperativeHandle(ref, () => ({
        save: () => {
            if (text.value !== oldValue) {
                setOldValue(text.value);
                setEditingField(null); // Exit editing mode
                // Always identify the row by id, not by category name: if this
                // field and the category name are both being saved together,
                // a name change would make a name-based lookup for any other
                // field miss the row (it's already renamed by the time that
                // request is processed).
                updateField(field, text.value, id, "id");
                return true; // Indicate that a save occurred
            }
            return false; // No save needed
        }
    }));
    
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
            updateField(field, text.value, id, "id");
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
});

export default TextField;

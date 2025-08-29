import React, { useState } from 'react';
import './EmojiPicker.css';
import * as emoji from 'node-emoji';

const EmojiPicker = ({ onEmojiSelect, currentEmoji = ':heart:' }) => {
    const [isOpen, setIsOpen] = useState(false);


    // Common emojis for sinking funds categories
    const commonEmojis = [
        ':heart:', ':moneybag:', ':red_car:', ':house:', ':airplane:', ':gift:',
        ':dog:', ':cat:', ':baby:', ':mortar_board:', ':briefcase:', ':computer:',
        ':phone:', ':camera:', ':game_die:', ':musical_note:', ':books:', ':palm_tree:',
        ':umbrella:', ':snowflake:', ':sunny:', ':rainbow:', ':star:', ':sparkles:',
        ':fire:', ':zap:', ':gem:', ':trophy:', ':medal_sports:', ':crown:',
        ':rocket:', ':bike:', ':strawberry:', ':man_cook:', ':dizzy:',':herb:',
        ':wedding:', ':bus:', ':train:', ':taxi:', ':eyeglasses:', ':woman:', ':man:',
        ':christmas_tree:',':umbrella:', ':rotating_light:', ':tooth:'
    ];

    const handleEmojiClick = (emojiCode) => {
        onEmojiSelect(emojiCode);
        setIsOpen(false);
    };

    const togglePicker = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="emoji-picker-container">
            <div className="emoji-display" onClick={togglePicker}>
                {emoji.get(currentEmoji)}
            </div>
            {isOpen && (
                <div className="emoji-picker-dropdown">
                    <div className="emoji-grid">
                        {commonEmojis.map((emojiCode, index) => (
                            <div
                                key={index}
                                className="emoji-option"
                                onClick={() => handleEmojiClick(emojiCode)}
                                title={emojiCode}
                            >
                                {emoji.get(emojiCode)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmojiPicker;

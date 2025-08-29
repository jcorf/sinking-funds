import React from 'react';

const BulletList = ({ items, title }) => {
    if (!items || items.length === 0) {
        return (
            <div className="bullet-list-container">
                <h4 className="bullet-list-title">{title}</h4>
                <div className="bullet-list-empty">No items to display</div>
            </div>
        );
    }

    return (
        <div className="bullet-list-container">
            <h4 className="bullet-list-title">{title}</h4>
            <div className="bullet-list">
                {items.map((item, index) => (
                    <div key={index} className="bullet-list-item">• {item}</div>
                ))}
            </div>
        </div>
    );
};

export default BulletList;

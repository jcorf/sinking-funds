import React from 'react';

const PieChart = ({ data, width = 150, height = 150 }) => {
    if (!data || data.length === 0) return null;

    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    const slices = data.map((item, index) => {
        const sliceAngle = (item.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        
        const x1 = width / 2 + (width / 2 - 10) * Math.cos((startAngle - 90) * Math.PI / 180);
        const y1 = height / 2 + (height / 2 - 10) * Math.sin((startAngle - 90) * Math.PI / 180);
        const x2 = width / 2 + (width / 2 - 10) * Math.cos((endAngle - 90) * Math.PI / 180);
        const y2 = height / 2 + (height / 2 - 10) * Math.sin((endAngle - 90) * Math.PI / 180);
        
        const largeArcFlag = sliceAngle > 180 ? 1 : 0;
        
        const pathData = [
            `M ${width / 2} ${height / 2}`,
            `L ${x1} ${y1}`,
            `A ${width / 2 - 10} ${height / 2 - 10} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');

        currentAngle += sliceAngle;

        return {
            path: pathData,
            color: colors[index % colors.length],
            label: item.label,
            percentage: ((item.value / total) * 100).toFixed(1)
        };
    });

    return (
        <div className="pie-chart-container">
            <svg width={width} height={height} className="pie-chart">
                {slices.map((slice, index) => (
                    <path
                        key={index}
                        d={slice.path}
                        fill={slice.color}
                        stroke="#fff"
                        strokeWidth="1"
                    />
                ))}
            </svg>
            <div className="pie-chart-legend">
                {slices.map((slice, index) => (
                    <div key={index} className="legend-item">
                        <div 
                            className="legend-color" 
                            style={{ backgroundColor: slice.color }}
                        ></div>
                        <div className="legend-text">
                            <span className="legend-label">{slice.label}</span>
                            <span className="legend-percentage">{slice.percentage}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PieChart;

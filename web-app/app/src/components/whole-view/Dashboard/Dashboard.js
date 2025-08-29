import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import PieChart from './PieChart';
import BulletList from './BulletList';

const Dashboard = () => {
    const [summary, setSummary] = useState({
        totalSaved: 0,
        totalPerPaycheck: 0,
        totalGoal: 0,
        totalRemaining: 0,
        progressPercentage: 0,
        numberOfCategories: 0,
        averageSavedPerCategory: 0,
        averageGoalPerCategory: 0,
        categoriesCompleted: 0,
        nextPaycheckTotal: 0,
        categoriesDueNextMonth: 0,
        completionRatio: "0/0"
    });
    const [categoryData, setCategoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({});

    useEffect(() => {
        fetchSummaryData();
    }, []);

    const fetchSummaryData = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/get_data');
            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
                setCategoryData(data.data);
                
                const totals = data.data.reduce((acc, category) => {
                    acc.totalSaved += parseFloat(category.saved) || 0;
                    acc.totalPerPaycheck += parseFloat(category.calculated_to_save) || 0;
                    acc.totalGoal += parseFloat(category.goal) || 0;
                    return acc;
                }, {
                    totalSaved: 0,
                    totalPerPaycheck: 0,
                    totalGoal: 0
                });

                const totalRemaining = totals.totalGoal - totals.totalSaved;
                const progressPercentage = totals.totalGoal > 0 ? (totals.totalSaved / totals.totalGoal) * 100 : 0;
                const numberOfCategories = data.data.length;
                const averageSavedPerCategory = numberOfCategories > 0 ? totals.totalSaved / numberOfCategories : 0;
                const averageGoalPerCategory = numberOfCategories > 0 ? totals.totalGoal / numberOfCategories : 0;
                const categoriesCompleted = data.data.filter(cat => parseFloat(cat.saved) >= parseFloat(cat.goal)).length;
                const nextPaycheckTotal = totals.totalSaved + totals.totalPerPaycheck;
                
                // Calculate categories due by end of current month (e.g., August 31st if today is August 28th)
                const now = new Date();
                const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last day of current month
                
                const categoriesDueNextMonth = data.data.filter(cat => {
                    const goalDate = new Date(cat.goal_date);
                    return goalDate <= currentMonthEnd;
                }).length;
                
                // Calculate completion ratio as fraction
                const completionRatio = `${categoriesCompleted}/${numberOfCategories}`;

                setSummary({
                    ...totals,
                    totalRemaining,
                    progressPercentage: Math.round(progressPercentage * 10) / 10,
                    numberOfCategories,
                    averageSavedPerCategory,
                    averageGoalPerCategory,
                    categoriesCompleted,
                    nextPaycheckTotal,
                    categoriesDueNextMonth,
                    completionRatio
                });
            }
        } catch (error) {
            console.error('Error fetching summary data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchSummaryData();
    };

    const handleMouseEnter = (e, id) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const tooltipHeight = 200; // Approximate tooltip height
        const viewportHeight = window.innerHeight;
        
        // Check if there's enough space above the card
        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        
        // Position tooltip above if there's enough space, otherwise below
        const position = spaceAbove > tooltipHeight ? 'above' : 'below';
        
        setTooltipPosition(prev => ({
            ...prev,
            [id]: position
        }));
    };

    const handleMouseLeave = (id) => {
        setTooltipPosition(prev => ({
            ...prev,
            [id]: null
        }));
    };

    // Helper function to format numbers with 2 decimal places
    const formatCurrency = (amount) => {
        return parseFloat(amount).toFixed(2);
    };

    // Helper function to prepare pie chart data
    const preparePieChartData = (type) => {
        return categoryData.map(cat => ({
            label: cat.category,
            value: parseFloat(cat[type]) || 0
        })).filter(item => item.value > 0);
    };

    if (isLoading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <div>Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2 className="dashboard-title">Financial Summary</h2>
                <button 
                    className="refresh-button" 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    {isRefreshing ? '🔄' : '🔄'} Refresh
                </button>
            </div>
            
            <div className="dashboard-grid">
                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'totalSaved')}
                    onMouseLeave={() => handleMouseLeave('totalSaved')}
                >
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                        <h3>Total Saved</h3>
                        <div className="card-value">${formatCurrency(summary.totalSaved)}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['totalSaved'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <PieChart data={preparePieChartData('saved')} />
                    </div>
                </div>

                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'totalGoal')}
                    onMouseLeave={() => handleMouseLeave('totalGoal')}
                >
                    <div className="card-icon">🎯</div>
                    <div className="card-content">
                        <h3>Total Goal</h3>
                        <div className="card-value">${formatCurrency(summary.totalGoal)}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['totalGoal'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <PieChart data={preparePieChartData('goal')} />
                    </div>
                </div>

                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'perPaycheck')}
                    onMouseLeave={() => handleMouseLeave('perPaycheck')}
                >
                    <div className="card-icon">📈</div>
                    <div className="card-content">
                        <h3>Per Paycheck</h3>
                        <div className="card-value">${formatCurrency(summary.totalPerPaycheck)}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['perPaycheck'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <PieChart data={preparePieChartData('calculated_to_save')} />
                    </div>
                </div>

                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'remaining')}
                    onMouseLeave={() => handleMouseLeave('remaining')}
                >
                    <div className="card-icon">⏳</div>
                    <div className="card-content">
                        <h3>Remaining</h3>
                        <div className="card-value">${formatCurrency(summary.totalRemaining)}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['remaining'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <PieChart data={categoryData.map(cat => ({
                            label: cat.category,
                            value: parseFloat(cat.goal) - parseFloat(cat.saved) || 0
                        })).filter(item => item.value > 0)} />
                    </div>
                </div>

                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'avgSaved')}
                    onMouseLeave={() => handleMouseLeave('avgSaved')}
                >
                    <div className="card-icon">📋</div>
                    <div className="card-content">
                        <h3>Avg Saved/Category</h3>
                        <div className="card-value">${formatCurrency(summary.averageSavedPerCategory)}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['avgSaved'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <PieChart data={preparePieChartData('saved')} />
                    </div>
                </div>

                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'avgGoal')}
                    onMouseLeave={() => handleMouseLeave('avgGoal')}
                >
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <h3>Avg Goal/Category</h3>
                        <div className="card-value">${formatCurrency(summary.averageGoalPerCategory)}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['avgGoal'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <PieChart data={preparePieChartData('goal')} />
                    </div>
                </div>

                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'dueNextMonth')}
                    onMouseLeave={() => handleMouseLeave('dueNextMonth')}
                >
                    <div className="card-icon">📅</div>
                    <div className="card-content">
                        <h3>Due by Next Month End</h3>
                        <div className="card-value">{summary.categoriesDueNextMonth}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['dueNextMonth'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <BulletList 
                            title="Categories Due by Next Month End"
                            items={categoryData.filter(cat => {
                                const goalDate = new Date(cat.goal_date);
                                const now = new Date();
                                const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                                return goalDate <= currentMonthEnd;
                            }).map(cat => cat.category)}
                        />
                    </div>
                </div>

                <div className="dashboard-card"
                    onMouseEnter={(e) => handleMouseEnter(e, 'completed')}
                    onMouseLeave={() => handleMouseLeave('completed')}
                >
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <h3>Completed</h3>
                        <div className="card-value">{summary.completionRatio}</div>
                    </div>
                    <div className={`pie-chart-tooltip ${tooltipPosition['completed'] === 'below' ? 'tooltip-below' : 'tooltip-above'}`}>
                        <BulletList 
                            title="Completed Categories"
                            items={categoryData.filter(cat => 
                                parseFloat(cat.saved) >= parseFloat(cat.goal)
                            ).map(cat => cat.category)}
                        />
                    </div>
                </div>
            </div>

            <div className="progress-section">
                <h3>Overall Progress</h3>
                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${summary.progressPercentage}%` }}
                        ></div>
                    </div>
                    <div className="progress-text">{summary.progressPercentage}% Complete</div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import React, {useState, useEffect} from "react";
import {BrowserRouter as Router, Link, Route, Routes} from "react-router-dom";

import './App.css';

import Grid from "./components/whole-view/Grid/Grid";
import {InfoPage} from "./components/whole-view/InfoPage/InfoPage";
import Dashboard from "./components/whole-view/Dashboard/Dashboard";
import CreditCards from "./components/whole-view/CreditCards/CreditCards";
import BudgetCategories from "./components/whole-view/BudgetCategories/BudgetCategories";
import Login from "./components/whole-view/Login/Login";
import {isTestEnv} from "./components/utils/lib";
import {getSession, logout} from "./components/utils/api";

function TestBadge() {
    return isTestEnv ? <div className="test-env-badge">TEST DATA</div> : null;
}

export default function App() {
    const [authChecked, setAuthChecked] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        if (isTestEnv) {
            document.title = `[TEST] ${document.title}`;
        }
    }, []);

    useEffect(() => {
        getSession().then((session) => {
            setAuthenticated(!!session.authenticated);
            setAuthChecked(true);
        });
    }, []);

    async function handleLogout() {
        await logout();
        setAuthenticated(false);
    }

    if (!authChecked) {
        return null;
    }

    if (!authenticated) {
        return (
            <>
                <TestBadge/>
                <Login onLoginSuccess={() => setAuthenticated(true)} />
            </>
        );
    }

    return (
        <Router>
            <div>
                <TestBadge/>
                <div className={isTestEnv ? "topnav test-env" : "topnav"}>
                    <nav>
                        <span className="nav-bar-buttons"> <Link to="/dashboard">Dashboard</Link></span>
                        <span className="nav-bar-buttons"> <Link to="/sinking-funds">Sinking Funds</Link></span>
                        <span className="nav-bar-buttons"> <Link to="/credit-cards">Credit Cards</Link></span>
                        <span className="nav-bar-buttons"> <Link to="/budget-categories">Budget Categories</Link></span>
                    </nav>
                    <span className="nav-bar-buttons logout-button" onClick={handleLogout}>Log out</span>
                </div>
                <div>
                    <Routes>
                        <Route path='/' element={<Dashboard/>}/>
                        <Route path='/sinking-funds' element={<Grid/>}/>
                        <Route path='/users/:id/:categoryName' element={<InfoPage/>}/>
                        <Route path='/dashboard' element={<Dashboard/>}/>
                        <Route path='/credit-cards' element={<CreditCards/>}/>
                        <Route path='/budget-categories' element={<BudgetCategories/>}/>
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

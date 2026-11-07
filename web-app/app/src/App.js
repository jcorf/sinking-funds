import React, {useState, useEffect} from "react";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";

import './App.css';

import Grid from "./components/whole-view/Grid/Grid";
import {InfoPage} from "./components/whole-view/InfoPage/InfoPage";
import Dashboard from "./components/whole-view/Dashboard/Dashboard";
import CreditCards from "./components/whole-view/CreditCards/CreditCards";
import BudgetCategories from "./components/whole-view/BudgetCategories/BudgetCategories";
import Login from "./components/whole-view/Login/Login";
import ToolsDock from "./components/whole-view/Tools/ToolsDock";
import NavBar from "./components/whole-view/Nav/NavBar";
import Settings from "./components/whole-view/Settings/Settings";
import Contributions from "./components/whole-view/Contributions/Contributions";
import {isTestEnv} from "./components/utils/lib";
import {getSession, logout} from "./components/utils/api";

function TestBadge() {
    return isTestEnv ? <div className="test-env-badge">TEST DATA</div> : null;
}

export default function App() {
    const [authChecked, setAuthChecked] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    // Set outright (not prefixed): dev StrictMode runs effects twice.
    useEffect(() => {
        document.title = isTestEnv ? '[TEST] Sinking Funds' : 'Sinking Funds';
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
                <ToolsDock/>
                <NavBar onLogout={handleLogout}/>
                <div>
                    <Routes>
                        <Route path='/' element={<Dashboard/>}/>
                        <Route path='/sinking-funds' element={<Grid/>}/>
                        <Route path='/users/:id/:categoryName' element={<InfoPage/>}/>
                        <Route path='/dashboard' element={<Dashboard/>}/>
                        <Route path='/credit-cards' element={<CreditCards/>}/>
                        <Route path='/budget-categories' element={<BudgetCategories/>}/>
                        <Route path='/contributions' element={<Contributions/>}/>
                        <Route path='/settings' element={<Settings/>}/>
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

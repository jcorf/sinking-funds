import React, {useState, useEffect} from "react";
import {BrowserRouter as Router, Link, Route, Routes} from "react-router-dom";

import './App.css';

import Grid from "./components/whole-view/Grid/Grid";
import {InfoPage} from "./components/whole-view/InfoPage/InfoPage";
import Recalculate from "./components/whole-view/Recalculate/Recalculate";
import Dashboard from "./components/whole-view/Dashboard/Dashboard";
import CreditCards from "./components/whole-view/CreditCards/CreditCards";
import Login from "./components/whole-view/Login/Login";
import {getTodayDate} from "./components/utils/lib";
import {getSession, logout} from "./components/utils/api";

export default function App() {
    const [startDate, setStartDate] = useState(getTodayDate());
    const [authChecked, setAuthChecked] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        getSession().then((session) => {
            setAuthenticated(!!session.authenticated);
            setAuthChecked(true);
        });
    }, []);

    function updateStartDate(date) {
        setStartDate(date);
    }

    async function handleLogout() {
        await logout();
        setAuthenticated(false);
    }

    if (!authChecked) {
        return null;
    }

    if (!authenticated) {
        return <Login onLoginSuccess={() => setAuthenticated(true)} />;
    }

    return (
        <Router>
            <div>
                <div className="topnav">
                    <nav>
                        <span className="nav-bar-buttons"> <Link to="/dashboard">Dashboard</Link></span>
                        <span className="nav-bar-buttons"> <Link to="/sinking-funds">Sinking Funds</Link></span>
                        <span className="nav-bar-buttons"> <Link to="/credit-cards">Credit Cards</Link></span>
                        <span className="nav-bar-buttons"> <Link to="/recalculate">Recalculate</Link></span>
                    </nav>
                    <span className="nav-bar-buttons logout-button" onClick={handleLogout}>Log out</span>
                </div>
                <div>
                    <Routes>
                        <Route path='/' element={<Dashboard/>}/>
                        <Route path='/sinking-funds' element={<Grid/>}/>
                        <Route path='/users/:id/:categoryName' element={<InfoPage startDate={startDate}/>}/>
                        <Route path='/dashboard' element={<Dashboard/>}/>
                        <Route path='/credit-cards' element={<CreditCards/>}/>
                        <Route path='/recalculate' element={<Recalculate startDate={startDate} updateStartDate={updateStartDate} />}></Route>
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

import React, {useState} from "react";
import {BrowserRouter as Router, Link, Route, Routes} from "react-router-dom";

import './App.css';


import Grid from "./components/whole-view/Grid/Grid";
import {InfoPage} from "./components/whole-view/InfoPage/InfoPage";
import Recalculate from "./components/whole-view/Recalculate/Recalculate";
import {getTodayDate} from "./components/utils/lib";

export default function App() {
    const [startDate, setStartDate] = useState(getTodayDate());
    console.log(startDate)
    function updateStartDate(date) {
        setStartDate(date);
    }
    return (
        <Router>
            <div>
                <div className="topnav">
                    <nav>
                        <span className="nav-bar-buttons"> <Link to="/sinking-funds">Sinking Funds</Link></span>
                        <span className="nav-bar-buttons"> <Link to="/recalculate">Recalculate</Link></span>
                    </nav>
                </div>
                <div>
                    <Routes>
                        <Route path='/sinking-funds' element={<Grid/>}/>
                        <Route path='/users/:id/:categoryName' element={<InfoPage startDate={startDate}/>}/>
                        <Route path='/recalculate' element={<Recalculate startDate={startDate} updateStartDate={updateStartDate} />}></Route>
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

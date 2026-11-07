import React, { useEffect, useState } from 'react';
import { getUpcomingPaydays } from '../../utils/api';
import { formatDate } from '../SinkingFunds/goalMath';
import './Settings.css';

// The rules the app's math runs on. Read-only for now: each row says what
// the app does today, so this page can grow into real, editable settings.

function Rule({ label, children, detail }) {
    return (
        <div className="st-rule">
            <dt>{label}</dt>
            <dd>
                <span className="st-value">{children}</span>
                {detail && <span className="st-detail">{detail}</span>}
            </dd>
        </div>
    );
}

function Section({ title, intro, children }) {
    return (
        <section className="st-section">
            <h2>{title}</h2>
            {intro && <p className="st-intro">{intro}</p>}
            <div className="st-card">{children}</div>
        </section>
    );
}

const weekday = (d) => formatDate(d, { weekday: true, year: false });

// Process-wide, so revisiting the page doesn't flash an empty list.
let paydayCache = null;

function UpcomingPaydays() {
    const [paydays, setPaydays] = useState(paydayCache);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        getUpcomingPaydays(8).then((rows) => {
            if (rows) {
                paydayCache = rows;
                setPaydays(rows);
            } else {
                setFailed(true);
            }
        });
    }, []);

    if (!paydays) {
        return <p className="st-muted st-paydays-status">{failed ? "Couldn't load upcoming paydays." : 'Loading…'}</p>;
    }
    return (
        <ol className="st-paydays">
            {paydays.map(({ date, scheduled }) => (
                <li key={date}>
                    <span className="st-payday-date">{weekday(date)}</span>
                    {scheduled !== date ? (
                        <span className="st-moved">moved from {weekday(scheduled)}</span>
                    ) : (
                        <span className="st-muted">{Number(date.slice(8)) === 15 ? '15th' : 'Last day'}</span>
                    )}
                </li>
            ))}
        </ol>
    );
}

export default function Settings() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="st-page">
            <header className="st-header">
                <h1 className="st-title">Settings</h1>
                <p className="st-lede">
                    The rules behind every number in the app. They're fixed for now; this is where they'll become
                    adjustable.
                </p>
            </header>

            <Section title="Paycheck Schedule">
                <dl className="st-rules">
                    <Rule label="Frequency" detail="24 paychecks a year">
                        Semi-monthly
                    </Rule>
                    <Rule label="Paydays">The 15th and the last day of each month</Rule>
                    <Rule label="Weekend paydays" detail="A Saturday payday moves back one day; a Sunday payday, two">
                        Paid the Friday before
                    </Rule>
                    <Rule label="Holidays">Not adjusted for</Rule>
                </dl>
                <div className="st-subsection">
                    <h3>Upcoming Paydays</h3>
                    <UpcomingPaydays />
                </div>
            </Section>

            <Section title="Sinking Funds">
                <dl className="st-rules">
                    <Rule label="Per paycheck" detail="Paydays are counted from the goal's plan start through its due date">
                        (Goal − Saved) ÷ paychecks left
                    </Rule>
                    <Rule label="Plan start" detail="The first payday on or after the date the goal was last planned from">
                        Each goal's first paycheck
                    </Rule>
                    <Rule label="Logging a paycheck" detail="That payday is filled, so planning continues from the next one">
                        Moves the plan start to the following payday
                    </Rule>
                    <Rule label="Recalculating" detail="So that payday is counted in the plan">
                        Plans from the day before the payday you pick
                    </Rule>
                    <Rule label="Editing a goal by hand">Keeps its plan start</Rule>
                    <Rule label="Rounding" detail="The last paycheck in a plan absorbs any leftover cents">
                        Shown to the cent
                    </Rule>
                </dl>
            </Section>

            <Section title="Paycheck">
                <dl className="st-rules">
                    <Rule label="Net Pay">Gross Pay − Pre-Tax − Taxes</Rule>
                    <Rule label="Available to Budget">Net Pay − Post-Tax</Rule>
                    <Rule label="Leftover">Available to Budget − Pre-Budgeted</Rule>
                    <Rule label="Taxes" detail="Enter them from your ADP paycheck calculator">
                        Entered by hand
                    </Rule>
                    <Rule label="What If, per year">Change per paycheck × 24</Rule>
                </dl>
            </Section>

            <Section title="Contributions">
                <dl className="st-rules">
                    <Rule label="Left to contribute" detail="Your total is counted on the “as of” paycheck itself">
                        Yearly maximum − Contributed so far
                    </Rule>
                    <Rule label="Paychecks in the plan" detail="Pick “Start of year” as the “as of” point to count all 24. The end defaults to the last paycheck of the year">
                        After the “as of” paycheck, through the “reach it by” paycheck
                    </Rule>
                    <Rule label="Per paycheck" detail="Rounded up to the cent; the last one takes up the slack">
                        Left to contribute ÷ paychecks chosen on the slider
                    </Rule>
                    <Rule label="Which paychecks" detail="The rest stay at $0 once you reach the maximum">
                        The next ones, starting with the first after “as of”
                    </Rule>
                    <Rule label="Percent, pre-tax accounts" detail="The % switch uses gross pay">
                        Per paycheck ÷ Gross Pay
                    </Rule>
                    <Rule label="Percent, post-tax accounts" detail="The % net switch uses net pay, since these come out of take-home pay. Net Pay is as on the Paycheck page">
                        Per paycheck ÷ (Gross Pay − Pre-Tax − Taxes)
                    </Rule>
                    <Rule label="Percent note">Post-tax accounts also show the percent of gross pay</Rule>
                    <Rule label="Yearly maximums" detail="They change every year, so you type them in">
                        Entered by hand
                    </Rule>
                </dl>
            </Section>

            <Section title="Credit Cards">
                <dl className="st-rules">
                    <Rule label="Card balance">Posted + Pending − Covered</Rule>
                    <Rule label="Cards vs bucket" detail="Positive means move that much into the bucket">
                        Total owed − Bucket balance
                    </Rule>
                </dl>
            </Section>

            <Section title="Overview">
                <dl className="st-rules">
                    <Rule label="Due soon">Goals due within 30 days</Rule>
                    <Rule label="Finishing next paycheck">Goals whose next planned paycheck covers what's left</Rule>
                </dl>
            </Section>
        </div>
    );
}

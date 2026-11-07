import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { JarMark } from '../Login/Login';
import { isTestEnv } from '../../utils/lib';
import './NavBar.css';

const LINKS = [
    { to: '/dashboard', label: 'Dashboard', match: (p) => p === '/' || p.startsWith('/dashboard') },
    // A goal's detail page (/users/:id/:name) belongs to Sinking Funds.
    { to: '/sinking-funds', label: 'Sinking Funds', match: (p) => p.startsWith('/sinking-funds') || p.startsWith('/users/') },
    { to: '/credit-cards', label: 'Credit Cards', match: (p) => p.startsWith('/credit-cards') },
    { to: '/budget-categories', label: 'Budget Categories', match: (p) => p.startsWith('/budget-categories') },
];

// Floating sage nav: jar mark + wordmark, page links (current page as a soft
// sage pill), and Log out on the right. The test instance gets an amber
// outline and a TEST tag so it can't be mistaken for real data.
export default function NavBar({ onLogout }) {
    const { pathname } = useLocation();

    return (
        <div className="nb-wrap">
            <header className={`nb-bar ${isTestEnv ? 'is-test' : ''}`}>
                <Link to="/dashboard" className="nb-brand" aria-label="Sinking Funds home">
                    <span className="nb-mark">
                        <JarMark size={26} />
                    </span>
                    <span className="nb-wordmark">Sinking Funds</span>
                    {isTestEnv && <span className="nb-test-tag">Test</span>}
                </Link>

                <nav className="nb-links" aria-label="Main">
                    {LINKS.map(({ to, label, match }) => {
                        const current = match(pathname);
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={`nb-link ${current ? 'is-current' : ''}`}
                                aria-current={current ? 'page' : undefined}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <button type="button" className="nb-logout" onClick={onLogout}>
                    <LogOut size={16} aria-hidden="true" />
                    Log out
                </button>
            </header>
        </div>
    );
}

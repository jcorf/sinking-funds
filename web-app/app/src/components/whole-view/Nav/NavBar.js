import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function NavBar({ onLogout }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const linksRef = useRef(null);
    const linkRefs = useRef({});
    const currentIndex = LINKS.findIndex((l) => l.match(pathname));

    // The glass indicator: one pill that glides between tabs.
    const [pill, setPill] = useState(null); // { x, y, w, h, phase }

    const measure = useCallback((index) => {
        const el = linkRefs.current[index];
        if (!el) return null;
        return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    }, []);

    useLayoutEffect(() => {
        if (currentIndex < 0) {
            setPill(null);
            return undefined;
        }
        const target = measure(currentIndex);
        if (!target) return undefined;
        setPill((prev) => {
            // First paint, reduced motion, or a different row (wrapped nav): jump.
            if (!prev || prefersReducedMotion() || prev.y !== target.y) return { ...target, phase: 'still' };
            return { ...target, phase: 'glide' };
        });
    }, [currentIndex, measure]);

    // Re-measure on resize (wrapping changes positions), without animating.
    useLayoutEffect(() => {
        const onResize = () => {
            const target = measure(currentIndex);
            if (target) setPill({ ...target, phase: 'still' });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [currentIndex, measure]);

    // Smooth page change: cross-fade + a small slide in the direction of
    // travel via the View Transitions API, where supported.
    const go = (e, to, index) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (!document.startViewTransition || prefersReducedMotion() || index === currentIndex) return;
        e.preventDefault();
        document.documentElement.dataset.navDir = index > currentIndex ? 'forward' : 'back';
        const transition = document.startViewTransition(() => {
            flushSync(() => navigate(to));
        });
        transition.finished.finally(() => {
            delete document.documentElement.dataset.navDir;
        });
    };

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

                <nav className={`nb-links ${pill ? 'has-pill' : ''}`} aria-label="Main" ref={linksRef}>
                    {pill && (
                        <span
                            className={`nb-pill is-${pill.phase}`}
                            aria-hidden="true"
                            style={{
                                width: pill.w,
                                height: pill.h,
                                transform: `translate(${pill.x}px, ${pill.y}px)`,
                            }}
                        />
                    )}
                    {LINKS.map(({ to, label, match }, index) => {
                        const current = match(pathname);
                        return (
                            <Link
                                key={to}
                                to={to}
                                ref={(el) => {
                                    linkRefs.current[index] = el;
                                }}
                                onClick={(e) => go(e, to, index)}
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

import React, { useEffect, useState, useRef } from 'react';

const sectionIds = ['about-me', 'experience', 'projects', 'education', 'certifications', 'contact'];

const TopNav = ({ isDarkMode, onToggleTheme }) => {
  const [activeSection, setActiveSection] = useState('about-me');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  const navLinksRef = useRef(null);
  const manualNavTimeoutRef = useRef(null);

  // Detect scroll for nav background blur enhancement
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (manualNavTimeoutRef.current) {
        clearTimeout(manualNavTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if user is manually navigating
        if (isManualNavigation) return;

        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.2,
      }
    );

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isManualNavigation]);

  // Fallback: on scroll, set active section based on closest section to viewport top
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      // Skip if user is manually navigating
      if (isManualNavigation) return;

      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const sections = sectionIds
          .map((id) => {
            const el = document.getElementById(id);
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return { id, top: rect.top };
          })
          .filter(Boolean);

        // Choose the section whose top is closest to viewport top but not below 70% viewport
        const viewportGuard = window.innerHeight * 0.7;
        let best = sections[0];
        sections.forEach((s) => {
          if (s.top < viewportGuard) {
            if (!best || Math.abs(s.top) < Math.abs(best.top)) {
              best = s;
            }
          }
        });

        if (best && best.id !== activeSection) {
          setActiveSection(best.id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection, isManualNavigation]);

  // Update highlighter position when active section changes
  useEffect(() => {
    const updatePillPosition = () => {
      if (navLinksRef.current) {
        const activeLink = navLinksRef.current.querySelector('.nav-link.active');
        if (activeLink) {
          const rect = activeLink.getBoundingClientRect();
          const containerRect = navLinksRef.current.getBoundingClientRect();
          const offsetLeft = rect.left - containerRect.left;
          navLinksRef.current.style.setProperty('--pill-left', `${offsetLeft}px`);
          navLinksRef.current.style.setProperty('--pill-width', `${rect.width}px`);
        }
      }
    };

    // run after paint
    requestAnimationFrame(updatePillPosition);
  }, [activeSection]);

  // Initialize pill position on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      if (navLinksRef.current) {
        const activeLink = navLinksRef.current.querySelector('.nav-link.active');
        if (activeLink) {
          const rect = activeLink.getBoundingClientRect();
          const containerRect = navLinksRef.current.getBoundingClientRect();
          const offsetLeft = rect.left - containerRect.left;
          navLinksRef.current.style.setProperty('--pill-left', `${offsetLeft}px`);
          navLinksRef.current.style.setProperty('--pill-width', `${rect.width}px`);
        }
      }
    });
  }, []);
  // Initialize pill position on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navLinksRef.current) {
        const activeLink = navLinksRef.current.querySelector('.nav-link.active');
        console.log('Initial mount - checking active link:', activeLink);
        if (activeLink) {
          const rect = activeLink.getBoundingClientRect();
          const containerRect = navLinksRef.current.getBoundingClientRect();
          const offsetLeft = rect.left - containerRect.left;
          
          console.log('Initial mount - setting pill:', { offsetLeft, width: rect.width });
          
          navLinksRef.current.style.setProperty('--pill-left', `${offsetLeft}px`);
          navLinksRef.current.style.setProperty('--pill-width', `${rect.width}px`);
        }
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // Recalculate on window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (navLinksRef.current) {
        const activeLink = navLinksRef.current.querySelector('.nav-link.active');
        if (activeLink) {
          const rect = activeLink.getBoundingClientRect();
          const containerRect = navLinksRef.current.getBoundingClientRect();
          const offsetLeft = rect.left - containerRect.left;
          
          navLinksRef.current.style.setProperty('--pill-left', `${offsetLeft}px`);
          navLinksRef.current.style.setProperty('--pill-width', `${rect.width}px`);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { id: 'about-me', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'education', label: 'Education' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <nav className={`top-nav ${isScrolled ? 'is-scrolled' : ''}`}>
      <span
        className="logo"
        onClick={scrollToTop}
        role="button"
        tabIndex="0"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && scrollToTop()}
        title="Scroll to top"
      >
        GS
      </span>
      <div className="nav-links" ref={navLinksRef}>
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
            aria-current={activeSection === item.id ? 'page' : undefined}
            onClick={(e) => {
              // Override automatic tracking during manual navigation
              setActiveSection(item.id);
              setIsManualNavigation(true);

              // Clear any previous timeout
              if (manualNavTimeoutRef.current) {
                clearTimeout(manualNavTimeoutRef.current);
              }

              // Re-enable tracking after scroll completes (800ms for smooth scroll)
              manualNavTimeoutRef.current = setTimeout(() => {
                setIsManualNavigation(false);
              }, 800);
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
      <button
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDarkMode}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        type="button"
      >
        {isDarkMode ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" opacity="0.18" />
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="5.5" fill="currentColor" opacity="0.18" />
            <circle cx="12" cy="12" r="5.5" />
            <path d="M12 2.5v2.5m0 14v2.5m9-9h-2.5m-14 0H2.5m15.01-6.51-1.77 1.77M8.26 17.74l-1.77 1.77m12.02 0-1.77-1.77M8.26 6.26 6.49 4.49" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </nav>
  );
};

export default TopNav;

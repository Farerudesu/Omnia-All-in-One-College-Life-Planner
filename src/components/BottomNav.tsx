import { NavLink } from 'react-router-dom';
import { Clock, CheckSquare, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';
import { translations } from '../lib/i18n';

export function BottomNav() {
  const lang = useLanguage();
  const t = translations[lang].nav;

  const tabs = [
    {
      to: '/schedule',
      label: t.schedule,
      icon: Clock,
    },
    {
      to: '/assignments',
      label: t.assignments,
      icon: CheckSquare,
    },
    {
      to: '/calendar',
      label: t.calendar,
      icon: Calendar,
    },
    {
      to: '/finance',
      label: t.finance,
      icon: DollarSign,
    },
    {
      to: '/ask-omni',
      label: t.askOmni,
      icon: Sparkles,
      isSpecial: true,
    },
  ];

  return (
    <nav className="app-bottom-nav safe-area-bottom" aria-label="Mobile bottom navigation">
      <div className="app-bottom-nav__bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `app-bottom-nav__link ${isActive ? 'app-bottom-nav__link--active' : ''} ${
                  tab.isSpecial ? 'app-bottom-nav__link--omni' : ''
                }`
              }
              aria-label={tab.label}
            >
              {({ isActive }) => (
                <>
                  <div className={`app-bottom-nav__icon-wrapper ${isActive ? 'app-bottom-nav__icon-wrapper--active' : ''}`}>
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.2 : 1.7}
                      className="app-bottom-nav__icon"
                    />
                    {tab.isSpecial && (
                      <span className="app-bottom-nav__omni-glow" aria-hidden="true" />
                    )}
                  </div>
                  <span className="app-bottom-nav__label">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

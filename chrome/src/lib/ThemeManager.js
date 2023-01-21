////////////////////////////////////////////////////////////////////////
// Initialization

initTheme();

window.addEventListener('storage', (event) => {
    handleNewThemeSetting(getThemeSetting());
});

window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => {
        if (getThemeSetting() === 'system') {
            const theme = event.matches ? 'dark' : 'light';
            setPageTheme(theme);
        }
    });

////////////////////////////////////////////////////////////////////////

export function getThemeSetting() {
    return window.localStorage.getItem('edKarmaTheme');
}

export function setThemeSetting(setting) {
    handleNewThemeSetting(setting);
    window.localStorage.setItem('edKarmaTheme', setting);
}

function initTheme() {
    const setting = getThemeSetting();
    if (setting === null) {
        handleNewThemeSetting('light');
    } else {
        handleNewThemeSetting(setting);
    }
}

function handleNewThemeSetting(setting) {
    if (setting === 'system') {
        setPageTheme(getSystemTheme());
    } else {
        setPageTheme(setting);
    }
}

function getSystemTheme() {
    if (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
        return 'dark';
    } else {
        return 'light';
    }
}

/**
 * Set the theme of the page
 * @param {string} theme - "light" or "dark"
 */
function setPageTheme(theme) {
    document.documentElement.dataset.edKarmaTheme = theme;
}

////////////////////////////////////////////////////////////////////////

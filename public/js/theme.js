// Function to set the theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateButtonText(theme);
    
    // Set body class for additional styling hooks
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
    
    console.log('Theme set to:', theme);
}

// Function to update the toggle button text and icon
function updateButtonText(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const iconElement = themeToggle.querySelector('i');
        const textElement = themeToggle.querySelector('span');
        
        if (theme === 'dark') {
            iconElement.className = 'fas fa-sun';
            textElement.textContent = 'Light Mode';
        } else {
            iconElement.className = 'fas fa-moon';
            textElement.textContent = 'Dark Mode';
        }
    }
}

// Function to check if user prefers dark mode
function getPreferredTheme() {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    
    // If no saved preference, check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
}

// Initialize theme immediately to prevent flash
const initialTheme = getPreferredTheme();
setTheme(initialTheme);

// Apply the theme on page load and set up event listener
document.addEventListener('DOMContentLoaded', function () {
    // Make sure theme is applied properly on load
    const currentTheme = getPreferredTheme();
    setTheme(currentTheme);

    // Add event listener to the theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            console.log('Toggling from', currentTheme, 'to', newTheme);
            setTheme(newTheme);
        });
    }
    
    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                setTheme(newTheme);
            }
        });
    }
});
/**
 * Global User Experience (UX) Utilities
 * Handles loading states and micro-interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Global Form Submission Loading State
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', function (e) {
            // Find the submit button for this form
            // It could be a button[type="submit"] or input[type="submit"]
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

            if (submitBtn) {
                // Add loading class
                submitBtn.classList.add('btn-loading');

                // Optional: Disable the button to prevent double-submit
                // Note: Some browsers stop submission if disabled immediately
                // but we handle this via pointer-events in CSS usually
            }
        });
    });
});

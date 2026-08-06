// Basic Login Form Script
class BasicLoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.successMessage = document.getElementById('successMessage');

        this.init();
    }

    init() {
        FormUtils.addSharedAnimations();
        FormUtils.setupFloatingLabels(this.form);
        FormUtils.setupPasswordToggle(this.passwordInput, this.passwordToggle);

        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.emailInput.addEventListener('input', () => this.validateField('email'));
        this.passwordInput.addEventListener('input', () => this.validateField('password'));

        FormUtils.addEntranceAnimation(this.form.closest('.login-card'), 100);
    }

    validateField(fieldName) {
        const input = document.getElementById(fieldName);
        const value = input.value.trim();
        let validation;

        FormUtils.clearError(fieldName);

        if (fieldName === 'email') {
            validation = FormUtils.validateEmail(value);
        } else if (fieldName === 'password') {
            validation = FormUtils.validatePassword(value);
        }

        if (!validation.isValid && value !== '') {
            FormUtils.showError(fieldName, validation.message);
            return false;
        } else if (validation.isValid) {
            FormUtils.showSuccess(fieldName);
            return true;
        }

        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value.trim();

        const emailValid = this.validateField('email');
        const passwordValid = this.validateField('password');

        if (!emailValid || !passwordValid) {
            FormUtils.showNotification('Please fix the errors below', 'error', this.form);
            return;
        }

        const submitBtn = this.form.querySelector('.login-btn');
        submitBtn.classList.add('loading');

        try {
            const response = await fetch('/backend/login/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // success from backend
            if (data.success) {
                this.showSuccess();
            } else {
                throw new Error('Login failed');
            }

        } catch (error) {
            FormUtils.showNotification(error.message, 'error', this.form);
        } finally {
            submitBtn.classList.remove('loading');
        }
    }

    showSuccess() {
        this.form.style.display = 'none';
        this.successMessage.classList.add('show');

        setTimeout(() => {
            FormUtils.showNotification('Redirecting to dashboard...', 'success', this.successMessage);
            window.location.href = "/apps/";
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BasicLoginForm();
});
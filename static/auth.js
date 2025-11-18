/**
 * Auth Page JavaScript
 * Handles form switching, password visibility, and form validation
 */

(function() {
  'use strict';

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const authForms = document.querySelectorAll('.auth-form');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const passwordToggles = document.querySelectorAll('.password-toggle');
  const loginPassword = document.getElementById('loginPassword');
  const signupPassword = document.getElementById('signupPassword');
  const signupConfirmPassword = document.getElementById('signupConfirmPassword');

  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Update active tab
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show corresponding form
      authForms.forEach(form => form.classList.remove('active'));
      const targetForm = tab === 'login' ? loginForm : signupForm;
      targetForm.classList.add('active');
    });
  });

  // Password Visibility Toggle
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = toggle.parentElement.querySelector('input[type="password"], input[type="text"]');
      const isPassword = input.type === 'password';
      
      input.type = isPassword ? 'text' : 'password';
      toggle.querySelector('.eye-icon').textContent = isPassword ? '🙈' : '👁️';
    });
  });

  // Form Validation
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      const password = signupPassword.value;
      const confirmPassword = signupConfirmPassword.value;
      
      // Check password match
      if (password !== confirmPassword) {
        e.preventDefault();
        showMessage(signupForm, 'Passwords do not match', 'error');
        signupConfirmPassword.focus();
        return false;
      }
      
      // Check password length
      if (password.length < 8) {
        e.preventDefault();
        showMessage(signupForm, 'Password must be at least 8 characters', 'error');
        signupPassword.focus();
        return false;
      }
    });
  }

  // Show message function
  function showMessage(form, text, type) {
    // Remove existing messages
    const existing = form.querySelector('.auth-message');
    if (existing) {
      existing.remove();
    }
    
    // Create new message
    const message = document.createElement('div');
    message.className = `auth-message ${type} show`;
    message.textContent = text;
    
    // Insert at the top of form
    const firstChild = form.querySelector('.form-header');
    firstChild.insertAdjacentElement('afterend', message);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      message.classList.remove('show');
      setTimeout(() => message.remove(), 300);
    }, 5000);
  }

  // Add smooth transitions
  document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.body.style.transition = 'opacity 0.3s';
      document.body.style.opacity = '1';
    }, 10);
  });

  // Social login buttons (placeholder)
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const provider = btn.classList.contains('google') ? 'Google' : 'GitHub';
      alert(`${provider} login integration would go here`);
    });
  });

})();


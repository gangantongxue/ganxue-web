// UI交互相关功能
import { validateEmail, getCaptcha, registerUser, loginUser, deleteUser } from './auth.js';

// 表单切换动画
export function showLoginForm() {
    const loginForm = document.getElementById('login');
    const registerForm = document.getElementById('register');
    const resetForm = document.getElementById('reset-password');
    const btn = document.getElementById('btn');

    loginForm.style.left = '50px';
    registerForm.style.left = '450px';
    resetForm.style.left = '-400px';
    btn.style.left = '0';
}

export function showRegisterForm() {
    const loginForm = document.getElementById('login');
    const registerForm = document.getElementById('register');
    const resetForm = document.getElementById('reset-password');
    const btn = document.getElementById('btn');

    loginForm.style.left = '-400px';
    registerForm.style.left = '50px';
    resetForm.style.left = '-400px';
    btn.style.left = '110px';
}

export function showResetPasswordForm() {
    const loginForm = document.getElementById('login');
    const registerForm = document.getElementById('register');
    const resetForm = document.getElementById('reset-password');
    const btn = document.getElementById('btn');

    loginForm.style.left = '-400px';
    registerForm.style.left = '450px';
    resetForm.style.left = '50px';
    btn.style.left = '0';
    
    // 修改注册按钮的点击事件，确保从忘记密码界面点击注册时能正确切换
    const registerBtn = document.getElementById('registerBtn');
    registerBtn.onclick = function() {
        showRegisterForm();
    };
}

// 验证码倒计时
let countdown = 60;
let timer = null;

export function startCountdown(button) {
    button.disabled = true;
    button.textContent = `${countdown}秒后重新获取`;
    
    timer = setInterval(() => {
        countdown--;
        button.textContent = `${countdown}秒后重新获取`;
        
        if (countdown === 0) {
            clearInterval(timer);
            button.disabled = false;
            button.textContent = '获取验证码';
            countdown = 60;
        }
    }, 1000);
}

// 创建Toast提示组件
export function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-container');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-container toast-${type}`;
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 创建确认对话框组件
export function showConfirmDialog(options) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'dialog-container';
    
    dialogContainer.innerHTML = `
        <div class="dialog-title">${options.title || '确认'}</div>
        <div class="dialog-message">${options.message || ''}</div>
        <div class="dialog-buttons">
            <button class="dialog-button dialog-button-cancel">${options.cancelText || '取消'}</button>
            <button class="dialog-button dialog-button-confirm">${options.confirmText || '确认'}</button>
        </div>
    `;
    
    overlay.appendChild(dialogContainer);
    document.body.appendChild(overlay);
    
    const confirmButton = dialogContainer.querySelector('.dialog-button-confirm');
    const cancelButton = dialogContainer.querySelector('.dialog-button-cancel');
    
    const closeDialog = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        }, 300);
    };
    
    confirmButton.addEventListener('click', () => {
        if (typeof options.onConfirm === 'function') {
            options.onConfirm();
        }
        closeDialog();
    });
    
    cancelButton.addEventListener('click', () => {
        if (typeof options.onCancel === 'function') {
            options.onCancel();
        }
        closeDialog();
    });
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            if (typeof options.onCancel === 'function') {
                options.onCancel();
            }
            closeDialog();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
}

// 密码显示/隐藏切换
export function initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.getAttribute('type');
            passwordInput.setAttribute('type', type === 'password' ? 'text' : 'password');
            this.textContent = type === 'password' ? '👁️‍🗨️' : '👁️';
        });
    });
}
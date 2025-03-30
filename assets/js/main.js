// 主要的JavaScript文件
import { validateEmail, registerUser, loginUser, deleteUser, resetPassword, getCaptcha } from './auth.js';
import { showLoginForm, showRegisterForm, showResetPasswordForm, startCountdown, showToast, showConfirmDialog, initPasswordToggles } from './ui.js';

// 初始化密码显示/隐藏功能
initPasswordToggles();

// 表单切换事件
window.login = showLoginForm;
window.register = showRegisterForm;
window.showResetPassword = showResetPasswordForm;
window.backToLogin = showLoginForm;

// 邮箱输入框实时验证
const emailInput = document.querySelector('#register input[name="email"]');
const getCaptchaBtn = document.getElementById('getCaptchaBtn');

// 初始状态设置按钮为禁用
getCaptchaBtn.disabled = true;

// 监听邮箱输入框变化
emailInput.addEventListener('input', function() {
    const email = this.value.trim();
    getCaptchaBtn.disabled = !email || !validateEmail(email);
});

// 获取验证码按钮点击事件
getCaptchaBtn.addEventListener('click', async function() {
    const email = emailInput.value.trim();
    
    try {
        await getCaptcha(email);
        showToast('验证码已发送到您的邮箱', 'success');
        startCountdown(this);
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// 注册表单提交事件
document.getElementById('register').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = this.querySelector('input[name="username"]').value;
    const email = this.querySelector('input[name="email"]').value;
    const passwords = this.querySelectorAll('input[type="password"]');
    const checkbox = this.querySelector('.check-box');
    const captchaInput = this.querySelector('input[name="captcha"]');
    
    if (passwords[0].value !== passwords[1].value) {
        showToast('两次输入的密码不一致！', 'error');
        return;
    }
    
    if (!checkbox.checked) {
        showToast('请同意服务条款！', 'error');
        return;
    }

    const userData = {
        email: email,
        user_name: username,
        password: passwords[0].value,
        ver_code: captchaInput.value
    };

    try {
        const { success, data } = await registerUser(userData);
        
        if (success) {
            showToast('注册成功！', 'success');
            this.reset();
            showLoginForm();
        } else if (data.status === 409) {
            showConfirmDialog({
                title: '账号已存在',
                message: `邮箱 ${email} 已注册，用户名为 ${data.data?.user_name || username}，是否继续注册？`,
                confirmText: '继续注册',
                cancelText: '是我，去登录',
                onConfirm: async () => {
                    try {
                        showToast('正在处理，请稍候...', 'info');
                        const deleteResult = await deleteUser(email);
                        
                        if (deleteResult.success) {
                            showToast('已删除旧账号，正在重新注册...', 'success');
                            const registerResult = await registerUser(userData);
                            
                            if (registerResult.success) {
                                showToast('注册成功！', 'success');
                                this.reset();
                                showLoginForm();
                            } else {
                                showToast(registerResult.data.message || '重新注册失败，请重试', 'error');
                            }
                        } else {
                            showToast('删除旧账号失败，请稍后重试', 'error');
                        }
                    } catch (error) {
                        showToast('操作失败，请稍后重试。错误详情：' + error.message, 'error');
                    }
                },
                onCancel: () => {
                    showLoginForm();
                    setTimeout(() => {
                        const loginEmailInput = document.querySelector('#login input[type="email"]');
                        if (loginEmailInput) {
                            loginEmailInput.value = email;
                        }
                    }, 100);
                }
            });
        } else {
            showToast(data.message || '注册失败，请重试', 'error');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            showToast('无法连接到服务器，请确保服务器已启动并且网络连接正常', 'error');
        } else {
            showToast('服务器错误，请稍后重试。错误详情：' + error.message, 'error');
        }
    }
});

// 登录表单提交事件
document.getElementById('login').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = this.querySelector('input[type="email"]').value;
    const password = this.querySelector('input[type="password"]').value;
    const checkbox = this.querySelector('.check-box');
    
    if (!email || !password) {
        showToast('请填写完整的登录信息！', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showToast('请输入有效的邮箱地址！', 'error');
        return;
    }

    try {
        const credentials = { email, password };
        const { success, data } = await loginUser(credentials);
        
        if (success) {
            if (checkbox.checked) {
                // 记住登录状态，存储邮箱
                setCookie('rememberedEmail', email, 30);
            } else {
                document.cookie = 'rememberedEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }

            showToast('登录成功！', 'success');
            this.reset();
        } else {
            showToast(data.message || '登录失败，请检查邮箱和密码！', 'error');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            showToast('无法连接到服务器，请确保服务器已启动并且网络连接正常', 'error');
        } else {
            showToast('服务器错误，请稍后重试。错误详情：' + error.message, 'error');
        }
    }
});

// 实时密码验证
const passwordInputs = document.querySelectorAll('#register input[type="password"]');
const firstPassword = passwordInputs[0];
const secondPassword = passwordInputs[1];

// 创建提示元素
const passwordTip = document.createElement('div');
passwordTip.style.color = '#ff4d4d';
passwordTip.style.fontSize = '12px';
passwordTip.style.marginTop = '5px';
secondPassword.parentElement.appendChild(passwordTip);

// 检查密码一致性的函数
function checkPasswordMatch() {
    const password1 = firstPassword.value;
    const password2 = secondPassword.value;
    
    if (password2.length === 0) {
        passwordTip.textContent = '';
        return;
    }
    
    if (password1 !== password2) {
        passwordTip.textContent = '两次输入的密码不一致';
        secondPassword.style.borderBottom = '1px solid #ff4d4d';
    } else {
        passwordTip.textContent = '';
        secondPassword.style.borderBottom = '1px solid #999';
    }
}

// 监听两个密码输入框的变化
firstPassword.addEventListener('input', checkPasswordMatch);
secondPassword.addEventListener('input', checkPasswordMatch);

// 重置密码相关功能
const resetEmailInput = document.querySelector('#reset-password input[name="reset-email"]');
const resetCaptchaBtn = document.getElementById('resetCaptchaBtn');

// 监听重置密码邮箱输入框变化
resetEmailInput.addEventListener('input', function() {
    const email = this.value.trim();
    resetCaptchaBtn.disabled = !email || !validateEmail(email);
});

// 重置密码获取验证码按钮点击事件
resetCaptchaBtn.addEventListener('click', async function() {
    const email = resetEmailInput.value.trim();
    
    try {
        await getCaptcha(email);
        showToast('验证码已发送到您的邮箱', 'success');
        startCountdown(this);
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// 重置密码表单提交事件
document.getElementById('reset-password').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = this.querySelector('input[name="reset-email"]').value.trim();
    const verCode = this.querySelector('input[name="reset-captcha"]').value.trim();
    const newPassword = this.querySelector('input[name="new-password"]').value;
    const confirmPassword = this.querySelector('input[name="confirm-password"]').value;
    
    if (!email || !verCode || !newPassword || !confirmPassword) {
        showToast('请填写完整的重置密码信息！', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('请输入有效的邮箱地址！', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('两次输入的密码不一致！', 'error');
        return;
    }
    
    try {
        const resetData = {
            email: email,
            new_password: newPassword,
            ver_code: verCode
        };
        
        const { success, data } = await resetPassword(resetData);
        
        if (success) {
            showToast('密码重置成功！请使用新密码登录', 'success');
            this.reset();
            showLoginForm();
        } else {
            showToast(data.message || '密码重置失败，请检查邮箱和验证码！', 'error');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            showToast('无法连接到服务器，请确保服务器已启动并且网络连接正常', 'error');
        } else {
            showToast('服务器错误，请稍后重试。错误详情：' + error.message, 'error');
        }
    }
});
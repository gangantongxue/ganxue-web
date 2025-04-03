// 用户认证相关功能
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 设置cookie的辅助函数
export function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
}

// 获取Cookie的辅助函数
export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// 刷新短token
async function refreshToken() {
    try {
        const response = await fetch('/api/open/refresh', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include' // 确保发送cookies
        });
        
        if (!response.ok) {
            throw new Error('刷新token失败');
        }
        
        const data = await response.json();
        // 更新短token
        localStorage.setItem('shortToken', data.token);
        return data.token;
    } catch (error) {
        console.error('刷新token失败:', error);
        // 如果刷新失败，可能需要重新登录
        window.location.href = 'index.html';
        throw error;
    }
}

// 通用的API请求函数，支持自动刷新token和处理500错误
export async function authRequest(url, options = {}) {
    // 确保options.headers存在
    if (!options.headers) {
        options.headers = {};
    }
    
    // 添加短token到请求头
    const shortToken = localStorage.getItem('shortToken');
    if (shortToken) {
        options.headers['Authorization'] = `Bearer ${shortToken}`;
    }
    
    // 确保包含credentials
    options.credentials = 'include';
    
    // 最大重试次数
    const maxRetries = 1;
    let retries = 0;
    
    try {
        let response = await fetch(url, options);
        
        // 如果返回401状态码，尝试刷新token
        if (response.status === 401) {
            console.log('Token过期，尝试刷新...');
            
            // 刷新token
            const newToken = await refreshToken();
            
            // 使用新token重试请求
            options.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, options);
        }
        
        // 处理500状态码
        while (response.status === 500 && retries < maxRetries) {
            console.log(`服务器错误，正在进行第${retries + 1}次重试...`);
            retries++;
            
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 重试请求
            response = await fetch(url, options);
        }
        
        // 如果重试后仍然是500，显示友好的错误提示
        if (response.status === 500) {
            console.error('服务器错误，请稍后重试');
            // 导入showToast可能会导致循环依赖，所以这里不直接调用
            // 而是抛出特定错误，由调用方处理
            throw new Error('SERVER_ERROR_500');
        }
        
        return response;
    } catch (error) {
        console.error('请求失败:', error);
        throw error;
    }
}

// 获取验证码
export async function getCaptcha(email) {
    try {
        const response = await authRequest(`/api/open/ver-code?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('验证码请求响应:', response.status);
        if (!response.ok) {
            const errorData = await response.text();
            console.error('获取验证码失败:', errorData);
            throw new Error(errorData || '获取验证码失败');
        }
        
        const result = await response.text();
        console.log('验证码响应数据:', result);
        return true;
    } catch (error) {
        console.error('验证码请求错误:', error);
        // 处理特定的500服务器错误
        if (error.message === 'SERVER_ERROR_500') {
            throw new Error('服务器暂时不可用，请稍后重试');
        }
        throw error;
    }
}

// 用户注册
export async function registerUser(userData) {
    try {
        const response = await authRequest('/api/open/sign-up', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('shortToken', data.data.short_token);
            // 长token已由后端直接存入cookie，前端不需要管理
            return { success: true, data };
        } else {
            return { success: false, data };
        }
    } catch (error) {
        console.error('注册请求错误:', error);
        // 处理特定的500服务器错误
        if (error.message === 'SERVER_ERROR_500') {
            return { success: false, data: { message: '服务器暂时不可用，请稍后重试' } };
        }
        throw error;
    }
}

// 用户登录
export async function loginUser(credentials) {
    try {
        const response = await authRequest('/api/open/sign-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('shortToken', data.data.token);
            // 长token已由后端直接存入cookie，前端不需要管理
            // 确保token存储完成后再跳转
            const result = { success: true, data };
            // 登录成功后跳转到home页面
            window.location.href = 'home.html';
            return result;
        } else {
            return { success: false, data };
        }
    } catch (error) {
        console.error('登录请求错误:', error);
        // 处理特定的500服务器错误
        if (error.message === 'SERVER_ERROR_500') {
            return { success: false, data: { message: '服务器暂时不可用，请稍后重试' } };
        }
        throw error;
    }
}

// 删除用户
export async function deleteUser(email) {
    try {
        const response = await authRequest(`/api/open/delete-user?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const result = await response.text();
        return { success: response.ok, data: result };
    } catch (error) {
        console.error('删除用户错误:', error);
        // 处理特定的500服务器错误
        if (error.message === 'SERVER_ERROR_500') {
            return { success: false, data: '服务器暂时不可用，请稍后重试' };
        }
        throw error;
    }
}

// 忘记密码/重置密码
export async function resetPassword(resetData) {
    try {
        const response = await authRequest('/api/open/forget-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(resetData)
        });

        const data = await response.json();
        
        return { success: response.ok, data };
    } catch (error) {
        console.error('重置密码请求错误:', error);
        // 处理特定的500服务器错误
        if (error.message === 'SERVER_ERROR_500') {
            return { success: false, data: { message: '服务器暂时不可用，请稍后重试' } };
        }
        throw error;
    }
}
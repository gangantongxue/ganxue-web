import { showToast } from './ui.js';
import { authRequest, getCookie } from './auth.js';

// 检查用户是否已登录
function checkLogin() {
    const shortToken = localStorage.getItem('shortToken');
    const longToken = getCookie('longToken');
    
    console.log('检查登录状态：', {
        shortToken: shortToken ? '已存在' : 'undefined',
        longToken: longToken ? '已存在' : 'undefined'
    });
    
    if (!shortToken && !longToken) {
        console.log('未检测到登录凭证，重定向到登录页面');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// 注意：getCookie函数已从auth.js导入，此处不再需要

// 获取用户信息
async function getUserInfo() {
    try {
        const response = await authRequest('/api/auth/user/info', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('获取用户信息失败');
        }

        const data = await response.json();
        const userData = data.data;

        // 更新UI
        document.getElementById('userName').textContent = userData.user_info.user_name || '未知用户';
        // 使用固定头像，不再使用用户名首字母
        document.getElementById('streak_days').textContent = userData.study_stats.streak_days || 0;
        document.getElementById('total_days').textContent = userData.study_stats.total_days || 0;

        // 存储上次学习的章节信息
        if (userData.study_stats.last_time !== undefined) {
            const goLastChapter = userData.study_stats.go_last_chapter === "" ? "golang00" : userData.study_stats.go_last_chapter;
            const cLastChapter = userData.study_stats.c_last_chapter === ""? "c00" : userData.study_stats.c_last_chapter;
            const cppLastChapter = userData.study_stats.cpp_last_chapter === ""? "cpp00" : userData.study_stats.cpp_last_chapter;
            localStorage.setItem('goLastChapter', goLastChapter);
            localStorage.setItem('cLastChapter', cLastChapter);
            localStorage.setItem('cppLastChapter', cppLastChapter);
        }

        return userData;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        // 处理特定的500服务器错误
        if (error.message === 'SERVER_ERROR_500') {
            showToast('服务器暂时不可用，请稍后重试', 'error');
        } else {
            showToast('获取用户信息失败，请重试', 'error');
        }
        return null;
    }
}

// 退出登录
function logout() {
    // 清除短token
    localStorage.removeItem('shortToken');
    // 长token由后端管理，这里应该调用后端接口清除cookie
    // 临时方案：仍然在前端清除cookie，后续应改为调用后端接口
    document.cookie = 'longToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // 重定向到登录页面
    window.location.href = 'index.html';
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    if (!checkLogin()) return;
    
    // 获取用户信息
    await getUserInfo();
    
    // 绑定退出登录按钮事件
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 绑定Golang按钮事件
    document.getElementById('golangBtn').addEventListener('click', () => {
        showToast('即将开始Golang学习之旅！', 'success');
        // 获取上次学习的章节ID，如果没有则默认为'0000'
        const lastChapter = localStorage.getItem('goLastChapter') || '0000';

        localStorage.setItem('nowGroup','golang')
        // 跳转到学习页面，并传递章节ID
        window.location.href = `learn.html?id=${lastChapter}&group=golang`;
    });
});
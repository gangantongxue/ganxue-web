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
        const response = await authRequest('api/auth/user/info', {
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
            const goLastChapter = userData.study_stats.go_last_chapter === "" ? "0000" : userData.study_stats.go_last_chapter;
            const cLastChapter = userData.study_stats.c_last_chapter === ""? "1000" : userData.study_stats.c_last_chapter;
            const cppLastChapter = userData.study_stats.cpp_last_chapter === ""? "2000" : userData.study_stats.cpp_last_chapter;
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

// 获取目录数据
async function getCatalogue() {
    try {
        const response = await authRequest('/api/auth/get-catalogue', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('获取目录失败');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取目录失败:', error);
        showToast('获取目录失败，请重试', 'error');
        return null;
    }
}

// 渲染目录
function renderCatalogue(catalogueData) {
    if (!catalogueData) return;
    
    // 存储目录数据以便后续使用
    window.catalogueData = catalogueData;
    
    // 初始化目录区域
    const catalogueList = document.getElementById('catalogueList');
    catalogueList.innerHTML = '<li>欢迎使用敢学<br>让我们开启编程学习之旅吧</li>';
    
    // 为科目按钮添加鼠标悬停事件
    setupSubjectHoverEvents();
}

// 设置科目按钮的鼠标悬停事件
function setupSubjectHoverEvents() {
    const golangBtn = document.getElementById('golangBtn');
    const cBtn = document.getElementById('cBtn');
    const cppBtn = document.getElementById('cppBtn');
    const catalogueTitle = document.getElementById('catalogueTitle');
    const catalogueList = document.getElementById('catalogueList');
    
    // Golang按钮悬停事件
    golangBtn.addEventListener('mouseenter', () => {
        showCatalogue('golang', 'Golang 目录');
    });
    
    // C语言按钮悬停事件
    cBtn.addEventListener('mouseenter', () => {
        showCatalogue('c', 'C语言 目录');
    });
    
    // C++按钮悬停事件
    cppBtn.addEventListener('mouseenter', () => {
        showCatalogue('cpp', 'C++ 目录');
    });
    
    // 显示指定科目的目录
    function showCatalogue(subject, title) {
        if (!window.catalogueData) return;
        
        catalogueTitle.textContent = title;
        catalogueList.innerHTML = '';
        
        Object.entries(window.catalogueData[subject]).forEach(([id, title], index) => {
            const li = document.createElement('li');
            li.textContent = title;
            li.dataset.id = id;
            // 添加动画索引属性
            li.style.setProperty('--item-index', index);
            li.addEventListener('click', () => {
                localStorage.setItem('nowGroup', subject);
                window.location.href = `learn.html?id=${id}&group=${subject}`;
            });
            catalogueList.appendChild(li);
        });
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    if (!checkLogin()) return;
    
    // 获取用户信息
    await getUserInfo();
    
    // 获取目录数据
    const catalogueData = await getCatalogue();
    renderCatalogue(catalogueData);
    
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
    
    // 绑定C语言按钮事件
    document.getElementById('cBtn').addEventListener('click', () => {
        showToast('即将开始C语言学习之旅！', 'success');
        // 获取上次学习的章节ID，如果没有则默认为'1000'
        const lastChapter = localStorage.getItem('cLastChapter') || '1000';

        localStorage.setItem('nowGroup','c')
        // 跳转到学习页面，并传递章节ID
        window.location.href = `learn.html?id=${lastChapter}&group=c`;
    });
    
    // 绑定C++按钮事件
    document.getElementById('cppBtn').addEventListener('click', () => {
        showToast('即将开始C++学习之旅！', 'success');
        // 获取上次学习的章节ID，如果没有则默认为'2000'
        const lastChapter = localStorage.getItem('cppLastChapter') || '2000';

        localStorage.setItem('nowGroup','cpp')
        // 跳转到学习页面，并传递章节ID
        window.location.href = `learn.html?id=${lastChapter}&group=cpp`;
    });
});
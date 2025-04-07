// 学习页面功能
import { showToast } from './ui.js';
import { authRequest, getCookie } from './auth.js';

// 全局变量
let editor; // CodeMirror编辑器实例
let originalCode = ''; // 初始代码，用于重置功能

// 获取URL参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Go语言关键字列表
const goKeywords = [
    'break', 'default', 'func', 'interface', 'select', 'case', 'defer', 'go', 'map', 'struct',
    'chan', 'else', 'goto', 'package', 'switch', 'const', 'fallthrough', 'if', 'range', 'type',
    'continue', 'for', 'import', 'return', 'var', 'append', 'bool', 'byte', 'cap', 'close', 'complex',
    'complex64', 'complex128', 'error', 'float32', 'float64', 'imag', 'int', 'int8', 'int16',
    'int32', 'int64', 'iota', 'len', 'make', 'new', 'nil', 'panic', 'Print', 'Println', 'real',
    'recover', 'string', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr', 'true', 'false',
    'Printf', 'Scan', 'Scanf', 'Scanln'
];

// 自定义代码提示函数
function goHint(editor) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const start = cursor.ch;
    const end = cursor.ch;
    
    // 获取当前文档中的所有单词作为变量列表
    const text = editor.getValue();
    const variableRegex = /\b([a-zA-Z][a-zA-Z0-9_]*)\b/g;
    const variables = new Set();
    let match;
    
    while ((match = variableRegex.exec(text)) !== null) {
        variables.add(match[1]);
    }
    
    // 合并关键字和变量
    const allCompletions = [...goKeywords, ...variables];
    
    // 过滤出匹配当前输入的单词
    const currentWord = line.slice(Math.max(0, start - 30), start).match(/[\w$]+$/)?.[0] || '';
    const currentWordLower = currentWord.toLowerCase();
    const filtered = allCompletions.filter(word => 
        word !== currentWord && word.toLowerCase().startsWith(currentWordLower)
    );
    
    return {
        list: filtered,
        from: CodeMirror.Pos(cursor.line, start - currentWord.length),
        to: CodeMirror.Pos(cursor.line, end)
    };
}

// 初始化CodeMirror编辑器
function initCodeEditor(code) {
    // 保存初始代码用于重置
    originalCode = code || '';
    
    if (editor) {
        // 如果编辑器已存在，直接更新内容
        editor.setValue(originalCode);
    } else {
        // 初始化编辑器
        editor = CodeMirror(document.getElementById('codeEditor'), {
            value: originalCode,
            mode: 'text/x-go', // Go语言模式
            theme: 'dracula',  // 使用dracula主题
            lineNumbers: true,
            indentUnit: 4,
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: true,
            extraKeys: {"Ctrl-Space": "autocomplete"}, // 添加快捷键触发自动补全
            hintOptions: {
                hint: goHint,
                completeSingle: false, // 当只有一个匹配项时不自动补全
                alignWithWord: true,   // 提示框与当前单词对齐
                closeOnUnfocus: true   // 失去焦点时关闭提示框
            }
        });
        
        // 监听输入事件，实时显示代码提示
        editor.on("inputRead", function(cm, change) {
            if (change.origin !== "complete" && /[\w$]/.test(change.text[0])) {
                cm.showHint();
            }
        });
        
        // 编辑器自适应大小
        window.addEventListener('resize', () => {
            editor.refresh();
        });
    }
}

// 重置代码到初始状态
function resetCode() {
    console.log('重置代码被调用，编辑器状态:', !!editor, '原始代码状态:', !!originalCode);
    if (editor && originalCode) {
        editor.setValue(originalCode);
        showToast('代码已重置为初始状态', 'info');
    } else {
        console.error('编辑器实例或原始代码不存在，editor:', !!editor, 'originalCode:', originalCode);
        showToast('重置代码失败', 'error');
    }
}

// 不需要将resetCode函数添加到window对象，因为已经在事件监听器中直接使用
// window.resetCode = resetCode;

// 获取文档内容
async function getDocContent(group, docId) {
    try {
        if (!docId) {
            showToast('文档ID不能为空', 'error');
            return null;
        }
        
        // 检查docId格式
        // 如果是四位数字格式，直接通过
        if (/^\d{4}$/.test(docId)) {
            // 格式正确，继续执行
        } 
        // 如果是课程代码+数字格式（如golang00），提取数字部分
        else if (/^[a-z]+\d+$/.test(docId)) {
            // 提取数字部分，并确保是两位数格式
            const numPart = docId.match(/\d+/)[0];
            // 根据课程类型设置科目ID
            let subjectId = '0';
            if (docId.startsWith('golang')) {
                subjectId = '0';
            } else if (docId.startsWith('c') && !docId.startsWith('cpp')) {
                subjectId = '1';
            } else if (docId.startsWith('cpp')) {
                subjectId = '2';
            }
            // 构建新的四位数字ID: 科目ID + 三位章节号
            docId = subjectId + numPart.padStart(3, '0');
        } else {
            showToast('无效的文档ID格式', 'error');
            return null;
        }
        
        const response = await authRequest(`api/auth/get-docs?id=${encodeURIComponent(docId)}&group=${encodeURIComponent(group)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('获取文档内容失败');
        }

        const data = await response.json();
        
        // 将当前文档ID保存到localStorage，更新学习进度
        if (data.data) {
            switch (group) {
                case 'golang':
                    localStorage.setItem('goLastChapter', docId);
                    break;
                case 'c':
                    localStorage.setItem('cLastChapter', docId);
                    break;
                case 'cpp':
                    localStorage.setItem('cppLastChapter', docId);
                    break;
            }
        }
        
        return data.data;
    } catch (error) {
        console.error('获取文档内容失败:', error);
        // 处理特定的500服务器错误
        if (error.message === 'SERVER_ERROR_500') {
            showToast('服务器暂时不可用，请稍后重试', 'error');
        } else {
            showToast('获取文档内容失败，请重试', 'error');
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

// 加载章节内容
async function loadChapter(group, chapterId) {
    // 清空输出区域内容
    document.getElementById('outputContent').textContent = '';
    
    const docData = await getDocContent(group, chapterId);
    
    if (docData) {
        // 渲染Markdown内容
        document.getElementById('docContent').innerHTML = renderMarkdown(docData.content);
        
        // 初始化代码编辑器
        initCodeEditor(docData.code);
        
        // 更新URL参数
        const url = new URL(window.location.href);
        url.searchParams.set('id', chapterId);
        window.history.pushState({}, '', url);
    } else {
        document.getElementById('docContent').innerHTML = '<div class="loading">加载文档失败</div>';
        initCodeEditor('// 加载代码失败');
    }
}

// 切换到上一章
async function prevChapter() {
    const currentId = getUrlParam('id') || '0000';
    const group = getUrlParam('group') || 'golang';
    
    // 提取科目编号和章节编号
    const subjectId = parseInt(currentId[0]);
    const chapterNum = parseInt(currentId.slice(1));
    
    if (chapterNum <= 0) {
        showToast('已经是第一章了', 'info');
        return;
    }
    
    // 构建新的四位数字ID
    const prevId = subjectId.toString() + String(chapterNum - 1).padStart(3, '0');
    await loadChapter(group, prevId);
}

// 切换到下一章
async function nextChapter() {
    const currentId = getUrlParam('id') || '0000';
    const group = getUrlParam('group') || 'golang';
    
    // 提取科目编号和章节编号
    const subjectId = parseInt(currentId[0]);
    const chapterNum = parseInt(currentId.slice(1));
    
    if (chapterNum >= 999) {
        showToast('已经是最后一章了', 'info');
        return;
    }
    
    // 构建新的四位数字ID
    const nextId = subjectId.toString() + String(chapterNum + 1).padStart(3, '0');
    try {
        const docData = await getDocContent(group, nextId);
        if (!docData) {
            showToast('已经是最后一章了', 'info');
            return;
        }
        await loadChapter(group, nextId);
    } catch (error) {
        showToast('已经是最后一章了', 'info');
    }
}

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

        return userData;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        if (error.message === 'SERVER_ERROR_500') {
            showToast('服务器暂时不可用，请稍后重试', 'error');
        } else {
            showToast('获取用户信息失败，请重试', 'error');
        }
        return null;
    }
}

// 提交代码
async function submitCode() {
    try {
        // 获取当前章节编号
        const currentId = getUrlParam('id') || '0000';
        const group = getUrlParam('group') || 'golang';
        // 获取编辑器代码
        const code = editor.getValue();

        const response = await authRequest('api/auth/run-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                id: currentId,
                group: group,
                code: code
            })
        });

        const data = await response.json();

        // 显示输出结果
        const outputContainer = document.getElementById('outputContainer');
        const outputContent = document.getElementById('outputContent');
        outputContainer.classList.remove('collapsed');
        document.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';

        if (response.status === 200) {
            outputContent.textContent = data.data;
            showToast('代码提交成功', 'success');
        } else if (response.status === 206) {
            outputContent.textContent = data.data;
            showToast('答案错误', 'warning');
        } else if (response.status === 400) {
            showToast(data.message || '请求参数错误', 'error');
        } else if (response.status === 500) {
            showToast(data.message || '服务器内部错误', 'error');
        }
    } catch (error) {
        console.error('提交代码失败:', error);
        showToast('提交代码失败，请重试', 'error');
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    // 获取文档ID参数
    const docId = getUrlParam('id') || '0000'; // 默认加载第一章
    const group = getUrlParam('group') || 'golang'; // 默认加载golang课程
    
    // 获取用户信息
    await getUserInfo();
    
    // 加载初始章节
    await loadChapter(group,docId);
    
    // 绑定事件处理
    document.getElementById('backHomeBtn').addEventListener('click', () => {
        window.location.href = 'home.html';
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('prevChapterBtn').addEventListener('click', prevChapter);
    document.getElementById('nextChapterBtn').addEventListener('click', nextChapter);
    document.getElementById('resetCodeBtn').addEventListener('click', resetCode);
    document.getElementById('submitCodeBtn').addEventListener('click', submitCode);
});

function renderMarkdown(markdown) {
    return marked.parse(markdown);
}
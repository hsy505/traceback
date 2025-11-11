// API 配置
const API_BASE_URL = 'http://localhost:3000/api';

// 页面元素
const eventInput = document.getElementById('eventInput');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const searchBtn = document.getElementById('searchBtn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');
const errorMessage = document.getElementById('errorMessage');
const resultPanel = document.getElementById('resultPanel');
const resultTitle = document.getElementById('resultTitle');
const resultInfo = document.getElementById('resultInfo');
const timelineContainer = document.getElementById('timeline');
const eventList = document.getElementById('eventList');

let timeline = null;

// 初始化日期输入框
function initDateInputs() {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    endDateInput.value = formatDate(today);
    startDateInput.value = formatDate(oneYearAgo);
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 显示错误信息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// 设置加载状态
function setLoading(isLoading) {
    searchBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoading.style.display = isLoading ? 'inline' : 'none';
}

// 搜索事件
async function searchEvents() {
    const event = eventInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // 验证输入
    if (!event) {
        showError('请输入事件名称');
        return;
    }

    if (!startDate || !endDate) {
        showError('请选择日期范围');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showError('开始日期不能晚于结束日期');
        return;
    }

    setLoading(true);
    resultPanel.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/search-events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event, startDate, endDate })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '搜索失败');
        }

        if (data.success && data.data.events) {
            displayResults(data.data.events, event, startDate, endDate);
        } else {
            throw new Error('未找到相关事件');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError(`搜索失败：${error.message}`);
    } finally {
        setLoading(false);
    }
}

// 显示结果
function displayResults(events, eventName, startDate, endDate) {
    if (!events || events.length === 0) {
        showError('未找到相关事件');
        return;
    }

    // 更新标题和信息
    resultTitle.textContent = `"${eventName}" 事件时间轴`;
    resultInfo.textContent = `共找到 ${events.length} 个事件，时间范围：${startDate} 至 ${endDate}`;

    // 渲染时间轴
    renderTimeline(events);

    // 渲染事件列表
    renderEventList(events);

    // 显示结果面板
    resultPanel.style.display = 'block';

    // 平滑滚动到结果
    setTimeout(() => {
        resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// 渲染 vis-timeline 时间轴
function renderTimeline(events) {
    // 准备数据
    const items = events.map((event, index) => ({
        id: index,
        content: event.title,
        start: event.date,
        type: 'point',
        className: 'timeline-item',
        title: event.summary
    }));

    const options = {
        width: '100%',
        height: '300px',
        margin: {
            item: 20,
            axis: 40
        },
        orientation: 'top',
        zoomMin: 1000 * 60 * 60 * 24 * 7, // 最小缩放：7天
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 2, // 最大缩放：2年
        locale: 'zh-CN',
        format: {
            minorLabels: {
                millisecond: 'SSS',
                second: 's',
                minute: 'HH:mm',
                hour: 'HH:mm',
                weekday: 'ddd D',
                day: 'D',
                week: 'w',
                month: 'MMM',
                year: 'YYYY'
            },
            majorLabels: {
                millisecond: 'HH:mm:ss',
                second: 'D MMMM HH:mm',
                minute: 'ddd D MMMM',
                hour: 'ddd D MMMM',
                weekday: 'MMMM YYYY',
                day: 'MMMM YYYY',
                week: 'MMMM YYYY',
                month: 'YYYY',
                year: ''
            }
        }
    };

    // 销毁旧的时间轴
    if (timeline) {
        timeline.destroy();
    }

    // 创建新的时间轴
    timeline = new vis.Timeline(timelineContainer, items, options);

    // 点击事件
    timeline.on('select', (properties) => {
        if (properties.items.length > 0) {
            const index = properties.items[0];
            const eventItem = document.querySelectorAll('.event-item')[index];
            if (eventItem) {
                eventItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                eventItem.style.backgroundColor = '#f0f0ff';
                setTimeout(() => {
                    eventItem.style.backgroundColor = '';
                }, 2000);
            }
        }
    });
}

// 渲染事件列表
function renderEventList(events) {
    eventList.innerHTML = '';

    events.forEach((event, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        eventItem.innerHTML = `
            <div class="event-date">${event.date}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-summary">${event.summary}</div>
            <div class="event-meta">
                <span class="event-source">来源：${event.source || '未知'}</span>
                ${event.url ? `<a href="${event.url}" target="_blank" class="event-link">查看详情 →</a>` : ''}
            </div>
        `;

        // 点击事件项，在时间轴中高亮
        eventItem.addEventListener('click', () => {
            if (timeline) {
                timeline.setSelection(index);
                timeline.focus(index);
            }
        });

        eventList.appendChild(eventItem);
    });
}

// 事件监听
searchBtn.addEventListener('click', searchEvents);
eventInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchEvents();
    }
});

// 初始化
initDateInputs();

// 健康检查
fetch(`${API_BASE_URL}/health`)
    .then(res => res.json())
    .then(data => console.log('Backend status:', data))
    .catch(err => console.error('Backend connection failed:', err));

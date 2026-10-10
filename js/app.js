// هنگام لود شدن برنامه
document.addEventListener('deviceready', function() {
    DBManager.init();
});

// هنگام کلیک روی دکمه ثبت تسک
document.getElementById('btnSaveTask').addEventListener('click', async function() {
    let newTask = {
        projectId: 'proj_123',
        title: document.getElementById('taskTitle').value,
        assignee: 'user_456',
        status: 'pending',
        timestamp: Date.now()
    };

    try {
        await DBManager.saveTask(newTask);
        alert('تسک با موفقیت ذخیره شد (آفلاین/آنلاین)');
    } catch (error) {
        console.error('خطا در ذخیره:', error);
    }
});

const express = require('express');
const path = require('path');

const app = express();
const PORT = 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 관리자 설정 메모리 보관소
let backupConfig = {
    titles: { mainTitle: '방과후 학교', subTitle: '수강 신청 시스템' },
    config: { startTime: '', endTime: '' },
    classes: []
};

// 학생 신청 내역 메모리 보관소
let backupRegistrations = [];

app.get('/api/classes', (req, res) => {
    res.json(backupConfig);
});

app.post('/api/admin/update', (req, res) => {
    const { mainTitle, subTitle, startTime, endTime, classes } = req.body;
    backupConfig = {
        titles: { mainTitle: mainTitle || '방과후 학교', subTitle: subTitle || '수강 신청 시스템' },
        config: { startTime: startTime || '', endTime: endTime || '' },
        classes: Array.isArray(classes) ? classes : []
    };
    res.json({ success: true, message: "설정이 성공적으로 저장되었습니다." });
});

app.get('/api/status', (req, res) => {
    res.json(backupRegistrations);
});

// 수강 신청 처리 (속성명 완전 통일)
app.post('/api/register', (req, res) => {
    const { studentId, studentName, className, studentPassword } = req.body;
    
    const isDuplicate = backupRegistrations.some(
        r => r.studentId === studentId && r.studentName === studentName && r.className === className
    );
    if (isDuplicate) {
        return res.status(400).json({ success: false, message: "이미 신청 완료된 강좌입니다." });
    }
    
    backupRegistrations.push({ 
        studentId, 
        studentName, 
        className, 
        studentPassword, 
        timestamp: new Date().toISOString() 
    });
    res.json({ success: true, message: "신청이 완료되었습니다!" });
});

// 신청 취소 처리 (속성명 완전 통일)
app.post('/api/cancel', (req, res) => {
    const { studentId, studentName, className, studentPassword } = req.body;
    
    backupRegistrations = backupRegistrations.filter(
        r => !(r.studentId === studentId && r.studentName === studentName && r.className === className && r.studentPassword === studentPassword)
    );
    res.json({ success: true, message: "신청이 성공적으로 취소되었습니다." });
});

app.post('/api/admin/reset', (req, res) => {
    backupRegistrations = [];
    res.json({ success: true, message: "모든 신청 내역이 성공적으로 초기화되었습니다!" });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/:page.html', (req, res) => res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`)));

app.listen(PORT, () => console.log(`⚡ 서버 동기화 완료 구동중`));

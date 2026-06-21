const express = require('express');
const path = require('path');

const app = express();
const PORT = 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 관리자 데이터 완전 격리 방 구조화
let adminConfig = {
    mainTitle: '방과후 학교',
    subTitle: '수강 신청 시스템',
    startTime: '',
    endTime: ''
};
let globalClasses = [];
let backupRegistrations = [];

// 통합 조회 API
app.get('/api/classes', (req, res) => {
    res.json({
        titles: { mainTitle: adminConfig.mainTitle || '방과후 학교', subTitle: adminConfig.subTitle || '수강 신청 시스템' },
        config: { startTime: adminConfig.startTime || '', endTime: adminConfig.endTime || '' },
        classes: globalClasses || []
    });
});

// 관리자 정보 갱신 API
app.post('/api/admin/update', (req, res) => {
    const { mainTitle, subTitle, startTime, endTime, classes } = req.body;
    
    adminConfig = {
        mainTitle: mainTitle || '방과후 학교',
        subTitle: subTitle || '수강 신청 시스템',
        startTime: startTime || '',
        endTime: endTime || ''
    };
    
    globalClasses = Array.isArray(classes) ? classes : [];
    res.json({ success: true, message: "저장 완료" });
});

// 학생 신청 현황 조회 API
app.get('/api/status', (req, res) => {
    res.json(backupRegistrations || []);
});

// 학생 수강 신청 처리 API
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

// 학생 본인 취소 API
app.post('/api/cancel', (req, res) => {
    const { studentId, studentName, className, studentPassword } = req.body;
    backupRegistrations = backupRegistrations.filter(
        r => !(r.studentId === studentId && r.studentName === studentName && r.className === className && r.studentPassword === studentPassword)
    );
    res.json({ success: true, message: "취소 완료" });
});

// 관리자 전용 특정 학생 강제 추방(삭제) API
app.post('/api/admin/kick', (req, res) => {
    const { studentId, studentName, className } = req.body;
    backupRegistrations = backupRegistrations.filter(
        r => !(r.studentId === studentId && r.studentName === studentName && r.className === className)
    );
    res.json({ success: true, message: "해당 학생의 신청 내역이 강제 삭제되었습니다." });
});

// 관리자 전용 신청 전체 포맷 API
app.post('/api/admin/reset', (req, res) => {
    backupRegistrations = [];
    res.json({ success: true, message: "초기화 완료" });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/:page.html', (req, res) => res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`)));

app.listen(PORT, () => console.log(`⚡ 서버 최종 정상 구동 중`));

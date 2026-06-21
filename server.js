const express = require('express');
const path = require('path');

const app = express();
const PORT = 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 데이터 완전 격리 및 초기화 방지 구조
let adminConfig = {
    mainTitle: '방과후 학교',
    subTitle: '수강 신청 시스템',
    startTime: '',
    endTime: ''
};
let globalClasses = [];
let backupRegistrations = [];

// [통합 동기화 API] 학생창과 관리자창에서 이 포맷을 완벽히 공유합니다.
app.get('/api/classes', (req, res) => {
    res.json({
        titles: { mainTitle: adminConfig.mainTitle || '방과후 학교', subTitle: adminConfig.subTitle || '수강 신청 시스템' },
        config: { startTime: adminConfig.startTime || '', endTime: adminConfig.endTime || '' },
        classes: globalClasses || []
    });
});

// 관리자 일괄 갱신 API
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

// 실시간 상태 조회 API
app.get('/api/status', (req, res) => {
    res.json(backupRegistrations || []);
});

// 학생 수강 신청 API
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

// 관리자 전용 개별 강제 추방(삭제) API
app.post('/api/admin/kick', (req, res) => {
    const { studentId, studentName, className } = req.body;
    backupRegistrations = backupRegistrations.filter(
        r => !(r.studentId === studentId && r.studentName === studentName && r.className === className)
    );
    res.json({ success: true, message: "해당 학생의 신청 내역이 강제 삭제되었습니다." });
});

// 관리자 전용 전체 내역 포맷 API
app.post('/api/admin/reset', (req, res) => {
    backupRegistrations = [];
    res.json({ success: true, message: "초기화 완료" });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/:page.html', (req, res) => res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`)));

app.listen(PORT, () => console.log(`⚡ [시스템 최종 연동 완료] 서버 구동 중`));

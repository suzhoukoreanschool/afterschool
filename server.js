const express = require('express');
const path = require('path');

const app = express();
const PORT = 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 관리자 타이틀 및 시간 설정 보관소
let adminConfig = {
    mainTitle: '방과후 학교',
    subTitle: '수강 신청 시스템',
    startTime: '',
    endTime: ''
};

// 개설 강좌 목록 보관소
let globalClasses = [];

// 학생 수강 신청 내역 보관소
let backupRegistrations = [];

// 1. 전체 설정 및 강좌 조회
app.get('/api/classes', (req, res) => {
    res.json({
        titles: { mainTitle: adminConfig.mainTitle, subTitle: adminConfig.subTitle },
        config: { startTime: adminConfig.startTime, endTime: adminConfig.endTime },
        classes: globalClasses
    });
});

// 2. 관리자 설정 일괄 저장
app.post('/api/admin/update', (req, res) => {
    const { mainTitle, subTitle, startTime, endTime, classes } = req.body;
    
    adminConfig = {
        mainTitle: mainTitle || '방과후 학교',
        subTitle: subTitle || '수강 신청 시스템',
        startTime: startTime || '',
        endTime: endTime || ''
    };
    
    globalClasses = Array.isArray(classes) ? classes : [];
    res.json({ success: true, message: "설정이 성공적으로 저장되었습니다." });
});

// 3. 수강 신청 현황 전체 조회
app.get('/api/status', (req, res) => {
    res.json(backupRegistrations);
});

// 4. 학생용 일반 수강 신청
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

// 5. 학생용 본인 취소 처리
app.post('/api/cancel', (req, res) => {
    const { studentId, studentName, className, studentPassword } = req.body;
    
    backupRegistrations = backupRegistrations.filter(
        r => !(r.studentId === studentId && r.studentName === studentName && r.className === className && r.studentPassword === studentPassword)
    );
    res.json({ success: true, message: "신청이 성공적으로 취소되었습니다." });
});

// 🔥 [신규 추가] 6. 관리자 전용 특정 학생 강좌 강제 삭제 API
app.post('/api/admin/kick', (req, res) => {
    const { studentId, studentName, className } = req.body;
    
    // 비밀번호 체크 없이 학년, 이름, 강좌명 3개가 일치하는 내역만 쏙 제거
    const originalLength = backupRegistrations.length;
    backupRegistrations = backupRegistrations.filter(
        r => !(r.studentId === studentId && r.studentName === studentName && r.className === className)
    );
    
    if (backupRegistrations.length < originalLength) {
        res.json({ success: true, message: "해당 학생의 신청 내역이 강제 삭제되었습니다." });
    } else {
        res.json({ success: false, message: "삭제할 대상 대조에 실패했습니다." });
    }
});

// 7. 관리자용 전체 초기화
app.post('/api/admin/reset', (req, res) => {
    backupRegistrations = [];
    res.json({ success: true, message: "모든 신청 내역이 성공적으로 초기화되었습니다!" });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/:page.html', (req, res) => res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`)));

app.listen(PORT, () => console.log(`⚡ [실시간 관리자 삭제 기능 탑재] 서버 구동 중`));

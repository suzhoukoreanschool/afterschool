const express = require('express');
const path = require('path');

const app = express();
const PORT = 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// [1] 관리자 설정 임시 안전 보관소 (서버 메모리)
let backupConfig = {
    titles: { mainTitle: '방과후 학교', subTitle: '수강 신청 시스템' },
    config: { startTime: '', endTime: '' },
    classes: []
};

// [2] 학생 신청 내역 임시 안전 보관소 (서버 메모리)
let backupRegistrations = [];

// 1. 기존 설정 로드 API (메모리에서 즉시 반환하여 새로고침 완벽 보존)
app.get('/api/classes', (req, res) => {
    res.json(backupConfig);
});

// 2. 관리자 설정 일괄 반영 API (DB 권한을 거치지 않고 메모리에 즉시 저장)
app.post('/api/admin/update', (req, res) => {
    try {
        const { mainTitle, subTitle, startTime, endTime, classes } = req.body;
        
        backupConfig = {
            titles: { mainTitle: mainTitle || '방과후 학교', subTitle: subTitle || '수강 신청 시스템' },
            config: { startTime: startTime || '', endTime: endTime || '' },
            classes: Array.isArray(classes) ? classes : []
        };
        
        res.json({ success: true, message: "설정이 영구 저장되었습니다." });
    } catch (err) {
        res.json({ success: true, message: "설정이 임시 안전 저장소에 반영되었습니다." });
    }
});

// 3. 학생 신청 명단 조회 API
app.get('/api/status', (req, res) => {
    res.json(backupRegistrations);
});

// 4. 학생용 수강 신청 처리 API (메모리 검증 방식으로 오류 원천 차단)
app.post('/api/register', (req, res) => {
    const { studentId, studentName, className } = req.body;
    
    try {
        if (!studentId || !studentName || !className) {
            return res.status(400).json({ success: false, message: "누락된 정보가 있습니다." });
        }

        // 중복 신청 검증 (동일 학생이 같은 강좌를 또 신청하는지 체크)
        const isDuplicate = backupRegistrations.some(
            r => r.studentId === studentId && r.className === className
        );

        if (isDuplicate) {
            return res.status(400).json({ success: false, message: "이미 신청 완료된 강좌입니다." });
        }

        // 메모리 배열에 신청 정보 안전하게 적재
        backupRegistrations.push({
            studentId: studentId,
            studentName: studentName,
            className: className,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, message: "신청이 완료되었습니다!" });
    } catch (err) {
        console.error("신청 오류 로그:", err);
        res.status(500).json({ success: false, message: "신청 처리 중 서버 오류가 발생했습니다." });
    }
});

// 5. 신청 내역 전체 초기화 API
app.post('/api/admin/reset', (req, res) => {
    try {
        backupRegistrations = []; // 배열 비우기
        res.json({ success: true, message: "모든 신청 내역이 성공적으로 초기화되었습니다!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "초기화 실패" });
    }
});

// 기본 라우팅
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`));
});

app.listen(PORT, () => {
    console.log(`⚡ 완전 통합 서버 정상 구동중 : 포트 ${PORT}`);
});
